import "server-only";
import { iataToAirline } from "./iataAirlines";
import type { NormalizedFlight } from "./promotions/engine";

type Cabin = "economy" | "premium" | "business" | "first";

const DUFFEL_BASE = "https://api.duffel.com";
const TIMEOUT_MS = 8_000;
const MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = [600, 1200] as const; // wait before attempt 2, 3

/** Map KEZA cabin names to Duffel cabin class values */
const CABIN_MAP: Record<Cabin, string> = {
  economy:  "economy",
  premium:  "premium_economy",
  business: "business",
  first:    "first",
};

/**
 * Approximate exchange rates to USD.
 * Used when Duffel returns prices in non-USD currencies.
 * Refreshed quarterly — accuracy sufficient for comparison purposes.
 */
const FX_TO_USD: Record<string, number> = {
  USD: 1.00,
  EUR: 1.08,
  GBP: 1.27,
  XOF: 0.00165, // West African CFA franc
  CAD: 0.73,
  AUD: 0.65,
  CHF: 1.12,
  JPY: 0.0066,
};

function toUsd(amount: string | number, currency: string): number | null {
  const rate = FX_TO_USD[currency.toUpperCase()];
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
function parseDurationMinutes(iso: string): number {
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
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
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
          console.warn(`[duffel] timeout attempt ${attempt + 1} for ${from}→${to}`);
        }
      }
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_BACKOFF_MS[attempt] ?? 1200));
      }
    }

    if (!res) throw lastErr;

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[duffel] ${res.status} for ${from}→${to}: ${body.slice(0, 200)}`);
      return [];
    }

    const json = (await res.json()) as DuffelOfferRequestResponse;
    const offers = json.data?.offers ?? [];
    if (offers.length === 0) return [];

    const flights: NormalizedFlight[] = [];

    for (const offer of offers.slice(0, 30)) {
      const priceUsd = toUsd(offer.total_amount ?? "0", offer.total_currency ?? "USD");
      if (!priceUsd || priceUsd <= 0) continue;

      const slice = offer.slices?.[0];
      if (!slice) continue;

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
      // Skip virtual/unresolved codes (ZZ, YP, ZG) even in fallback — caller would
      // display a raw unintelligible code. Better to skip the offer entirely.
      if (resolvedAirlines.length === 0) {
        const firstCode = segments[0]?.operating_carrier?.iata_code ?? segments[0]?.marketing_carrier?.iata_code;
        const VIRTUAL_CODES = new Set(["ZZ", "YP", "ZG"]);
        if (firstCode && !VIRTUAL_CODES.has(firstCode.toUpperCase())) {
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
      console.warn(`[duffel] all attempts timed out (>${TIMEOUT_MS}ms) for ${from}→${to}`);
    } else {
      console.error(`[duffel] unexpected error for ${from}→${to}:`, err);
    }
    return [];
  }
}
