import type { NormalizedFlight } from "../promotions/engine";
import { mergeFlights } from "./enrich";

export function tagTravelpayoutsFlights(flights: NormalizedFlight[]): NormalizedFlight[] {
  return flights.map((flight) => ({
    ...flight,
    source: "TP" as const,
    priceConfidence: "LOW" as const,
  }));
}

export function tagDuffelFlights(flights: NormalizedFlight[]): NormalizedFlight[] {
  return flights.map((flight) => ({
    ...flight,
    source: "DUFFEL" as const,
    priceConfidence: "HIGH" as const,
    cabinResolved: true as const,
  }));
}

export function tagAmadeusFlights(flights: NormalizedFlight[]): NormalizedFlight[] {
  return flights.map((flight) => ({
    ...flight,
    source: "AMADEUS" as const,
    priceConfidence: "HIGH" as const,
    cabinResolved: true as const,
  }));
}

export function mergeHighConfidenceFlights(
  duffelFlights: NormalizedFlight[],
  amadeusFlights: NormalizedFlight[],
): NormalizedFlight[] {
  return mergeFlights(tagDuffelFlights(duffelFlights), tagAmadeusFlights(amadeusFlights));
}

export function mergeProviderFlights(
  travelpayoutsFlights: NormalizedFlight[],
  duffelFlights: NormalizedFlight[],
  amadeusFlights: NormalizedFlight[],
): NormalizedFlight[] {
  return mergeFlights(
    tagTravelpayoutsFlights(travelpayoutsFlights),
    mergeHighConfidenceFlights(duffelFlights, amadeusFlights),
  );
}

interface PrependDirectTravelpayoutsFallbackOptions {
  enabled: boolean;
  fetchDirectFlights: () => Promise<NormalizedFlight[]>;
}

export async function prependDirectTravelpayoutsFallback(
  flights: NormalizedFlight[],
  { enabled, fetchDirectFlights }: PrependDirectTravelpayoutsFallbackOptions,
): Promise<NormalizedFlight[]> {
  if (!enabled || !flights.every((flight) => (flight.stops ?? 0) > 0)) return flights;

  const directFlights = await fetchDirectFlights();
  if (directFlights.length === 0) return flights;

  const nextFlights = [...flights];
  const existingKeys = new Set(nextFlights.map((flight) => `${flight.airlines.join(",")}:${flight.stops}`));

  for (const directFlight of directFlights) {
    const key = `${directFlight.airlines.join(",")}:${directFlight.stops}`;
    if (existingKeys.has(key)) continue;

    nextFlights.unshift({
      ...directFlight,
      source: "TP" as const,
      priceConfidence: "LOW" as const,
    });
    existingKeys.add(key);
  }

  return nextFlights;
}
