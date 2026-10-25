import type { FlightResult } from "@/lib/engine";
import type { SearchDraft } from "@/lib/homeLocaleHandoff";

export interface DestinationLocaleSnapshot {
  draft: SearchDraft;
  results: FlightResult[];
  hasSearched: boolean;
}

let pending: {
  target: "fr" | "en";
  iata: string;
  at: number;
  snapshot: DestinationLocaleSnapshot;
} | null = null;

export function saveDestinationLocaleHandoff(
  target: "fr" | "en",
  iata: string,
  snapshot: DestinationLocaleSnapshot,
): void {
  pending = { target, iata: iata.toUpperCase(), at: Date.now(), snapshot };
}

export function readDestinationLocaleHandoff(
  target: "fr" | "en",
  iata: string,
): DestinationLocaleSnapshot | null {
  if (typeof window === "undefined") return null;
  const entry = pending;
  if (!entry || entry.target !== target || entry.iata !== iata.toUpperCase() || Date.now() - entry.at > 30_000) {
    return null;
  }
  return entry.snapshot;
}

export function clearDestinationLocaleHandoff(): void {
  pending = null;
}
