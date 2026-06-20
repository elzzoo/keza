import "server-only";
import { safeGet, safeSet } from "@/lib/redis";

export interface PriceBaseline {
  route: string;
  avg: number;
  stdDev: number;
  min: number;
  max: number;
  count: number;
  lastUpdated: Date;
}

export interface UserSearchHistory {
  email: string;
  routes: string[];
  dates: Date[];
  prices: number[];
  cabins?: string[];
}

const MIN_DATA_POINTS = 5;
const BASELINE_CACHE_TTL = 24 * 60 * 60; // 24 hours

export async function aggregateUserHistory(
  email: string,
  days: number = 90
): Promise<UserSearchHistory> {
  // Read user's search history from Redis
  // Key: keza:search:user:{email}:history
  const key = `keza:search:user:${email}:history`;
  const cached = await safeGet<UserSearchHistory>(key);

  if (cached) {
    return cached;
  }

  // Placeholder: would aggregate from search logs
  return {
    email,
    routes: [],
    dates: [],
    prices: [],
    cabins: [],
  };
}

export function calculateBaselineMetrics(
  prices: number[]
): PriceBaseline | null {
  if (prices.length < MIN_DATA_POINTS) {
    return null;
  }

  const sorted = [...prices].sort((a, b) => a - b);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

  // Standard deviation
  const variance =
    prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);

  return {
    route: "", // Set by caller
    avg,
    stdDev,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    count: prices.length,
    lastUpdated: new Date(),
  };
}

export async function trainRoutePricingModel(
  route: string
): Promise<PriceBaseline | null> {
  const [from, to] = route.split("-");
  if (!from || !to) return null;

  // Fetch 90-day price history
  const history = await getPriceHistory(from, to);
  if (!history || history.length < MIN_DATA_POINTS) {
    return null;
  }

  const baseline = calculateBaselineMetrics(history);
  if (!baseline) return null;

  baseline.route = route;

  // Cache in Redis
  const cacheKey = `keza:ml:baseline:${route}`;
  await safeSet(cacheKey, JSON.stringify(baseline), {
    ex: BASELINE_CACHE_TTL,
  });

  return baseline;
}

export async function getRouteBaseline(
  route: string
): Promise<PriceBaseline | null> {
  const cacheKey = `keza:ml:baseline:${route}`;
  const cached = await safeGet<string>(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached);
    // Convert lastUpdated string back to Date if needed
    if (typeof parsed.lastUpdated === "string") {
      parsed.lastUpdated = new Date(parsed.lastUpdated);
    }
    return parsed;
  }

  return trainRoutePricingModel(route);
}

// Helper: fetch price history from Redis or database
// This is a placeholder that should be connected to actual price history storage
async function getPriceHistory(from: string, to: string): Promise<number[]> {
  const key = `keza:price:history:${from}:${to}`;
  const cached = await safeGet<number[]>(key);
  if (cached) {
    return cached;
  }

  // Placeholder: would fetch from database or external source
  return [];
}
