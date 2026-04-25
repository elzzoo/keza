/**
 * Redis-backed daily price history per route — SERVER ONLY.
 * Key: keza:price:history:{FROM}:{TO} → Redis hash  date → price
 * Keeps 90 days of data.
 *
 * Do NOT import this from client components.
 * Use lib/priceHistory.ts for pure/seasonal functions usable everywhere.
 */

import { redis } from "@/lib/redis";
import type { PricePoint, PriceTrend } from "@/lib/priceHistory";

const HISTORY_KEY = (from: string, to: string) =>
  `keza:price:history:${from.toUpperCase()}:${to.toUpperCase()}`;
const HISTORY_TTL = 90 * 24 * 60 * 60; // 90 days

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Record the cheapest price for a route today.
 * Called from cron/alerts to build history automatically.
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

// ── Read ──────────────────────────────────────────────────────────────────────

// Re-export shared types so consumers can import from either module
export type { PricePoint, PriceTrend } from "@/lib/priceHistory";

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

// ── Trend ─────────────────────────────────────────────────────────────────────

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
