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
import { CACHE_VERSION } from "./index";

type Promotions = Awaited<ReturnType<typeof loadPromotions>>;

// ─── Synchronous core: enrich a set of outbound+return flights into FlightResults ───
function buildResults(
  outbound: NormalizedFlight[],
  returnFlights: NormalizedFlight[],
  params: SearchParams,
  effectivePrices: Map<string, number>,
  promotions: Promotions,
  searchId: string,
): FlightResult[] {
  const {
    cabin = "economy", passengers = 1, userPrograms = [],
    tripType = "oneway", date, returnDate,
  } = params;

  const withPromos     = applyPromotions(outbound, promotions);
  const returnWithPromos = returnFlights.length ? applyPromotions(returnFlights, promotions) : [];

  const cheapestReturn = returnWithPromos.length
    ? returnWithPromos.reduce((best, f) => (f.price < best.price ? f : best), returnWithPromos[0])
    : undefined;

  function bestReturnFor(of: NormalizedFlight): NormalizedFlight | undefined {
    if (!returnWithPromos.length) return undefined;
    const outSet = new Set(of.airlines);
    const same = returnWithPromos.filter(r => r.airlines.some(a => outSet.has(a)));
    return same.length > 0
      ? same.reduce((best, f) => (f.price < best.price ? f : best), same[0])
      : cheapestReturn;
  }

  const results: FlightResult[] = withPromos.map(f => {
    const r = enrich(f, cabin, passengers, userPrograms, tripType, effectivePrices, bestReturnFor(f), date!, returnDate);
    r.searchId = searchId;
    return r;
  });

  const CONFIDENCE_PENALTY: Record<string, number> = { HIGH: 1.00, LOW: 1.05, ESTIMATED: 1.10 };
  const effectiveCost = (r: FlightResult) => {
    const pen = CONFIDENCE_PENALTY[r.priceConfidence ?? "LOW"] ?? 1.05;
    return (r.milesCost > 0 ? Math.min(r.cashCost, r.milesCost) : r.cashCost) * pen;
  };
  results.sort((a, b) => effectiveCost(a) - effectiveCost(b) || (a.totalPrice ?? 0) - (b.totalPrice ?? 0));
  return results;
}

/**
 * Streaming variant of searchEngine.
 *
 * Strategy:
 * - All 4 provider calls start simultaneously.
 * - When Duffel completes (typically ~2-3s), we call onPartial with Duffel-only results.
 * - When TP completes (~4-8s), we build the full merged results and return them.
 *
 * This lets the UI show real flight cards after ~2-3s instead of waiting the full 5-8s.
 */
