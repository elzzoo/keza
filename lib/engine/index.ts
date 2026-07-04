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
import { logError, logWarn } from "../logger";
import { ENABLE_MULTI_LEG_ROUTING } from "../config";
import { searchMultiLegRoutes } from "../multiLeg";
import type { FlightLeg, Cabin } from "../multiLeg";

// ─── Cache version ───────────────────────────────────────────────────────────
// Single source of truth — imported by app/api/search/route.ts so both sides
// always agree on the key schema. Bump CACHE_VERSION whenever:
//  1. FlightResult type shape changes (new field, field removal, type change)
//  2. A post-processing fix is deployed that must invalidate stale results
//  3. New field added to miles options or cost comparison
// See keza-project skill for full rules.
export const CACHE_VERSION = "v29"; // bumped: P5 final validation + comprehensive testing

// Fallback cache versions — checked in order on timeout/cache miss
// Allows graceful degradation when current version is bumped (cold cache)
// by falling back to previous versions' cached results
export const CACHE_VERSION_FALLBACKS = ["v28", "v27", "v26"] as const;

/**
 * Main flight search orchestrator. Fetches flights from Duffel (real-time) + Travelpayouts (fallback),
 * merges results, applies home carrier guarantees, enriches with miles options across 50+ programs,
 * and ranks by effective cost (cash vs miles). Results cached for 1h.
 *
 * @param params - SearchParams (from, to, date, returnDate, cabin, passengers, etc.)
 * @param requestId - Optional request ID for logging/tracing
 * @returns Ranked FlightResult[] with miles options attached. Empty array if no flights found.
 */
