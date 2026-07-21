// lib/priceHistory.ts
// Pure functions — no API calls, no Redis. Testable in isolation.
// Used by client components (/comparer, /destinations).
// Redis-backed functions live in lib/priceHistoryRedis.ts (server-only).

import { DESTINATIONS, type Destination } from "@/data/destinations";

// ── Shared types (also used by priceHistoryRedis.ts) ─────────────────────────
export interface PricePoint {
  date: string;  // YYYY-MM-DD
  price: number;
}
export type PriceTrend = "up" | "down" | "stable" | "unknown";
// ─────────────────────────────────────────────────────────────────────────────
import { REGIONAL_SEASONALITY } from "@/data/seasonality";
import { computeDealRatio, classifyDeal, type DealRecommendation } from "@/lib/dealsEngine";

export interface MonthlyPrice {
  month: number;           // 0-11 (0 = January)
  monthLabel: string;      // "Jan", "Fév", ...
  price: number;           // Math.round(cashEstimateUsd × multiplier)
  cpm: number;             // cents per mile
  recommendation: DealRecommendation;
}

export interface DestinationPriceHistory {
  iata: string;
  monthlyPrices: MonthlyPrice[]; // always 12 elements
  bestMonths: number[];           // month indices where price ≤ percentile 33
  worstMonths: number[];          // month indices where price ≥ percentile 67
}

const MONTH_LABELS = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
  "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc",
];

function percentileValue(sortedAsc: number[], p: number): number {
  return sortedAsc[Math.floor(sortedAsc.length * p)];
}

// Deterministic 0-1 hash of a string (destination IATA code), stable across
// renders/builds/tests. Used to give each destination its own seasonality
// "signature" instead of every destination in a region sharing an identical
// curve shape (e.g. all African destinations showed byte-identical monthly
// price charts before this — see audit bug: "duplicate price charts").
function hashUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

export function getMonthlyPrices(dest: Destination): DestinationPriceHistory {
  const multipliers = REGIONAL_SEASONALITY[dest.region];

  // Per-destination jitter (±6% max) derived from the IATA code + month index.
  // Keeps the regional seasonality *pattern* (real peaks/troughs by hemisphere
  // and season) while ensuring no two destinations render an identical curve.
  const monthlyPrices: MonthlyPrice[] = multipliers.map((mult, i) => {
    const jitter = 1 + (hashUnit(`${dest.iata}-${i}`) - 0.5) * 0.12;
    const price = Math.round(dest.cashEstimateUsd * mult * jitter);
    const cpm = computeDealRatio(price, dest.milesEstimate);
    return {
      month: i,
      monthLabel: MONTH_LABELS[i],
      price,
      cpm,
      recommendation: classifyDeal(cpm),
    };
  });

  const prices = monthlyPrices.map((m) => m.price);
  const sorted = [...prices].sort((a, b) => a - b);
  const p33 = percentileValue(sorted, 0.33);
  const p67 = percentileValue(sorted, 0.67);

  const bestMonths = monthlyPrices
    .filter((m) => m.price <= p33)
    .map((m) => m.month);

  const worstMonths = monthlyPrices
    .filter((m) => m.price >= p67)
    .map((m) => m.month);

  return { iata: dest.iata, monthlyPrices, bestMonths, worstMonths };
}

export function getAllDestinationPriceHistories(): DestinationPriceHistory[] {
  return DESTINATIONS.map(getMonthlyPrices);
}
