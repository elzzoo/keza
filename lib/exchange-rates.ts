import "server-only";
import { redis } from "@/lib/redis";

export type ExchangeRates = Record<string, number>;

const CACHE_KEY = "keza:exchange-rates";
const CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds

// Default rates (fallback if API fails) — these should cover all 21+ supported currencies
// These are approximate rates as of the time of writing; actual rates will be fetched via Inngest cron
const DEFAULT_RATES: ExchangeRates = {
  EUR: 0.92,
  GBP: 0.79,
  JPY: 152.5,
  SGD: 1.35,
  AUD: 1.52,
  CAD: 1.36,
  CHF: 0.88,
  CNY: 7.24,
  INR: 83.2,
  MXN: 17.08,
  BRL: 4.97,
  ZAR: 18.45,
  AED: 3.67,
  MAD: 10.0,
  KRW: 1304.5,
  TWD: 32.1,
  HKD: 7.81,
  THB: 35.95,
  MYR: 4.73,
  XOF: 656.5,
};

/**
 * Get cached exchange rates from Redis, with fallback to defaults
 * @returns ExchangeRates object (currency code → USD rate)
 */
export async function getCachedRates(): Promise<ExchangeRates> {
  try {
    // Try Redis first (server-side cache)
    if (redis) {
      const cached = await redis.get<ExchangeRates>(CACHE_KEY);
      if (cached) {
        return cached;
      }
    }
  } catch (error) {
    console.warn("Redis cache miss, using defaults:", error);
  }

  // Fallback to defaults (rates will be updated via Inngest cron every 6h)
  return DEFAULT_RATES;
}

/**
 * Update exchange rates in Redis cache
 * @param rates ExchangeRates object to store
 */
export async function updateRatesInCache(rates: ExchangeRates): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(CACHE_KEY, JSON.stringify(rates), { ex: CACHE_TTL });
  } catch (error) {
    console.warn("Failed to update Redis cache:", error);
  }
}

/**
 * Fetch latest rates (called by Inngest cron job)
 * @returns Latest exchange rates from API or defaults
 */
export async function fetchLatestRates(): Promise<ExchangeRates> {
  // This will be called by Inngest cron job in Task 8
  // For now, return defaults; actual API integration in Task 8
  return DEFAULT_RATES;
}