export async function searchEngineStream(
  params: SearchParams,
  onPartial: (results: FlightResult[]) => void,
  requestId?: string,
): Promise<FlightResult[]> {
  try {
    const {
      from, to, date, returnDate,
      tripType    = "oneway",
      stops       = "any",
      cabin       = "economy",
      passengers  = 1,
      userPrograms = [],
    } = params;

    const directOnly  = stops === "direct";
    const isRoundtrip = tripType === "roundtrip" && !!returnDate;
    const cacheKey    = `keza:${CACHE_VERSION}:${from}:${to}:${date}:${tripType}:${returnDate ?? ""}:${stops}:${cabin}:${passengers}`;

    // Load cache + prices + promotions all in parallel (before any provider call)
    const [cached, effectivePrices, promotions] = await Promise.all([
      redis.get<FlightResult[]>(cacheKey).catch(() => null),
      getEffectivePrices().catch(() => new Map<string, number>()),
      loadPromotions(),
    ]);
    if (cached) {
      const freshId = crypto.randomUUID();
      return cached.map(r => ({ ...r, searchId: freshId }));
    }

    const searchId = crypto.randomUUID();

    // ─── Fire all 4 provider calls simultaneously ───────────────────────────
    const duffelOutboundP = fetchFromDuffel(from, to, date!, cabin, passengers)
      .catch((): NormalizedFlight[] => []);
    const tpOutboundP     = fetchFromTravelpayouts(from, to, date!, directOnly);
    const duffelReturnP   = isRoundtrip
      ? fetchFromDuffel(to, from, returnDate!, cabin, passengers).catch((): NormalizedFlight[] => [])
      : Promise.resolve([] as NormalizedFlight[]);
    const tpReturnP       = isRoundtrip
      ? fetchFromTravelpayouts(to, from, returnDate!, directOnly)
      : Promise.resolve([] as NormalizedFlight[]);

    // ─── Phase 1: Duffel resolves (~2-3s) ───────────────────────────────────
    const [duffelOutboundRaw, duffelReturnRaw] = await Promise.all([duffelOutboundP, duffelReturnP]);

    const duffelOutbound = duffelOutboundRaw.map(f => ({
      ...f, source: "DUFFEL" as const, priceConfidence: "HIGH" as const, cabinResolved: true as const,
    }));
    const duffelReturn = duffelReturnRaw.map(f => ({
      ...f, source: "DUFFEL" as const, priceConfidence: "HIGH" as const, cabinResolved: true as const,
    }));

    const partialOutbound = filterByStops(duffelOutbound, stops);
    const partialReturn   = filterByStops(duffelReturn, stops);
    const partialResults  = buildResults(partialOutbound, partialReturn, params, effectivePrices, promotions, searchId);
    // Only emit partial if we actually have something to show
    if (partialResults.length > 0) {
      onPartial(partialResults);
    }

    // ─── Phase 2: TP resolves (~4-8s total from start) ──────────────────────
    const [tpOutboundRaw, tpReturnRaw] = await Promise.all([tpOutboundP, tpReturnP]);

    const tpOutbound = tpOutboundRaw.map(f => ({ ...f, source: "TP" as const, priceConfidence: "LOW"  as const }));
    const tpReturn   = tpReturnRaw.map(f =>  ({ ...f, source: "TP" as const, priceConfidence: "LOW"  as const }));

    // Merge: Duffel wins on duplicate routes (higher confidence)
    const rawOutbound = mergeFlights(tpOutbound, duffelOutbound);

    // ROUTE_AIRLINE_SUPPLEMENTS: synthetic entries for carriers not in any provider
    const syntheticFlights: NormalizedFlight[] = [];
    {
      const suppKey     = `${from.toUpperCase()}-${to.toUpperCase()}`;
      const suppAirlines = ROUTE_AIRLINE_SUPPLEMENTS[suppKey] ?? [];
      const covered      = new Set(rawOutbound.flatMap(f => f.airlines));
      const cheapestRaw  = rawOutbound.length > 0
        ? rawOutbound.reduce((best, f) => f.price < best.price ? f : best, rawOutbound[0])
        : undefined;
      if (cheapestRaw && cheapestRaw.price > 0) {
        for (const airline of suppAirlines) {
          if (!covered.has(airline)) {
            syntheticFlights.push({
              from, to, price: cheapestRaw.price, airlines: [airline], stops: 0,
              isSupplemental: true, source: "SYNTHETIC", priceConfidence: "ESTIMATED",
              cabinResolved: cheapestRaw.cabinResolved ?? false,
            });
          }
        }
      }
    }

    // Direct flight recovery: if all flights have stops, try an explicit TP direct search
    if (!directOnly && rawOutbound.every(f => (f.stops ?? 0) > 0)) {
      const directFlights = await fetchFromTravelpayouts(from, to, date!, true);
      if (directFlights.length > 0) {
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

    // Return leg (roundtrip)
    let returnFlights: NormalizedFlight[] = [];
    if (isRoundtrip) {
      const rawReturn = mergeFlights(tpReturn, duffelReturn);
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

    const results = buildResults(outbound, returnFlights, params, effectivePrices, promotions, searchId);

    // Synthetic + Home Carrier Guarantee (appended after sorted real results)
    const syntheticResults: FlightResult[] = syntheticFlights.map(f => {
      const synRet: NormalizedFlight | undefined = tripType === "roundtrip"
        ? { ...f, from: f.to ?? "", to: f.from ?? "" }
        : undefined;
      const r = enrich(f, cabin, passengers, userPrograms, tripType, effectivePrices, synRet, date!, returnDate);
      r.searchId = searchId;
      return r;
    });
    const allResults = [...results, ...syntheticResults];

    {
      const routeKey   = `${from.toUpperCase()}-${to.toUpperCase()}`;
      const guarantees = HOME_CARRIER_PROGRAMS[routeKey] ?? [];
      if (guarantees.length > 0 && allResults.length > 0) {
        const presentPrograms = new Set(allResults.flatMap(r => r.milesOptions?.map(m => m.program) ?? []));
        const priceAnchor = outbound.length > 0
          ? outbound.reduce((best, f) => f.price < best.price ? f : best, outbound[0])
          : undefined;
        if (priceAnchor) {
          for (const { airline, programs } of guarantees) {
            if (!programs.some(p => presentPrograms.has(p))) {
              const gf: NormalizedFlight = {
                from, to, price: priceAnchor.price, airlines: [airline], stops: 0,
                isSupplemental: true, source: "SYNTHETIC" as const,
                priceConfidence: "ESTIMATED" as const, cabinResolved: priceAnchor.cabinResolved ?? false,
              };
              const gr = enrich(
                gf, cabin, passengers, userPrograms, tripType, effectivePrices,
                tripType === "roundtrip" ? { ...gf, from: to, to: from } : undefined,
                date!, returnDate,
              );
              gr.searchId = searchId;
              allResults.push(gr);
            }
          }
        }
      }
    }

    // Auto-calibrate (fire-and-forget)
    Promise.allSettled(results.map(r => {
      if (!r.bestOption || r.cashCost <= 0 || r.priceConfidence !== "HIGH") return Promise.resolve();
      return recordObservation(r.bestOption.program, r.cashCost, r.bestOption.taxes, r.bestOption.milesRequired, `${from}-${to}`, cabin);
    })).catch(() => null);

    // Cache final results
    await redis.set(cacheKey, allResults, { ex: 3600 }).catch(err => {
      logError("[engine/stream] cache write failed", err, { requestId });
    });

    return allResults;
  } catch (err) {
    logError("[engine/stream] unhandled error", err, { requestId });
    throw err;
  }
}
