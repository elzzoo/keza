import "server-only";
import { iataToAirline, VIRTUAL_IATA_CODES } from "./iataAirlines";
import type { NormalizedFlight } from "./promotions/engine";
import { redis } from "@/lib/redis";
import { logError, logWarn } from "@/lib/logger";
import { toUsd, parseDurationMinutes } from "./duffelProvider";
import { AMADEUS_TIMEOUT_MS } from "@/lib/config";

type Cabin = "economy" | "premium" | "business" | "first";

// Self-service tier only has a test environment — production access needs
// Amadeus's separate (still lightweight, no-KYB) "move to production" step.
// Point AMADEUS_ENV=production at the real host once that's done.
const AMADEUS_BASE =
  process.env.AMADEUS_ENV === "production"
    ? "https://api.amadeus.com"
    : "https://test.api.amadeus.com";

const AMADEUS_TIMEOUT = AMADEUS_TIMEOUT_MS;
const MAX_RETRIES = 1;
const RETRY_BACKOFF_MS = [200, 500] as const;
const TOKEN_CACHE_KEY = "amadeus:oauth:token";
const AMADEUS_ERROR_TRACKING_KEY = "amadeus:errors:1m";

const CABIN_MAP: Record<Cabin, string> = {
  economy:  "ECONOMY",
  premium:  "PREMIUM_ECONOMY",
  business: "BUSINESS",
  first:    "FIRST",
};

interface AmadeusOfferSegment {
  departure: { iataCode: string; at: string };
  arrival: { iataCode: string; at: string };
  carrierCode: string;
  operating?: { carrierCode?: string };
  duration?: string;
}

interface AmadeusOfferItinerary {
  duration?: string;
  segments: AmadeusOfferSegment[];
}

interface AmadeusOffer {
  id: string;
  price: { total: string; currency: string };
  itineraries: AmadeusOfferItinerary[];
}

interface AmadeusFlightOffersResponse {
  data?: AmadeusOffer[];
}

/**
 * Track Amadeus error occurrence for alerting — mirrors trackDuffelError's
 * rolling 1-minute window in lib/duffelProvider.ts.
 */
async function trackAmadeusError(isError: boolean): Promise<void> {
  try {
    const now = Date.now();
    const window_start = now - 60_000;

    let metrics = await redis.get<{ window_start: number; error_count: number; total_count: number }>(
      AMADEUS_ERROR_TRACKING_KEY
    );
    if (!metrics || metrics.window_start < window_start) {
      metrics = { window_start: now, error_count: 0, total_count: 0 };
    }
    metrics.total_count += 1;
    if (isError) metrics.error_count += 1;
    await redis.setex(AMADEUS_ERROR_TRACKING_KEY, 120, JSON.stringify(metrics));
  } catch (err) {
    logWarn(`[amadeus] error tracking failed: ${String(err)}`);
  }
}

/**
 * Get a cached OAuth2 access token, or fetch a fresh one via client_credentials.
 * Cached in Redis (not a module-level var) since serverless functions cold-start
 * frequently and Amadeus's token TTL (~30min) comfortably outlives most warm windows.
 */
