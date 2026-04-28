import "server-only";
import { redis } from "./redis";
import { MILES_PRICE_MAP } from "@/data/milesPrices";

// ─── Auto-calibration system ────────────────────────────────────────────────
// After each search, we record observed "implied mile values" based on:
//   impliedValue = (cashPrice - taxes) / milesRequired
//
// Over time, this builds a statistical picture of what each program's miles
// are actually worth in the market. The cron job reads these observations
// and adjusts the effective price per mile in Redis.
//
// This makes the system SELF-CORRECTING without manual intervention.

interface Observation {
  program: string;
  impliedValueCents: number;  // what 1 mile was "worth" in this redemption
  route: string;              // e.g. "DSS-CDG"
  cabin: string;
  timestamp: number;
}

const OBSERVATIONS_KEY = "miles:calibration:observations";
const MAX_OBSERVATIONS = 500;  // keep last 500 per program
const CALIBRATION_KEY_PREFIX = "miles:calibrated:";

/**
 * Record an observation after a search.
 * Called from the engine after computing cost comparisons.
 */
export async function recordObservation(
  program: string,
  cashPrice: number,
  taxes: number,
  milesRequired: number,
  route: string,
  cabin: string
): Promise<void> {
  if (milesRequired <= 0 || cashPrice <= taxes) return;

  const impliedValueCents = ((cashPrice - taxes) / milesRequired) * 100;

  // Sanity check: discard outliers (values below 0.3¢ or above 5¢ are likely errors)
  if (impliedValueCents < 0.3 || impliedValueCents > 5.0) return;

  const obs: Observation = {
    program,
    impliedValueCents,
    route,
    cabin,
    timestamp: Date.now(),
  };

  try {
    // Use a Redis list per program, capped at MAX_OBSERVATIONS
    const listKey = `${OBSERVATIONS_KEY}:${program}`;
    await redis.lpush(listKey, JSON.stringify(obs));
    await redis.ltrim(listKey, 0, MAX_OBSERVATIONS - 1);
  } catch {
    // Non-critical — don't break the search
  }
}

/**
 * Recalibrate mile values based on collected observations.
 * Called by the daily cron job.
 *
 * Algorithm:
 * - Take last 100 observations per program
 * - Compute weighted median (recent observations count more)
 * - Blend 70% observed + 30% static baseline (prevents wild swings)
 * - Only update if we have >= 10 observations
 * - Clamp final value between 50% and 200% of static baseline
 */
export async function recalibrate(): Promise<Record<string, { before: number; after: number; observations: number }>> {
  const results: Record<string, { before: number; after: number; observations: number }> = {};
  const programs = Array.from(MILES_PRICE_MAP.keys());

  for (const program of programs) {
    const listKey = `${OBSERVATIONS_KEY}:${program}`;
    const rawObs = await redis.lrange(listKey, 0, 99).catch(() => []);

    if (!rawObs || rawObs.length < 10) continue;

    const observations: Observation[] = rawObs
      .map((raw) => {
        try { return JSON.parse(raw as string) as Observation; }
        catch { return null; }
      })
      .filter((o): o is Observation => o !== null);

    if (observations.length < 10) continue;

    // Weighted median: recent observations get more weight
    const now = Date.now();
    const weighted = observations.map((o) => ({
      value: o.impliedValueCents,
      weight: Math.max(0.1, 1 - (now - o.timestamp) / (30 * 24 * 60 * 60 * 1000)), // decay over 30 days
    }));

    // Sort by value
    weighted.sort((a, b) => a.value - b.value);

    // Find weighted median
    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    let cumWeight = 0;
    let median = weighted[0].value;
    for (const w of weighted) {
      cumWeight += w.weight;
      if (cumWeight >= totalWeight / 2) {
        median = w.value;
        break;
      }
    }

    // Blend: 70% observed, 30% static baseline
    const staticValue = MILES_PRICE_MAP.get(program) ?? 1.4;
    const blended = median * 0.7 + staticValue * 0.3;

    // Clamp between 50% and 200% of static
    const clamped = Math.max(staticValue * 0.5, Math.min(staticValue * 2.0, blended));
    const rounded = Math.round(clamped * 100) / 100;

    // Store in Redis
    const currentValue = await redis.get<number>(`miles:price:${program}`).catch(() => null) ?? staticValue;
    await redis.set(`miles:price:${program}`, rounded, { ex: 7 * 24 * 60 * 60 });
    await redis.set(`${CALIBRATION_KEY_PREFIX}${program}`, {
      value: rounded,
      observations: observations.length,
      median,
      blended,
      updatedAt: new Date().toISOString(),
    }, { ex: 30 * 24 * 60 * 60 });

    results[program] = {
      before: currentValue,
      after: rounded,
      observations: observations.length,
    };
  }

  return results;
}

/**
 * Get the current forex rate USD → XOF (CFA franc).
 * Fetches from exchangerate-api.com (free tier: 1500 req/month).
 * Caches in Redis for 12 hours.
 */
export async function getForexRate(): Promise<number> {
  const CACHE_KEY = "forex:usd:xof";
  const CACHE_TTL = 12 * 60 * 60; // 12h
  const FALLBACK_RATE = 600; // approximate if all APIs fail (updated 2026-04-28)

  try {
    // Check cache first
    const cached = await redis.get<number>(CACHE_KEY).catch(() => null);
    if (typeof cached === "number" && cached > 400 && cached < 800) {
      return cached;
    }

    // Try free API (no key required)
    const res = await fetch(
      "https://open.er-api.com/v6/latest/USD",
      { next: { revalidate: 43200 } } // 12h ISR cache
    );

    if (res.ok) {
      const data = await res.json() as { rates?: { XOF?: number } };
      const rate = data?.rates?.XOF;
      if (typeof rate === "number" && rate > 400 && rate < 800) {
        await redis.set(CACHE_KEY, rate, { ex: CACHE_TTL }).catch(() => null);
        return rate;
      }
    }

    // Fallback: try backup API
    const res2 = await fetch(
      "https://api.exchangerate.host/latest?base=USD&symbols=XOF",
      { next: { revalidate: 43200 } }
    );

    if (res2.ok) {
      const data2 = await res2.json() as { rates?: { XOF?: number } };
      const rate2 = data2?.rates?.XOF;
      if (typeof rate2 === "number" && rate2 > 400 && rate2 < 800) {
        await redis.set(CACHE_KEY, rate2, { ex: CACHE_TTL }).catch(() => null);
        return rate2;
      }
    }
  } catch {
    // Fall through to fallback
  }

  return FALLBACK_RATE;
}
