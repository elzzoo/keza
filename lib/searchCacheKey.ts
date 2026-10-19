import { hash } from "fast-sha256";
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
  userPrograms: readonly string[];
}

export function buildSearchCacheKey(version: string, params: SearchCacheKeyParams): string {
  const profileHash = Array.from(
    hash(new TextEncoder().encode(JSON.stringify(params.userPrograms))),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
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
    profileHash,
  ].join(":");
}
