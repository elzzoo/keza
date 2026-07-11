/**
 * Runtime configuration extracted from environment variables
 * Enables A/B testing, gradual rollouts, and dynamic threshold tuning
 * without code changes or redeploy
 */

// ── Mile valuation ────────────────────────────────────────────────────────────
/** Default market value per mile in cents (e.g., 1.4 = $0.014/mile) */
export const DEFAULT_MILE_VALUE_CENTS = parseFloat(
  process.env.DEFAULT_MILE_VALUE_CENTS ?? "1.4"
);

/** Cabin multiplier for premium cabin estimates (applied when no real cabin price available) */
export const CABIN_MULTIPLIER_PREMIUM = parseFloat(
  process.env.CABIN_MULTIPLIER_PREMIUM ?? "1.8"
);
export const CABIN_MULTIPLIER_BUSINESS = parseFloat(
  process.env.CABIN_MULTIPLIER_BUSINESS ?? "4.0"
);
export const CABIN_MULTIPLIER_FIRST = parseFloat(
  process.env.CABIN_MULTIPLIER_FIRST ?? "6.5"
);

// ── Search latency & timeouts ─────────────────────────────────────────────────
/** Duffel API timeout in milliseconds (default: 2000ms = 2s) */
export const DUFFEL_TIMEOUT_MS = parseInt(
  process.env.DUFFEL_TIMEOUT_MS ?? "2000",
  10
);

/** Travelpayouts fallback timeout in milliseconds */
export const TRAVELPAYOUTS_TIMEOUT_MS = parseInt(
  process.env.TRAVELPAYOUTS_TIMEOUT_MS ?? "3000",
  10
);

/** Forex rate fetch timeout (default: 2000ms) */
export const FOREX_RATE_TIMEOUT_MS = parseInt(
  process.env.FOREX_RATE_TIMEOUT_MS ?? "2000",
  10
);

// ── Redis caching ─────────────────────────────────────────────────────────────
/** Search result cache TTL in seconds (default: 3600s = 1h) */
export const SEARCH_CACHE_TTL_SECONDS = parseInt(
  process.env.SEARCH_CACHE_TTL_SECONDS ?? "3600",
  10
);

/** Calendar price cache TTL in seconds (default: 7200s = 2h) */
export const CALENDAR_CACHE_TTL_SECONDS = parseInt(
  process.env.CALENDAR_CACHE_TTL_SECONDS ?? "7200",
  10
);

/** Seat alert cache TTL in seconds (default: 90 days) */
export const SEAT_ALERT_CACHE_TTL_SECONDS = parseInt(
  process.env.SEAT_ALERT_CACHE_TTL_SECONDS ?? String(90 * 24 * 60 * 60),
  10
);

// ── Trial & pricing ───────────────────────────────────────────────────────────
/** Trial duration in days (default: 7 days) */
export const TRIAL_DURATION_DAYS = parseInt(
  process.env.TRIAL_DURATION_DAYS ?? "7",
  10
);

/** Trial reminder threshold in days (alert X days before expiry) */
export const TRIAL_REMINDER_DAYS_BEFORE = parseInt(
  process.env.TRIAL_REMINDER_DAYS_BEFORE ?? "1",
  10
);

// ── Rate limiting ─────────────────────────────────────────────────────────────
/** API rate limit: requests per window */
export const RATE_LIMIT_REQUESTS = parseInt(
  process.env.RATE_LIMIT_REQUESTS ?? "60",
  10
);

/** Rate limit window in seconds */
export const RATE_LIMIT_WINDOW_SECONDS = parseInt(
  process.env.RATE_LIMIT_WINDOW_SECONDS ?? "60",
  10
);

// ── Feature flags ─────────────────────────────────────────────────────────────
/** Enable experimental multi-leg routing (Dijkstra algorithm) */
export const ENABLE_MULTI_LEG_ROUTING = process.env.ENABLE_MULTI_LEG_ROUTING === "true";

/** Enable React Suspense streaming for faster first paint */
export const ENABLE_SUSPENSE_STREAMING = process.env.ENABLE_SUSPENSE_STREAMING === "true";

/** Enable Redis pre-warming for popular routes */
export const ENABLE_REDIS_PREWARM = process.env.ENABLE_REDIS_PREWARM === "true";

/** P5.2 Advanced Pricing soft launch (Week 1-2: analytics collection only) */
export const ENABLE_P5_2_SOFT_LAUNCH = process.env.ENABLE_P5_2_SOFT_LAUNCH === "true";

/** P5.2 soft launch mode: 100% baseline cohort (Week 1-2), no signal/ML variants yet */
export const P5_2_BASELINE_ONLY = process.env.P5_2_BASELINE_ONLY === "true";

// ── Validation helpers ────────────────────────────────────────────────────────
/**
 * Validate all config values are within reasonable bounds
 * Run at server startup to catch bad env var values early
 */
export function validateConfig(): string[] {
  const errors: string[] = [];

  if (DEFAULT_MILE_VALUE_CENTS <= 0 || DEFAULT_MILE_VALUE_CENTS > 10) {
    errors.push(
      `DEFAULT_MILE_VALUE_CENTS out of range: ${DEFAULT_MILE_VALUE_CENTS} (expected 0.1-10)`
    );
  }

  if (DUFFEL_TIMEOUT_MS < 1000 || DUFFEL_TIMEOUT_MS > 30000) {
    errors.push(
      `DUFFEL_TIMEOUT_MS out of range: ${DUFFEL_TIMEOUT_MS}ms (expected 1000-30000)`
    );
  }

  if (TRIAL_DURATION_DAYS < 1 || TRIAL_DURATION_DAYS > 90) {
    errors.push(
      `TRIAL_DURATION_DAYS out of range: ${TRIAL_DURATION_DAYS} (expected 1-90)`
    );
  }

  return errors;
}
