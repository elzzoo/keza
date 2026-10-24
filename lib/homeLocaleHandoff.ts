import type { FlightResult } from "@/lib/engine";

export interface SearchDraft {
  from: string;
  to: string;
  tripType: "oneway" | "roundtrip";
  depDate: string;
  retDate: string;
  cabin: "economy" | "premium" | "business" | "first";
  passengers: number;
  programs: string;
}

export interface HomeLocaleSnapshot {
  draft: SearchDraft;
  results: FlightResult[];
  partial: boolean;
  hasSearched: boolean;
  lastSearch: { from: string; to: string; date: string; cabin: string; tripType: "oneway" | "roundtrip" } | null;
}

let pending: { target: "fr" | "en"; at: number; snapshot: HomeLocaleSnapshot } | null = null;

export function saveHomeLocaleHandoff(target: "fr" | "en", snapshot: HomeLocaleSnapshot): void {
  pending = { target, at: Date.now(), snapshot };
}

export function readHomeLocaleHandoff(target: "fr" | "en"): HomeLocaleSnapshot | null {
  if (typeof window === "undefined") return null;
  const entry = pending;
  if (!entry || entry.target !== target || Date.now() - entry.at > 30_000) return null;
  return entry.snapshot;
}

export function clearHomeLocaleHandoff(): void {
  pending = null;
}
