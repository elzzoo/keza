/**
 * Value Scoring System — CPP percentile calculation and value badges
 * Determines whether a flight is a "Great Deal", "Fair Deal", or "Expensive"
 * based on Cost Per Point (CPP) percentiles.
 *
 * CPP = cashCost / milesRequired
 * Percentiles are calculated daily and stored in Redis cache
 */

import { redis } from "@/lib/redis";

export type ValueBadge = "GREAT_DEAL" | "FAIR_DEAL" | "EXPENSIVE" | "UNKNOWN";

export interface ValueScore {
  badge: ValueBadge;
  percentile: number;       // 0-100, where 0=best (cheapest), 100=worst (most expensive)
  cpp: number;              // actual cost per point (cents)
  p25: number;              // 25th percentile CPP
  p50: number;              // 50th percentile CPP (median)
  p75: number;              // 75th percentile CPP
}

const CPP_STATS_KEY = (from: string, to: string, program: string, date: string) =>
  `keza:cpp:stats:${from.toUpperCase()}:${to.toUpperCase()}:${program}:${date}`;

const CPP_PERCENTILES_KEY = (from: string, to: string, date: string) =>
  `keza:cpp:percentiles:${from.toUpperCase()}:${to.toUpperCase()}:${date}`;

// ── Calculate CPP ──────────────────────────────────────────────────────────────
/**
 * Calculate Cost Per Point for a flight-program combination
 * CPP = cashCost / milesRequired (in cents)
 * Lower CPP = better value
 */
export function calculateCpp(cashCost: number, milesRequired: number): number {
  if (milesRequired <= 0) return Infinity;
  return Math.round((cashCost * 100) / milesRequired); // Convert to cents per point
}

// ── Record CPP observation ─────────────────────────────────────────────────────
/**
 * Record a CPP observation for a flight-program pair
 * Called during search result enrichment
 * Stored as a sorted set for percentile calculation
 */
export async function recordCppObservation(
  from: string,
  to: string,
  program: string,
  cpp: number
): Promise<void> {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const key = CPP_STATS_KEY(from, to, program, today);

    // Add to sorted set with cpp as both member and score
    // This allows us to calculate percentiles later
    await redis.zadd(key, { score: cpp, member: String(cpp) });

    // Keep 30 days of history
    await redis.expire(key, 30 * 24 * 60 * 60);
  } catch {
    // Never crash because of value scoring
  }
}

// ── Calculate percentiles ──────────────────────────────────────────────────────
/**
 * Calculate CPP percentiles for a route-program combination
 * Called by daily cron job
 * Percentiles help determine if a price is a "Great Deal" or "Expensive"
 */
export async function calculateCppPercentiles(
  from: string,
  to: string,
  program: string
): Promise<{ p25: number; p50: number; p75: number } | null> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const key = CPP_STATS_KEY(from, to, program, today);

    // Get all CPP values for this route-program pair
    const members = await redis.zrange(key, 0, -1);
    if (!members || members.length === 0) return null;

    const values = members.map((m) => parseInt(m, 10)).filter((v) => !isNaN(v));
    if (values.length === 0) return null;

    values.sort((a, b) => a - b);

    const percentile = (p: number) => {
      const index = Math.ceil((values.length * p) / 100) - 1;
      return Math.max(0, Math.min(index, values.length - 1));
    };

    return {
      p25: values[percentile(25)],
      p50: values[percentile(50)],
      p75: values[percentile(75)],
    };
  } catch {
    return null;
  }
}

// ── Store percentiles ──────────────────────────────────────────────────────────
/**
 * Store calculated percentiles in Redis for fast lookups during search
 */
export async function storePercentiles(
  from: string,
  to: string,
  program: string,
  percentiles: { p25: number; p50: number; p75: number }
): Promise<void> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const key = CPP_PERCENTILES_KEY(from, to, today);

    const programKey = `${program}:p25:p50:p75`;
    await redis.hset(key, { [programKey]: JSON.stringify(percentiles) });
    await redis.expire(key, 7 * 24 * 60 * 60); // Keep 7 days
  } catch {
    // Never crash because of percentile storage
  }
}

// ── Retrieve percentiles ───────────────────────────────────────────────────────
/**
 * Get stored percentiles for a route-program combination
 * Used during search result enrichment
 */
export async function getPercentiles(
  from: string,
  to: string,
  program: string
): Promise<{ p25: number; p50: number; p75: number } | null> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const key = CPP_PERCENTILES_KEY(from, to, today);

    const programKey = `${program}:p25:p50:p75`;
    const raw = await redis.hget(key, programKey);

    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ── Calculate value badge ──────────────────────────────────────────────────────
/**
 * Determine value badge based on CPP percentile
 * Great Deal: < 25th percentile (cheapest quarter)
 * Fair Deal: 25-75th percentile (middle)
 * Expensive: > 75th percentile (most expensive quarter)
 */
export function getValueBadge(cpp: number, percentiles: {p25: number; p50: number; p75: number} | null): ValueBadge {
  if (!percentiles) return "UNKNOWN";

  if (cpp <= percentiles.p25) return "GREAT_DEAL";
  if (cpp >= percentiles.p75) return "EXPENSIVE";
  return "FAIR_DEAL";
}

// ── Calculate full value score ─────────────────────────────────────────────────
/**
 * Comprehensive value score for a flight option
 * Includes badge, percentile position, and percentile reference points
 */
export function calculateValueScore(
  cpp: number,
  percentiles: { p25: number; p50: number; p75: number } | null
): ValueScore {
  if (!percentiles || isNaN(cpp) || !isFinite(cpp)) {
    return {
      badge: "UNKNOWN",
      percentile: 0,
      cpp: isNaN(cpp) ? 0 : cpp,
      p25: 0,
      p50: 0,
      p75: 0,
    };
  }

  // Calculate percentile position (0-100)
  // Percentile = how far cpp sits between p25 and p75
  // cpp at p25 = 0%, at p75 = 100%
  const range = percentiles.p75 - percentiles.p25;
  let position = 50;

  if (range > 0) {
    position = ((cpp - percentiles.p25) / range) * 100;
    position = Math.max(0, Math.min(100, position));
  }

  return {
    badge: getValueBadge(cpp, percentiles),
    percentile: Math.round(position),
    cpp,
    p25: percentiles.p25,
    p50: percentiles.p50,
    p75: percentiles.p75,
  };
}
