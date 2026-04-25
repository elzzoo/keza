// lib/priceHistory.ts
// Two responsibilities:
// 1. Pure functions for seasonal price estimation (no API, no Redis) — used by /comparer, /destinations
// 2. Redis-backed daily price recording + retrieval — built by cron, consumed by /flights/[route]

import { DESTINATIONS, type Destination } from "@/data/destinations";
import { REGIONAL_SEASONALITY } from "@/data/seasonality";
import { computeDealRatio, classifyDeal, type DealRecommendation } from "@/lib/dealsEngine";
import { redis } from "@/lib/redis";

// ── Section 1: Pure seasonal price history ───────────────────────────────────

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

// ── Section 2: Redis daily price history per route ───────────────────────────

const HISTORY_KEY = (from: string, to: string) =>
  `keza:price:history:${from.toUpperCase()}:${to.toUpperCase()}`;
const HISTORY_TTL = 90 * 24 * 60 * 60; // 90 days

/**
 * Record the cheapest price for a route today.
 * Called from the cron/alerts route to build history automatically.
 */
export async function recordDailyPrice(
  from: string,
  to: string,
  price: number
): Promise<void> {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const key = HISTORY_KEY(from, to);
    await redis.hset(key, { [today]: Math.round(price) });
    await redis.expire(key, HISTORY_TTL);
  } catch {
    // Never crash because of history recording
  }
}

export interface PricePoint {
  date: string;  // YYYY-MM-DD
  price: number;
}

/**
 * Returns up to `days` days of price history for a route, sorted by date asc.
 */
export async function getPriceHistory(
  from: string,
  to: string,
  days = 30
): Promise<PricePoint[]> {
  try {
    const key = HISTORY_KEY(from, to);
    const raw = await redis.hgetall(key);
    if (!raw) return [];

    const points: PricePoint[] = Object.entries(raw)
      .map(([date, price]) => ({ date, price: parseInt(String(price), 10) }))
      .filter((p) => !isNaN(p.price))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-days);

    return points;
  } catch {
    return [];
  }
}

export type PriceTrend = "up" | "down" | "stable" | "unknown";

/**
 * Compare last price vs 7-day-ago price to determine trend.
 */
export function computePriceTrend(history: PricePoint[]): PriceTrend {
  if (history.length < 2) return "unknown";
  const latest = history[history.length - 1].price;
  const weekAgo = history[Math.max(0, history.length - 8)].price;
  const delta = ((latest - weekAgo) / weekAgo) * 100;
  if (delta > 5) return "up";
  if (delta < -5) return "down";
  return "stable";
}
