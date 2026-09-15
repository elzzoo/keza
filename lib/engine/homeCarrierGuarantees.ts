import type { NormalizedFlight } from "../promotions/engine";
import { enrich } from "./enrich";
import { CABIN_FALLBACK_PRICE } from "./constants";
import { HOME_CARRIER_PROGRAMS } from "./supplements";
import type { Cabin, FlightResult, SearchParams, TripType } from "./types";

interface ApplyHomeCarrierGuaranteesOptions {
  results: FlightResult[];
  outbound: NormalizedFlight[];
  params: Pick<SearchParams, "from" | "to" | "date" | "returnDate" | "tripType" | "cabin" | "passengers" | "userPrograms">;
  effectivePrices: Map<string, number>;
  searchId: string;
}

export function applyHomeCarrierGuarantees({
  results,
  outbound,
  params,
  effectivePrices,
  searchId,
}: ApplyHomeCarrierGuaranteesOptions): FlightResult[] {
  const {
    from,
    to,
    date,
    returnDate,
    cabin = "economy",
    passengers = 1,
    tripType = "oneway",
    userPrograms = [],
  } = params;
  const routeKey = `${from.toUpperCase()}-${to.toUpperCase()}`;
  const guarantees = HOME_CARRIER_PROGRAMS[routeKey] ?? [];
  if (guarantees.length === 0) return results;

  let nextResults: FlightResult[] | null = null;
  const presentPrograms = new Set(results.flatMap((r) => r.milesOptions?.map((m) => m.program) ?? []));
  const priceAnchorFlight = outbound.length > 0
    ? outbound.reduce((best, f) => (f.price < best.price ? f : best), outbound[0])
    : undefined;
  const anchorPrice = priceAnchorFlight?.price ?? CABIN_FALLBACK_PRICE[cabin] ?? 700;
  const anchorCabinResolved = priceAnchorFlight?.cabinResolved ?? false;

  for (const { airline, programs } of guarantees) {
    if (programs.some((program) => presentPrograms.has(program))) continue;

    const guaranteedFlight: NormalizedFlight = {
      from,
      to,
      price: anchorPrice,
      airlines: [airline],
      stops: 0,
      isSupplemental: true,
      source: "SYNTHETIC" as const,
      priceConfidence: "ESTIMATED" as const,
      cabinResolved: anchorCabinResolved,
    };
    const guaranteedResult = enrich(
      guaranteedFlight,
      cabin as Cabin,
      passengers,
      userPrograms,
      tripType as TripType,
      effectivePrices,
      tripType === "roundtrip" ? { ...guaranteedFlight, from: to, to: from } : undefined,
      date,
      returnDate,
    );
    guaranteedResult.searchId = searchId;
    nextResults ??= [...results];
    nextResults.push(guaranteedResult);
  }

  return nextResults ?? results;
}
