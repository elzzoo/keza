// lib/milesDataService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Service layer for dynamic miles data — Redis-first, static fallback.
//
// SAFETY CONTRACT:
//   • Never throws — all Redis errors are caught, static fallback used silently
//   • Behaves identically to before if Redis is unreachable or empty
//   • Static fallback values are NEVER removed (DO NOT delete fallback paths)
//
// Redis key patterns (written by /api/cron/miles-prices):
//   miles:price:{program}       → number (cents per mile, e.g. 1.5)
//   miles:lastUpdated:{program} → ISO string (when cron last confirmed value)
//   miles:promos:{fromProgram}  → TransferBonusRecord[] (active transfer bonuses)
//   miles:buy:{program}         → BuyMilesPrice (current buy-miles pricing)
// ─────────────────────────────────────────────────────────────────────────────

import { MILES_PRICE_MAP, DEFAULT_MILE_VALUE_CENTS } from "@/data/milesPrices";
import { TRANSFER_BONUSES, type TransferBonusRecord } from "@/data/transferBonuses";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Current buy-miles pricing for a program (per-person, USD). */
export interface BuyMilesPrice {
  program: string;
  /** USD per 1 000 miles. Null = this program does not sell miles directly. */
  costPer1000: number | null;
  source: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getRedis() {
  try {
    const { redis } = await import("./redis");
    return redis;
  } catch {
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get effective value per mile (cents USD) for a program.
 *
 * Lookup order:
 *   1. Redis `miles:price:{program}`  (updated daily by auto-calibration cron)
 *   2. Static `MILES_PRICE_MAP`       (bundled baseline — always present)
 *   3. `DEFAULT_MILE_VALUE_CENTS`     (absolute last resort)
 *
 * Safe to call even when Redis is down.
 */
export async function getProgramValue(program: string): Promise<number> {
  const redis = await getRedis();
  if (redis) {
    const cached = await redis.get<number>(`miles:price:${program}`).catch(() => null);
    if (typeof cached === "number" && cached > 0) return cached;
  }
  return MILES_PRICE_MAP.get(program) ?? DEFAULT_MILE_VALUE_CENTS;
}

/**
 * Get all transfer bonuses from a given source currency/program.
 *
 * Lookup order:
 *   1. Redis `miles:promos:{fromProgram}`  (updated by promotions cron)
 *   2. Static `TRANSFER_BONUSES`           (bundled baseline)
 *
 * The Redis value, if present, may contain live promoRatio/promoValidUntil
 * overrides on top of the base ratios.
 */
export async function getTransferBonus(
  fromProgram: string,
): Promise<TransferBonusRecord[]> {
  const redis = await getRedis();
  if (redis) {
    const cached = await redis
      .get<TransferBonusRecord[]>(`miles:promos:${fromProgram}`)
      .catch(() => null);
    if (Array.isArray(cached) && cached.length > 0) return cached;
  }
  return TRANSFER_BONUSES.filter((b) => b.from === fromProgram);
}

/**
 * Get buy-miles pricing for a program.
 *
 * Lookup order:
 *   1. Redis `miles:buy:{program}`  (could be updated by future cron)
 *   2. Static data via `calculateAcquisitionCost`
 *
 * Returns `costPer1000: null` if the program does not sell miles directly.
 */
export async function getBuyMilesPrice(program: string): Promise<BuyMilesPrice> {
  const redis = await getRedis();
  if (redis) {
    const cached = await redis
      .get<BuyMilesPrice>(`miles:buy:${program}`)
      .catch(() => null);
    if (
      cached != null &&
      typeof cached === "object" &&
      "costPer1000" in cached
    ) {
      return cached as BuyMilesPrice;
    }
  }

  // Static fallback — derive cheapest direct purchase path
  try {
    const { calculateAcquisitionCost } = await import("./milesAcquisition");
    const result = calculateAcquisitionCost(program, 1000);
    const directPath = result.paths.find((p) => p.source === "airline direct");
    return {
      program,
      costPer1000: directPath?.costPer1000 ?? null,
      source: "airline direct",
    };
  } catch {
    return { program, costPer1000: null, source: "airline direct" };
  }
}

/**
 * Get the timestamp when a program's value was last confirmed/updated by cron.
 *
 * Returns `null` if:
 *   - The program has never been touched by the cron (uses static values only)
 *   - Redis is unavailable
 */
export async function getLastUpdated(program: string): Promise<Date | null> {
  const redis = await getRedis();
  if (redis) {
    const ts = await redis
      .get<string>(`miles:lastUpdated:${program}`)
      .catch(() => null);
    if (typeof ts === "string") {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}

/**
 * Load effective prices for ALL known programs in parallel.
 * Convenience wrapper used by `getEffectivePrices()` in costEngine.
 *
 * Equivalent to calling `getProgramValue(p)` for each program in MILES_PRICE_MAP.
 */
export async function getAllEffectivePrices(): Promise<Map<string, number>> {
  const programs = Array.from(MILES_PRICE_MAP.keys());
  const redis = await getRedis();

  // Fast path: batch all Redis reads in parallel, then fill gaps from static map
  const map = new Map<string, number>();

  if (redis) {
    await Promise.all(
      programs.map(async (program) => {
        const cached = await redis
          .get<number>(`miles:price:${program}`)
          .catch(() => null);
        map.set(
          program,
          typeof cached === "number" && cached > 0
            ? cached
            : MILES_PRICE_MAP.get(program)!,
        );
      }),
    );
  } else {
    // Redis unavailable — use static values for all programs
    MILES_PRICE_MAP.forEach((price, program) => {
      map.set(program, price);
    });
  }

  return map;
}