async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.AMADEUS_API_KEY;
  const clientSecret = process.env.AMADEUS_API_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const cached = await redis.get<string>(TOKEN_CACHE_KEY);
    if (cached) return cached;
  } catch (err) {
    logWarn(`[amadeus] token cache read failed: ${String(err)}`);
  }

  try {
    const res = await fetch(`${AMADEUS_BASE}/v1/security/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!res.ok) {
      logError(`[amadeus] token request failed: ${res.status}`);
      return null;
    }
    const json = await res.json() as { access_token?: string; expires_in?: number };
    if (!json.access_token) return null;

    // Cache for slightly less than the real TTL so we never serve an expired token
    const ttl = Math.max(60, (json.expires_in ?? 1800) - 60);
    try {
      await redis.setex(TOKEN_CACHE_KEY, ttl, json.access_token);
    } catch (err) {
      logWarn(`[amadeus] token cache write failed: ${String(err)}`);
    }
    return json.access_token;
  } catch (err) {
    logError(`[amadeus] token fetch error:`, err);
    return null;
  }
}

export async function fetchFromAmadeus(
  from: string,
  to: string,
  date: string,
  cabin: Cabin = "economy",
  passengers = 1,
): Promise<NormalizedFlight[]> {
  const token = await getAccessToken();
  if (!token) {
    // Not configured (or auth failed) — silently skip, other providers cover it
    return [];
  }

  const startMs = Date.now();
  const params = new URLSearchParams({
    originLocationCode: from.toUpperCase(),
    destinationLocationCode: to.toUpperCase(),
    departureDate: date,
    adults: String(Math.min(passengers, 9)),
    travelClass: CABIN_MAP[cabin],
    currencyCode: "USD",
    max: "30",
  });

  async function attemptFetch(): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AMADEUS_TIMEOUT);
    try {
      const r = await fetch(`${AMADEUS_BASE}/v2/shopping/flight-offers?${params}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
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
        if (res.ok || (res.status >= 400 && res.status < 500)) break;
        lastErr = new Error(`[amadeus] ${res.status}`);
      } catch (err) {
        lastErr = err;
        if ((err as Error).name === "AbortError") {
          logWarn(`[amadeus] timeout attempt ${attempt + 1} for ${from}→${to}`);
        }
      }
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_BACKOFF_MS[attempt] ?? 1200));
      }
    }

    if (!res) throw lastErr;

    const elapsedMs = Date.now() - startMs;
    if (res.ok) logWarn(`[amadeus] latency ${elapsedMs}ms for ${from}→${to}`);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const sanitized = body.slice(0, 200).replace(/api[_-]?key|authorization|token/gi, "***");
      logError(`[amadeus] ${res.status} for ${from}→${to}: ${sanitized}`);
      await trackAmadeusError(true);
      // A 401 usually means the cached token expired server-side before our
      // TTL did — drop it so the next call re-authenticates instead of
      // silently failing for up to the rest of the cache window.
      if (res.status === 401) {
        redis.del(TOKEN_CACHE_KEY).catch(() => {});
      }
      return [];
    }

    let json: AmadeusFlightOffersResponse;
    try {
      json = await res.json();
    } catch {
      logError(`[amadeus] invalid JSON response for ${from}→${to}`);
      await trackAmadeusError(true);
      return [];
    }

    const offers = json.data;
    if (!Array.isArray(offers) || offers.length === 0) {
      await trackAmadeusError(false);
      return [];
    }

    const flights: NormalizedFlight[] = [];

    for (const offer of offers) {
      if (!offer || typeof offer !== "object" || !offer.id) continue;

      const priceUsd = await toUsd(offer.price?.total ?? "0", offer.price?.currency ?? "USD");
      if (!priceUsd || priceUsd <= 0) continue;

      const itinerary = offer.itineraries?.[0];
      const segments = itinerary?.segments ?? [];
      if (segments.length === 0) continue;

      const stops = Math.max(0, segments.length - 1);

      const resolvedAirlines: string[] = [];
      for (const seg of segments) {
        const code = seg?.operating?.carrierCode ?? seg?.carrierCode;
        if (!code) continue;
        const name = iataToAirline(code);
        if (name && !resolvedAirlines.includes(name)) resolvedAirlines.push(name);
      }
      if (resolvedAirlines.length === 0) {
        const firstCode = segments[0]?.operating?.carrierCode ?? segments[0]?.carrierCode;
        if (firstCode && !VIRTUAL_IATA_CODES.has(firstCode.toUpperCase())) {
          resolvedAirlines.push(firstCode.toUpperCase());
        }
      }
      if (resolvedAirlines.length === 0) continue;

      let duration: number | undefined;
      if (itinerary?.duration) {
        const mins = parseDurationMinutes(itinerary.duration);
        if (mins > 0) duration = mins;
      } else {
        const first = segments[0];
        const last = segments[segments.length - 1];
        if (first?.departure?.at && last?.arrival?.at) {
          const diff = new Date(last.arrival.at).getTime() - new Date(first.departure.at).getTime();
          if (diff > 0) duration = Math.round(diff / 60_000);
        }
      }

      const flight: NormalizedFlight = {
        from,
        to,
        price: priceUsd,
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

    await trackAmadeusError(false);
    return Array.from(best.values());

  } catch (err) {
    const name = (err as Error).name;
    if (name === "AbortError") {
      logWarn(`[amadeus] all attempts timed out (>${AMADEUS_TIMEOUT}ms) for ${from}→${to}`);
    } else {
      logError(`[amadeus] unexpected error for ${from}→${to}:`, err);
    }
    await trackAmadeusError(true);
    return [];
  }
}