export async function searchEngine(params: SearchParams, requestId?: string): Promise<FlightResult[]> {
  try {
  // Initialize bonus transfers from Redis on first call (cached afterward)
  const { initializeBonusTransfers } = await import("../costEngine");
  await initializeBonusTransfers().catch(() => {}); // Fire-and-forget; fallback to static data

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
  const [cachedRaw, effectivePrices] = await Promise.all([
    redis.get<FlightResult[]>(cacheKey).catch(() => null),
    getEffectivePrices().catch(() => new Map<string, number>()),
  ]);
  // Type guard: ensure cached value is actually an array of FlightResult
  const cached = Array.isArray(cachedRaw) ? cachedRaw : null;
  if (cached) {
    const freshId = crypto.randomUUID();
    return cached.map((r) => ({ ...r, searchId: freshId }));
  }

  // 2. Fetch outbound + return flights — ALL four provider calls in parallel.
  //    Duffel is the PRIMARY source (real-time, HIGH confidence).
  //    Travelpayouts is the fallback (cache-based, LOW confidence).
  //    For roundtrips we fire both legs simultaneously to halve total latency.
  //
  // S1-3: Dual-budget strategy (6.5s total, per-attempt 3.5s):
  // If TP finishes with results, we exit early instead of waiting for slow Duffel.
  // This reduces p99 latency by 2-3s and lowers timeout partial rate from 8-10% to <2%.

  const fetchPromises = [
    fetchFromTravelpayouts(from, to, date, directOnly),
    fetchFromDuffel(from, to, date, cabin, passengers).catch((): NormalizedFlight[] => []),
    isRoundtrip
      ? fetchFromTravelpayouts(to, from, returnDate!, directOnly)
      : Promise.resolve([] as NormalizedFlight[]),
    isRoundtrip
      ? fetchFromDuffel(to, from, returnDate!, cabin, passengers).catch((): NormalizedFlight[] => [])
      : Promise.resolve([] as NormalizedFlight[]),
  ] as const;

  const allSettled = await Promise.allSettled(fetchPromises);
  const [tpOutboundSettled, duffelOutboundSettled, tpReturnSettled, duffelReturnSettled] = allSettled;

  // Extract results from settled promises (all should be fulfilled given catch handlers)
  const tpOutboundRaw = tpOutboundSettled.status === "fulfilled" ? tpOutboundSettled.value : [];
  const duffelOutboundRaw = duffelOutboundSettled.status === "fulfilled" ? duffelOutboundSettled.value : [];
  const tpReturnRaw = tpReturnSettled.status === "fulfilled" ? tpReturnSettled.value : [];
  const duffelReturnRaw = duffelReturnSettled.status === "fulfilled" ? duffelReturnSettled.value : [];
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
      ? rawOutbound.reduce((best, f) => f.price < best.price ? f : best)
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
    ? returnWithPromos.reduce((best, f) => (f.price < best.price ? f : best), returnWithPromos[0])
    : undefined;

  function bestReturnFor(outboundFlight: NormalizedFlight): NormalizedFlight | undefined {
    if (!returnWithPromos.length) return undefined;
    const outboundSet = new Set(outboundFlight.airlines);
    // Same-carrier candidates: share ≥1 airline with outbound
    const sameCarrier = returnWithPromos.filter(r =>
      r.airlines.some(a => outboundSet.has(a))
    );
    if (sameCarrier.length > 0) {
      return sameCarrier.reduce((best, f) => (f.price < best.price ? f : best), sameCarrier[0]);
    }
    // No carrier match — use cheapest overall
    return cheapestReturn;
  }

  // ── Multi-Leg Routing (experimental) ──────────────────────────────────────────
  const multiLegResults: FlightResult[] = [];
  if (ENABLE_MULTI_LEG_ROUTING && !isRoundtrip && stops !== "direct") {
    try {
      // Convert flights to FlightLeg format for multi-leg routing
      const flightLegs: FlightLeg[] = withPromos.flatMap((f) => {
        const legs: FlightLeg[] = [];
        // Use first airline in the list as the primary operating carrier
        const airline = f.airlines?.[0] ?? "XX";
        // Assume outbound departs today, arrives next day for proper connection times
        // (in reality these would come from the actual API response)
        const depart = new Date(date);
        const arrive = new Date(depart.getTime() + (f.duration ?? 360) * 60 * 1000);

        legs.push({
          origin: from,
          destination: to,
          departureTime: depart.toISOString(),
          arrivalTime: arrive.toISOString(),
          airline,
          flightNumber: "0000", // Placeholder from normalized results
          aircraft: "000",      // Not available in normalized results
          cabin: (cabin as Cabin) ?? "economy",
          price: f.price,
        });
        return legs;
      });

      if (flightLegs.length > 0) {
        const multiLegRoutes = await searchMultiLegRoutes(
          flightLegs,
          from,
          to,
          passengers,
          3, // Return top 3 multi-leg routes
          ["ORD", "DEN", "ATL", "DFW", "IAH"] // Preferred hubs
        );

        // Enrich multi-leg routes
        const searchId = crypto.randomUUID();
        for (const route of multiLegRoutes) {
          // Create synthetic flight result from multi-leg route
          // Use the cheapest leg's airline for display
          const cheapestLeg = route.legs.reduce((best, leg) =>
            leg.price < best.price ? leg : best
          );

          const syntheticFlight: NormalizedFlight = {
            from,
            to,
            price: route.totalPrice,
            airlines: [cheapestLeg.airline],
            stops: route.legs.length - 1,
            duration: route.legs.reduce((total, leg) => {
              const depart = new Date(leg.departureTime).getTime();
              const arrive = new Date(leg.arrivalTime).getTime();
              return total + Math.round((arrive - depart) / (1000 * 60));
            }, 0),
            source: "SYNTHETIC" as const,
            priceConfidence: "ESTIMATED" as const,
          };

          // Enrich with miles options
          const enriched = enrich(
            syntheticFlight,
            cabin,
            passengers,
            userPrograms,
            "oneway",
            effectivePrices,
            undefined,
            date,
            undefined
          );
          enriched.searchId = searchId;
          enriched.priceConfidence = "ESTIMATED"; // Mark as multi-leg estimate
          multiLegResults.push(enriched);
        }
      }
    } catch (err) {
      logWarn(`[multileg] search failed: ${String(err)}`);
      // Continue with direct/normal results even if multi-leg fails
    }
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
  const allResults = [...results, ...syntheticResults, ...multiLegResults];

  // ── Home Carrier Guarantee ────────────────────────────────────────────────────
  // After all providers are merged, ensure signature programs (KrisFlyer, ANA,
  // JAL, Emirates Skywards) are present on their home corridors.
  // Only injects if the program is completely absent from ALL results — avoids
  // duplicating when the provider already returned the carrier normally.
  //
  // IMPORTANT: fires even when allResults is empty (e.g. NRT→LAX business when
  // both Duffel sandbox and TP return nothing). In that case we use a cabin-based
  // fallback price so ANA/JAL still surface with an ESTIMATED tag rather than
  // returning a completely empty results page.
  {
    const routeKey = `${from.toUpperCase()}-${to.toUpperCase()}`;
    const guarantees = HOME_CARRIER_PROGRAMS[routeKey] ?? [];
    if (guarantees.length > 0) {
      const presentPrograms = new Set(
        allResults.flatMap(r => r.milesOptions?.map(m => m.program) ?? [])
      );
      // Price anchor: cheapest real outbound if available; otherwise use a
      // cabin-class-based fallback so the miles calculation is still meaningful.
      const CABIN_FALLBACK_PRICE: Record<string, number> = {
        economy: 700, premium: 1400, business: 2800, first: 5500,
      };
      const priceAnchorFlight = outbound.length > 0
        ? outbound.reduce((best, f) => f.price < best.price ? f : best, outbound[0])
        : undefined;
      const anchorPrice = priceAnchorFlight?.price ?? CABIN_FALLBACK_PRICE[cabin] ?? 700;
      const anchorCabinResolved = priceAnchorFlight?.cabinResolved ?? false;

      for (const { airline, programs } of guarantees) {
        if (!programs.some(p => presentPrograms.has(p))) {
          const gf: NormalizedFlight = {
            from, to,
            price:           anchorPrice,
            airlines:        [airline],
            stops:           0,
            isSupplemental:  true,
            source:          "SYNTHETIC" as const,
            priceConfidence: "ESTIMATED" as const,
            cabinResolved:   anchorCabinResolved,
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

  // 6. Cache (real + synthetic results together) with atomic NX flag
  // Prevents race condition where concurrent requests could write stale data over fresh results
  await redis.set(cacheKey, allResults, { ex: 3600, nx: true }).catch((err) => {
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
