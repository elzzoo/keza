import "server-only";
import { redis } from "./redis";

/**
 * Baseline CPP record for a route+program.
 * Stored in Redis at keza:cpp:baseline:{routeKey}
 */
export interface CppBaseline {
  /** Cents per point/mile baseline at time of tracking */
  baseline: number;
  /** ISO 8601 timestamp when baseline was recorded */
  createdAt: string;
}

/**
 * History of CPP observations for a route+program.
 * Key format: keza:cpp:history:{from}:{to}:{program}
 */
export interface CppHistory {
  /** Route + program key: "FROM:TO:Program Name" */
  key: string;
  /** All CPP observations, newest first */
  observations: Array<{ cpp: number; timestamp: string }>;
  /** Baseline CPP (most recent) */
  baseline: number;
  /** When baseline was set */
  createdAt: string;
}

// ─── Redis keys ─────────────────────────────────────────────────────────────

const BASELINE_KEY = (routeKey: string) => `keza:cpp:baseline:${routeKey}`;
const HISTORY_KEY = (routeKey: string) => `keza:cpp:history:${routeKey}`;
const FAVORITE_ROUTES_KEY = (email: string) => `keza:favorite:routes:${email.toLowerCase()}`;

// ─── Baseline tracking (per route+program) ──────────────────────────────────

/**
 * Track baseline CPP for a route+program.
 * Format: "FROM:TO:Program Name" (e.g., "SIN:LAX:Singapore KrisFlyer")
 *
 * Only overwrites if existing baseline is >24h old.
 * TTL: 90 days (typical alert lifetime).
 */
export async function trackBaselineCpp(
  routeKey: string,
  cpp: number,
  overrideTime?: Date
): Promise<void> {
  const now = overrideTime ?? new Date();
  const key = BASELINE_KEY(routeKey);

  const existing = await redis.get<CppBaseline>(key);
  if (existing) {
    const createdTime = new Date(existing.createdAt).getTime();
    const hoursSince = (now.getTime() - createdTime) / (1000 * 60 * 60);
    if (hoursSince < 24) {
      // Keep existing baseline
      return;
    }
  }

  // Record new baseline
  const baseline: CppBaseline = {
    baseline: cpp,
    createdAt: now.toISOString(),
  };

  await redis.set(key, baseline, { ex: 90 * 86400 });
}

/**
 * Get baseline CPP for a route+program.
 */
export async function getBaselineHistory(routeKey: string): Promise<CppHistory | null> {
  const baselineKey = BASELINE_KEY(routeKey);
  const baseline = await redis.get<CppBaseline>(baselineKey);

  if (!baseline) return null;

  return {
    key: routeKey,
    observations: [],
    baseline: baseline.baseline,
    createdAt: baseline.createdAt,
  };
}

// ─── Favorite routes (user-specific) ─────────────────────────────────────────

/**
 * Add a route to a user's favorites.
 * Used to batch check on daily cron.
 */
export async function addFavoriteRoute(
  email: string,
  from: string,
  to: string
): Promise<void> {
  const key = FAVORITE_ROUTES_KEY(email);
  const routeKey = `${from.toUpperCase()}:${to.toUpperCase()}`;
  await redis.sadd(key, routeKey);
  await redis.expire(key, 90 * 86400);
}

/**
 * Remove a route from user's favorites.
 */
export async function removeFavoriteRoute(
  email: string,
  from: string,
  to: string
): Promise<void> {
  const key = FAVORITE_ROUTES_KEY(email);
  const routeKey = `${from.toUpperCase()}:${to.toUpperCase()}`;
  await redis.srem(key, routeKey);
}

/**
 * Get all favorite routes for a user.
 */
export async function getFavoriteRoutes(email: string): Promise<string[]> {
  const key = FAVORITE_ROUTES_KEY(email);
  const routes = await redis.smembers(key);
  return routes as string[];
}

// ─── CPP shift detection (>10% improvement) ──────────────────────────────────

/**
 * Check if CPP has improved >10% from baseline.
 * Improvement = (newCpp - baseline) / baseline >= 0.10
 *
 * @param baseline Starting CPP (lower is worse)
 * @param current Current CPP (higher is better)
 * @returns true if improvement >= 10%
 */
export function detectCppImprovement(baseline: number, current: number): boolean {
  if (baseline <= 0 || current <= 0) return false;
  const improvement = (current - baseline) / baseline;
  return improvement >= 0.10;
}

/**
 * Record a CPP observation and check if threshold met.
 * @param routeKey "FROM:TO:Program Name"
 * @param currentCpp CPP now (from latest search)
 * @returns { triggered: true, improvement: 0.15 } if >10% improvement
 */
export async function recordCppObservation(
  routeKey: string,
  currentCpp: number
): Promise<{ triggered: boolean; improvement: number }> {
  const baseline = await getBaselineHistory(routeKey);
  if (!baseline) {
    // No baseline yet — track current as new baseline
    await trackBaselineCpp(routeKey, currentCpp);
    return { triggered: false, improvement: 0 };
  }

  const triggered = detectCppImprovement(baseline.baseline, currentCpp);
  const improvement = triggered
    ? (currentCpp - baseline.baseline) / baseline.baseline
    : 0;

  return { triggered, improvement };
}
