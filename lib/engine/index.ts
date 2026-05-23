import "server-only";
import { redis } from "../redis";
import { loadPromotions, applyPromotions } from "../promotions/engine";
import type { NormalizedFlight } from "../promotions/engine";
import { getEffectivePrices } from "../costEngine";
import { recordObservation } from "../autoCalibrate";
import { fetchFromDuffel } from "../duffelProvider";
import type { SearchParams, FlightResult } from "./types";
import { fetchFromTravelpayouts } from "./travelpayouts";
import { ROUTE_AIRLINE_SUPPLEMENTS, HOME_CARRIER_PROGRAMS } from "./supplements";
import { enrich, mergeFlights, filterByStops } from "./enrich";
import { logError } from "../logger";

// ─── Cache version ───────────────────────────────────────────────────────────
// Single source of truth — imported by app/api/search/route.ts so both sides
// always agree on the key schema. Bump whenever FlightResult shape changes.
export const CACHE_VERSION = "v22"; // bumped: Home Carrier Guarantee + JAL name fix

export async function searchEngine(params: SearchParams, requestId?: string): Promise<FlightResult[]> {
  const _t0 = Date.now();
  try {
  const {
    from, to, date,
    returnDate,
    tripType    = "oneway",
    stops       = "any",
    cabin       = "economy",
    passengers  = 1,
    userPrograms = [],
  } = params;

  const directOnly = stops === "direct";
  const isRoundtrip = tripType === "roundtrip" && !!returnDate;
  // v2 prefix: bumped when we moved to aviasales/v3 endpoint (airline data + booking links).
  // Bump this again whenever the FlightResult shape changes to avoid serving stale cached results.
  const cacheKey   = `keza:${CACHE_VERSION}:${from}:${to}:${date}:${tripType}:${returnDate ?? ""}:${stops}:${cabin}:${passengers}`;

  // 1. Cache check + effectivePrices in parallel
  // Each caller gets a fresh searchId — the cached results share flight/price
  // data but click-tracking must be per-session, not shared across users.
  const [cached, effectivePrices] = await Promise.all([
    redis.get<FlightResult[]>(cacheKey).catch(() => null),
    getEffectivePrices().catch(() => new Map<string, number>()),
  ]);
  if (cached) {
    const freshId = crypto.randomUUID();
    return cached.map((r) => ({ ...r, searchId: freshId }));
  }

  // 2. Fetch outbound + return flights — ALL four provider calls in parallel.
  //    Duffel is the PRIMARY source (real-time, HIGH confidence).
  //    Travelpayouts is the fallback (cache-based, LOW confidence).
  //    For roundtrips we fire both legs simultaneously to halve total latency.
  const [tpOutboundRaw, duffelOutboundRaw, tpReturnRaw, duffelReturnRaw] = await Promise.all([
    fetchFromTravelpayouts(from, to, date, directOnly),
    fetchFromDuffel(from, to, date, cabin, passengers).catch((): NormalizedFlight[] => []),
    isRoundtrip
      ? fetchFromTravelpayouts(to, from, returnDate!, directOnly)
      : Promise.resolve([] as NormalizedFlight[]),
    isRoundtrip
      ? fetchFromDuffel(to, from, returnDate!, cabin, passengers).catch((): NormalizedFlight[] => [])
      : Promise.resolve([] as NormalizedFlight[]),
  ]);
  // Tag by source so mergeFlights can prefer Duffel over TP for same key
  const tpOutbound     = tpOutboundRaw.map(f => ({ ...f, source: "TP"     as const, priceConfidence: "LOW"  as const }));
  const duffelOutbound = duffelOutboundRaw.map(f => ({ ...f, source: "DUFFEL" as const, priceConfidence: "HIGH" as const, cabinResolved: true as const }));
  const rawOutbound = mergeFlights(tpOutbound, duffelOutbound);

  // ── Collect synthetic entries for supplement airlines missing from providers ─
  // Airlines in ROUTE_AIRLINE_SUPPLEMENTS are known to fly this route but not
  // indexed by any provider (e.g. Air Senegal on DSS→CDG). We create placeholder
  // entries to surface "Vol direct disponible" in the UI with an indicative price.
  // IMPORTANT: synthetics are kept in a SEPARATE array — they never enter the
  // miles engine (no buildCostOptions) and are appended AFTER the sorted real
  // results so they never displace a real flight in the ranking.
  const syntheticFlights: NormalizedFlight[] = [];
  {
    const suppKey = `${from.toUpperCase()}-${to.toUpperCase()}`;
    const suppAirlines = ROUTE_AIRLINE_SUPPLEMENTS[suppKey] ?? [];
    const coveredAirlines = new Set(rawOutbound.flatMap(f => f.airlines));
    const cheapestRaw = rawOutbound.length > 0
      ? rawOutbound.reduce((best, f) => f.price < best.price ? f : best, rawOutbound[0])
      : undefined;
    const cheapestPrice = cheapestRaw?.price ?? 0;
    const cheapestCabinResolved = cheapestRaw?.cabinResolved ?? false;
    if (cheapestPrice > 0) {
      for (const airline of suppAirlines) {
        if (!coveredAirlines.has(airline)) {
          syntheticFlights.push({
            from, to, price: cheapestPrice, airlines: [airline], stops: 0,
            isSupplemental: true, source: "SYNTHETIC", priceConfidence: "ESTIMATED",
            cabinResolved: cheapestCabinResolved,
          });
        }
      }
    }
  }

  if (!directOnly && rawOutbound.every(f => (f.stops ?? 0) > 0)) {
    // No direct flights in the merged results — try explicit direct TP search
    const directFlights = await fetchFromTravelpayouts(from, to, date, true);
    if (directFlights.length > 0) {
      // Prepend direct flights (they're more valuable to the user)
      const existingKeys = new Set(rawOutbound.map(f => `${f.airlines.join(",")}:${f.stops}`));
      for (const df of directFlights) {
        const key = `${df.airlines.join(",")}:${df.stops}`;
        if (!existingKeys.has(key)) {
          rawOutbound.unshift({ ...df, source: "TP" as const, priceConfidence: "LOW" as const });
          existingKeys.add(key);
        }
      }
    }
  }

  const outbound = filterByStops(rawOutbound, stops);

  // 3. Process return flights using the pre-fetched data (fetched in parallel with outbound in step 2)
  let returnFlights: NormalizedFlight[] = [];
  if (isRoundtrip) {
    const tpReturn     = tpReturnRaw.map(f => ({ ...f, source: "TP"     as const, priceConfidence: "LOW"  as const }));
    const duffelReturn = duffelReturnRaw.map(f => ({ ...f, source: "DUFFEL" as const, priceConfidence: "HIGH" as const, cabinResolved: true as const }));
    const rawReturn = mergeFlights(tpReturn, duffelReturn);

    // Same direct-flight recovery for return leg (TP only — Duffel already included all)
    if (!directOnly && rawReturn.every(f => (f.stops ?? 0) > 0)) {
      const directReturn = await fetchFromTravelpayouts(to, from, returnDate!, true);
      if (directReturn.length > 0) {
        const existingKeys = new Set(rawReturn.map(f => `${f.airlines.join(",")}:${f.stops}`));
        for (const df of directReturn) {
          const key = `${df.airlines.join(",")}:${df.stops}`;
          if (!existingKeys.has(key)) {
            rawReturn.unshift({ ...df, source: "TP" as const, priceConfidence: "LOW" as const });
            existingKeys.add(key);
          }
        }
      }
    }

    returnFlights = filterByStops(rawReturn, stops);
  }

  // 4. Apply promotions (load in parallel with cache write — fire first to keep critical path tight)
  const promotions     = await loadPromotions();
  const withPromos     = applyPromotions(outbound, promotions);
  const returnWithPromos = returnFlights.length
    ? applyPromotions(returnFlights, promotions)
    : [];

  // 5. Pair outbound + best-matching return, enrich
  // Strategy: prefer a return leg that shares at least one operating airline
  // with the outbound (avoids fictitious cross-carrier totals). Fall back to
  // the cheapest available return when no same-carrier match exists.
  const cheapestReturn = returnWithPromos.length
    ? returnWithPromos.reduce((best, f) => (f.price < best.price ? f : best))
    : undefined;

  function bestReturnFor(outboundFlight: NormalizedFlight): NormalizedFlight | undefined {
    if (!returnWithPromos.length) return undefined;
    const outboundSet = new Set(outboundFlight.airlines);
    // Same-carrier candidates: share ≥1 airline with outbound
    const sameCarrier = returnWithPromos.filter(r =>
      r.airlines.some(a => outboundSet.has(a))
    );
    if (sameCarrier.length > 0) {
      return sameCarrier.reduce((best, f) => (f.price < best.price ? f : best));
    }
    // No carrier match — use cheapest overall
    return cheapestReturn;
  }

  const searchId = crypto.randomUUID();
  const results: FlightResult[] = withPromos.map((f) => {
    const r = enrich(f, cabin, passengers, userPrograms, tripType, effectivePrices, bestReturnFor(f), date, returnDate);
    r.searchId = searchId;
    return r;
  });

  // Sort: best effective cost first (what the user actually pays, cash OR miles).
  // Apply a confidence penalty so TP-cached prices (LOW) are treated as slightly
  // more expensive than Duffel real-time prices (HIGH) for ranking purposes only.
  // This does NOT change the displayed price — it only affects tie-breaking.
  //   HIGH (Duffel) → ×1.00  (no penalty)
  //   LOW  (TP)     → ×1.05  (5% penalty — reflects pricing uncertainty)
  const CONFIDENCE_PENALTY: Record<string, number> = { HIGH: 1.00, LOW: 1.05, ESTIMATED: 1.10 };
  const effectiveCost = (r: FlightResult) => {
    const penalty = CONFIDENCE_PENALTY[r.priceConfidence ?? "LOW"] ?? 1.05;
    const base = r.milesCost > 0 ? Math.min(r.cashCost, r.milesCost) : r.cashCost;
    return base * penalty;
  };
  results.sort((a, b) => {
    const diff = effectiveCost(a) - effectiveCost(b);
    return diff !== 0 ? diff : (a.totalPrice ?? 0) - (b.totalPrice ?? 0);
  });

  // Enrich synthetic flights WITH the miles engine so programs (KrisFlyer, ANA,
  // JAL, etc.) surface even when the provider has no live prices for the carrier.
  // Pass a mirrored return leg for roundtrips so the price doubling stays correct.
  // Synthetics are still appended AFTER sorted real results — isSupplemental flag
  // lets the UI keep them visually distinct (indicative price badge).
  const syntheticResults: FlightResult[] = syntheticFlights.map((f) => {
    const syntheticReturn: NormalizedFlight | undefined =
      tripType === "roundtrip"
        ? { ...f, from: f.to ?? "", to: f.from ?? "" }
        : undefined;
    const r = enrich(f, cabin, passengers, userPrograms, tripType, effectivePrices, syntheticReturn, date, returnDate);
    r.searchId = searchId;
    return r;
  });
  const allResults = [...results, ...syntheticResults];

  // ── Home Carrier Guarantee ────────────────────────────────────────────────────
  // After all providers are merged, ensure signature programs (KrisFlyer, ANA,
  // JAL, Emirates Skywards) are present on their home corridors.
  // Only injects if the program is completely absent from ALL results — avoids
  // duplicating when the provider already returned the carrier normally.
  // Uses the cheapest real outbound as the price anchor for the synthetic.
  {
    const routeKey = `${from.toUpperCase()}-${to.toUpperCase()}`;
    const guarantees = HOME_CARRIER_PROGRAMS[routeKey] ?? [];
    if (guarantees.length > 0 && allResults.length > 0) {
      const presentPrograms = new Set(
        allResults.flatMap(r => r.milesOptions?.map(m => m.program) ?? [])
      );
      const priceAnchor = outbound.length > 0
        ? outbound.reduce((best, f) => f.price < best.price ? f : best, outbound[0])
        : undefined;
      if (priceAnchor) {
        for (const { airline, programs } of guarantees) {
          if (!programs.some(p => presentPrograms.has(p))) {
            const gf: NormalizedFlight = {
              from, to,
              price:           priceAnchor.price,
              airlines:        [airline],
              stops:           0,
              isSupplemental:  true,
              source:          "SYNTHETIC" as const,
              priceConfidence: "ESTIMATED" as const,
              cabinResolved:   priceAnchor.cabinResolved ?? false,
            };
            const gr = enrich(
              gf, cabin, passengers, userPrograms, tripType, effectivePrices,
              tripType === "roundtrip" ? { ...gf, from: to, to: from } : undefined,
              date, returnDate,
            );
            gr.searchId = searchId;
            allResults.push(gr);
          }
        }
      }
    }
  }

  // 5b. Auto-calibrate: record observations for self-learning mile values
  // Only record HIGH-confidence prices (Duffel real-time) — TP cached prices
  // and multiplier-estimated fares would corrupt the auto-calibration signal.
  // Fire-and-forget — never block the response
  Promise.allSettled(
    results.map((r) => {
      if (!r.bestOption || r.cashCost <= 0) return Promise.resolve();
      if (r.priceConfidence !== "HIGH") return Promise.resolve();
      return recordObservation(
        r.bestOption.program,
        r.cashCost,
        r.bestOption.taxes,
        r.bestOption.milesRequired,
        `${from}-${to}`,
        cabin
      );
    })
  ).catch(() => null);

  // 6. Cache (real + synthetic results together)
  await redis.set(cacheKey, allResults, { ex: 3600 }).catch((err) => {
    logError("[engine] cache write failed", err, { requestId });
  });

  return allResults;
  } catch (err) {
    logError("[engine] unhandled error", err, { requestId });
    throw err;
  }
}

// Re-export everything consumers may need from sub-modules
export * from "./types";
export * from "./enrich";
export { fetchCalendarPrices } from "./travelpayouts";
export { ROUTE_AIRLINE_SUPPLEMENTS } from "./supplements";
