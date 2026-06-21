import "server-only";
import { iataToAirline, VIRTUAL_IATA_CODES } from "./iataAirlines";
import type { NormalizedFlight } from "./promotions/engine";
import { redis } from "@/lib/redis";
import { logError, logWarn } from "@/lib/logger";

type Cabin = "economy" | "premium" | "business" | "first";

const DUFFEL_BASE = "https://api.duffel.com";
const DUFFEL_TIMEOUT = 3_500;  // S1-3: Reduced from 4200 to 3500ms per attempt (dual-budget strategy: 6.5s total)
const MAX_RETRIES = 1;     // 1 retry max (total worst-case: 3.5s + 600ms + 3.5s = 7.6s)
const RETRY_BACKOFF_MS = [600, 1200] as const; // wait before attempt 2, 3

/** Map KEZA cabin names to Duffel cabin class values */
const CABIN_MAP: Record<Cabin, string> = {
  economy:  "economy",
  premium:  "premium_economy",
  business: "business",
  first:    "first",
};

/**
 * Hardcoded fallback exchange rates to USD.
 * Used when the live Redis cache (populated by /api/forex) is unavailable.
 * The live rates (forex:usd:all key) are stored as units-per-USD, so we
 * invert them here to get USD-per-unit.
 */
const FX_FALLBACK_TO_USD: Record<string, number> = {
  USD: 1.00,
  EUR: 1.08,
  GBP: 1.27,
  XOF: 0.00165, // West African CFA franc
  CAD: 0.73,
  AUD: 0.65,
  CHF: 1.12,
  JPY: 0.0066,
  MAD: 0.10,
  NGN: 0.00065,
};

/** Cached live rates — lazy-loaded once per Lambda warm start. */
let _liveRatesCache: Record<string, number> | null = null;

/**
 * Return a map of currency → USD conversion rate.
 * Tries the Redis cache (written by /api/forex every 12 h) first; falls
 * back to the hardcoded table if Redis is unavailable.
 */
async function getFxRates(): Promise<Record<string, number>> {
  if (_liveRatesCache) return _liveRatesCache;
  try {
    // /api/forex stores rates-from-USD (e.g. XOF: 605) → invert to get USD per unit
    const fromUsd = await redis.get<Record<string, number>>("forex:usd:all");
    if (fromUsd && typeof fromUsd === "object" && Object.keys(fromUsd).length > 5) {
      const toUsdMap: Record<string, number> = { USD: 1.0 };
      for (const [code, rate] of Object.entries(fromUsd)) {
        if (typeof rate === "number" && rate > 0) toUsdMap[code] = 1 / rate;
      }
      _liveRatesCache = toUsdMap;
      return toUsdMap;
    }
  } catch {
    // Redis unavailable — use fallback
  }
  return FX_FALLBACK_TO_USD;
}

export async function toUsd(amount: string | number, currency: string): Promise<number | null> {
  const rates = await getFxRates();
  const rate = rates[currency.toUpperCase()] ?? FX_FALLBACK_TO_USD[currency.toUpperCase()];
  if (!rate) return null; // unknown currency — skip this offer
  return Math.round(Number(amount) * rate * 100) / 100;
}

// ─── Duffel response types ────────────────────────────────────────────────────

interface DuffelCarrier {
  iata_code?: string;
}

interface DuffelSegment {
  operating_carrier?: DuffelCarrier;
  marketing_carrier?: DuffelCarrier;
  departing_at?: string;
  arriving_at?: string;
  stops?: unknown[];
}

interface DuffelSlice {
  segments?: DuffelSegment[];
  duration?: string; // ISO 8601 e.g. "PT6H30M"
}

interface DuffelOffer {
  id: string;
  total_amount?: string;
  total_currency?: string;
  slices?: DuffelSlice[];
}

