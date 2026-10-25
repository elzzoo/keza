import type { FlightResult } from "@/lib/engine";
import type { SearchDraft } from "@/lib/homeLocaleHandoff";

export interface FlightRouteLocaleSnapshot {
  draft: SearchDraft;
  results: FlightResult[];
  hasSearched: boolean;
}

let pending: {
  target: "fr" | "en";
  route: string;
  at: number;
  snapshot: FlightRouteLocaleSnapshot;
} | null = null;

export function saveFlightRouteLocaleHandoff(
  target: "fr" | "en",
  route: string,
  snapshot: FlightRouteLocaleSnapshot,
): void {
  pending = { target, route: route.toUpperCase(), at: Date.now(), snapshot };
}

export function readFlightRouteLocaleHandoff(
  target: "fr" | "en",
  route: string,
): FlightRouteLocaleSnapshot | null {
  if (typeof window === "undefined") return null;
  const entry = pending;
  if (!entry || entry.target !== target || entry.route !== route.toUpperCase() || Date.now() - entry.at > 30_000) {
    return null;
  }
  return entry.snapshot;
}

export function clearFlightRouteLocaleHandoff(): void {
  pending = null;
}
