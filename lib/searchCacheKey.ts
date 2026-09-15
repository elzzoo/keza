import type { Cabin, Stops, TripType } from "@/lib/engine/types";

export interface SearchCacheKeyParams {
  from: string;
  to: string;
  date: string;
  tripType: TripType | string;
  returnDate?: string;
  stops: Stops | string;
  cabin: Cabin | string;
  passengers: number;
}

export function buildSearchCacheKey(version: string, params: SearchCacheKeyParams): string {
  return [
    "keza",
    version,
    params.from,
    params.to,
    params.date,
    params.tripType,
    params.returnDate ?? "",
    params.stops,
    params.cabin,
    params.passengers,
  ].join(":");
}