interface DuffelOfferRequestResponse {
  data?: {
    id?: string;
    offers?: DuffelOffer[];
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse ISO 8601 duration string to minutes (e.g. "PT6H30M" → 390) */
export function parseDurationMinutes(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  return (Number(match[1] ?? 0) * 60) + Number(match[2] ?? 0);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch flights from Duffel for a single one-way leg.
 * Returns an empty array on any error — caller falls back to Travelpayouts only.
 *
 * @param from  IATA origin code
 * @param to    IATA destination code
 * @param date  Departure date YYYY-MM-DD
 * @param cabin Cabin class (defaults to economy)
 * @param passengers Number of adults (defaults to 1)
 */
export async function fetchFromDuffel(
  from: string,
  to: string,
  date: string,
  cabin: Cabin = "economy",
  passengers = 1,
): Promise<NormalizedFlight[]> {
  const apiKey = process.env.DUFFEL_API_KEY;
  if (!apiKey || apiKey === "xxx") {
    // Not configured — silently skip, Travelpayouts will handle it
    return [];
  }

  const passengerList = Array.from({ length: Math.min(passengers, 9) }, () => ({
    type: "adult",
  }));

  const requestBody = {
    data: {
      slices: [{ origin: from.toUpperCase(), destination: to.toUpperCase(), departure_date: date }],
      passengers: passengerList,
      cabin_class: CABIN_MAP[cabin],
      return_offers: true,
      max_connections: 2,
    },
  };

  // Helper: single attempt with its own abort controller
  async function attemptFetch(): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DUFFEL_TIMEOUT);
    try {
      const r = await fetch(`${DUFFEL_BASE}/air/offer_requests`, {
        method:  "POST",
        headers: {
          Authorization:    `Bearer ${apiKey}`,
          "Content-Type":   "application/json",
          "Duffel-Version": "v2",
          Accept:           "application/json",
        },
        body:   JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timer);
      return r;
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  }

  try {
    let res: Response | null = null;
    let lastErr: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        res = await attemptFetch();
        // Don't retry on 4xx (client errors) — only on network failures or 5xx
        if (res.ok || (res.status >= 400 && res.status < 500)) break;
        // 5xx: retry
        lastErr = new Error(`[duffel] ${res.status}`);
      } catch (err) {
        lastErr = err;
        const name = (err as Error).name;
        if (name === "AbortError") {
          logWarn(`[duffel] timeout attempt ${attempt + 1} for ${from}→${to}`);
        }
      }
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_BACKOFF_MS[attempt] ?? 1200));
      }
    }

    if (!res) throw lastErr;

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      // Sanitize error body to avoid leaking API keys or sensitive data
      const sanitized = body.slice(0, 200).replace(/api[_-]?key|authorization|token/gi, "***");
      logError(`[duffel] ${res.status} for ${from}→${to}: ${sanitized}`);
      // Check for 429 rate limiting
      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        if (retryAfter) {
          logWarn(`[duffel] rate limited (retry after ${retryAfter}s), falling back to Travelpayouts`);
        }
      }
      return [];
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      logError(`[duffel] invalid JSON response for ${from}→${to}`);
      return [];
    }

    // Validate response structure
    if (!json || typeof json !== "object" || !("data" in json)) {
      logWarn(`[duffel] invalid response structure for ${from}→${to}: missing data field`);
      return [];
    }

    const data = (json as DuffelOfferRequestResponse).data;
    if (!Array.isArray(data?.offers)) {
      logWarn(`[duffel] invalid response structure for ${from}→${to}: offers is not an array`);
      return [];
    }

    const offers = data.offers;
    if (offers.length === 0) return [];

    const flights: NormalizedFlight[] = [];

    for (const offer of offers.slice(0, 30)) {
      // Validate offer structure
      if (!offer || typeof offer !== "object" || !offer.id) {
        logWarn(`[duffel] skipping malformed offer for ${from}→${to}`);
        continue;
      }

      const priceUsd = await toUsd(offer.total_amount ?? "0", offer.total_currency ?? "USD");
      if (!priceUsd || priceUsd <= 0) continue;

      const slices = offer.slices;
      if (!Array.isArray(slices) || slices.length === 0) {
        logWarn(`[duffel] offer ${offer.id} has no valid slices for ${from}→${to}`);
        continue;
      }

      const slice = slices[0];
      if (!slice || typeof slice !== "object") continue;

      const segments = slice.segments ?? [];
      const stops = Math.max(0, segments.length - 1);

      // Prefer operating carrier, fall back to marketing carrier.
      // Collect ALL unique resolved airline names across all segments.
      const resolvedAirlines: string[] = [];
      for (const seg of segments) {
        const code = seg?.operating_carrier?.iata_code ?? seg?.marketing_carrier?.iata_code;
        if (!code) continue;
        const name = iataToAirline(code);
        // name === null means ZZ/YP/ZG virtual code — skip silently
        if (name && !resolvedAirlines.includes(name)) resolvedAirlines.push(name);
      }
      // Fallback: use first segment code as-is when ALL segments were unresolved.
      // Skip virtual/unresolved codes (ZZ, YP, ZG, DM, Z0, NI) even in fallback
      // — better to skip the offer than display a raw unintelligible code.
      // Uses VIRTUAL_IATA_CODES from iataAirlines.ts (module-level, not re-allocated here).
      if (resolvedAirlines.length === 0) {
        const firstCode = segments[0]?.operating_carrier?.iata_code ?? segments[0]?.marketing_carrier?.iata_code;
        if (firstCode && !VIRTUAL_IATA_CODES.has(firstCode.toUpperCase())) {
          resolvedAirlines.push(firstCode.toUpperCase());
        }
      }

      // Duration: use Duffel's pre-computed slice duration when available
      let duration: number | undefined;
      if (slice.duration) {
        const mins = parseDurationMinutes(slice.duration);
        if (mins > 0) duration = mins;
      } else if (segments.length > 0) {
        const first = segments[0];
        const last  = segments[segments.length - 1];
        if (first?.departing_at && last?.arriving_at) {
          const diff = new Date(last.arriving_at).getTime() - new Date(first.departing_at).getTime();
          if (diff > 0) duration = Math.round(diff / 60_000);
        }
      }

      // Skip offers where we cannot identify any airline (all-virtual segments)
      if (resolvedAirlines.length === 0) continue;

      const flight: NormalizedFlight = {
        from,
        to,
        price:    priceUsd,
        airlines: resolvedAirlines,
        stops,
      };
      if (duration && duration > 0) flight.duration = duration;
      flights.push(flight);
    }

    // Deduplicate by (sorted airlines, stops) — keep cheapest
    const best = new Map<string, NormalizedFlight>();
    for (const f of flights) {
      const key = `${[...f.airlines].sort().join(",")}::${f.stops ?? 0}`;
      const existing = best.get(key);
      if (!existing || f.price < existing.price) best.set(key, f);
    }

    return Array.from(best.values());

  } catch (err) {
    const name = (err as Error).name;
    if (name === "AbortError") {
      logWarn(`[duffel] all attempts timed out (>${DUFFEL_TIMEOUT}ms) for ${from}→${to}`);
    } else {
      logError(`[duffel] unexpected error for ${from}→${to}:`, err);
    }
    return [];
  }
}
