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
