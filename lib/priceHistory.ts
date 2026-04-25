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

export function getMonthlyPrices(dest: Destination): DestinationPriceHistory {
  const multipliers = REGIONAL_SEASONALITY[dest.region];

  const monthlyPrices: MonthlyPrice[] = multipliers.map((mult, i) => {
    const price = Math.round(dest.cashEstimateUsd * mult);
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
