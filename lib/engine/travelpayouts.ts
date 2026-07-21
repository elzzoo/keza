import "server-only";
import type { NormalizedFlight } from "../promotions/engine";
import { iataToAirline } from "../iataAirlines";
import { metroFor } from "../metroCodes";
import { logError, logWarn } from "../logger";
import type { CalendarDay } from "./types";

export const TP_BASE = "https://api.travelpayouts.com";
export const AVIASALES_BASE_URL = "https://www.aviasales.com";
export const TP_MARKER = "714947";

// Minimum realistic price for any international route (USD).
// Travelpayouts occasionally surfaces promotional micro-fares ($1–$10) that
// are data artifacts or expired flash deals — they skew the "best price" tile
// and make the miles comparison misleading. Anything below this is discarded.
export const MIN_REALISTIC_PRICE_USD = 30;

// TODO: Audit low-outlier prices (e.g., DSS→CDG showing $313 in high season July).
// Likely explanations: (1) deep-discounted/non-refundable fares with restrictions,
// (2) cached stale data from low-season, (3) Travelpayouts API anomaly.
// Monitor and add price-history correlation check if outliers persist.

/**
 * Build a unified fallback attempt list for (origin, destination) pairs.
 * Used by both fetchFromTravelpayouts() and fetchCalendarPrices() to ensure
 * consistent fallback behavior across single-date and calendar pricing.
 *
 * Attempt order:
 *  1. Exact codes (from, to)
 *  2. From metro, exact to
 *  3. Exact from, to metro
 *  4. Both metro codes
 *
 * @param from - Origin airport code
 * @param to - Destination airport code
 * @returns Array of [origin, destination] tuples to attempt in order
 */
function buildFallbackAttempts(from: string, to: string): Array<[string, string]> {
  const fromMetro = metroFor(from);
  const toMetro = metroFor(to);
  const attempts: Array<[string, string]> = [[from, to]];
  if (fromMetro) attempts.push([fromMetro, to]);
  if (toMetro) attempts.push([from, toMetro]);
  if (fromMetro && toMetro) attempts.push([fromMetro, toMetro]);
  return attempts;
}

// ─── Aviasales URL Building ──────────────────────────────────────────────────
/**
 * Build an Aviasales booking URL for a given flight search.
 *
 * Format:
 * - Oneway: https://www.aviasales.com/search/{FROM}{DATE}{TO}?passengers={N}&class={CABIN}&marker={MARKER}
 * - Roundtrip: https://www.aviasales.com/search/{FROM}{DATE}{TO}{RETURN_DATE}?passengers={N}&class={CABIN}&marker={MARKER}
 *
 * @param from - Origin airport code (e.g., "CDG", "SIN")
 * @param to - Destination airport code (e.g., "JFK", "LAX")
 * @param searchDate - Departure date in YYYY-MM-DD format
 * @param returnDate - Return date in YYYY-MM-DD format (undefined for one-way)
 * @param passengers - Number of passengers (defaults to 1)
 * @param cabin - Cabin class: "economy", "premium", "business", "first" (defaults to "economy")
 * @returns Full Aviasales booking URL
 */
// Aviasales' search-path parser expects DDMM (4 digits: day + month, no year)
// per date segment, NOT the full ISO date. A YYYYMMDD (8-digit) segment fails
// to match their regex and silently drops BOTH the destination and the dates
// from the parsed query, landing on "Oops, the search failed to launch" even
// though the origin airport (matched by the leading 3-letter code alone) still
// shows up. Confirmed live: /search/DSS20260820CDG20260827 → broken;
// /search/DSS2008CDG2708 → correctly launches DSS→CDG, Aug 20–27.
function toDDMM(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${day}${month}`;
}

export function buildAviasalesUrl(
  from: string,
  to: string,
  searchDate: string,
  returnDate: string | undefined,
  passengers: number = 1,
  cabin: string = "economy"
): string {
  const departureDateCompact = toDDMM(searchDate);
  const url = new URL(`${AVIASALES_BASE_URL}/search/${from}${departureDateCompact}${to}`);

  if (returnDate) {
    // Roundtrip: append return date to path
    const returnDateCompact = toDDMM(returnDate);
    url.pathname = `${url.pathname}${returnDateCompact}`;
  }

  // Add query parameters
  url.searchParams.set("passengers", String(passengers));
  url.searchParams.set("class", cabin);
  url.searchParams.set("marker", TP_MARKER);

  return url.toString();
}

// ─── Retry helper ────────────────────────────────────────────────────────────
/**
 * Retry an async function up to `maxAttempts` times.
 * Only retries on network errors or 5xx responses (not 4xx — those are permanent).
 * Uses exponential backoff: attempt 1 → 500ms wait, attempt 2 → 1000ms wait.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  backoffMs: number[] = [500, 1000],
  totalTimeoutMs = 9000 // Total timeout to avoid Vercel maxDuration (10s limit)
): Promise<T> {
  let lastErr: unknown;
  const startTime = Date.now();
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Check if we've exceeded total timeout budget
    if (Date.now() - startTime > totalTimeoutMs) {
      throw lastErr || new Error("Total retry timeout exceeded");
    }

    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const wait = backoffMs[attempt] ?? backoffMs[backoffMs.length - 1];
      if (attempt < maxAttempts - 1) {
        // Only wait if we won't exceed timeout
        if (Date.now() - startTime + wait <= totalTimeoutMs) {
          await new Promise(r => setTimeout(r, wait));
        }
      }
    }
  }
  throw lastErr;
}

export async function fetchV3(
  from: string,
  to: string,
  date: string,
  direct: boolean,
  token: string
): Promise<NormalizedFlight[]> {
  const [year, month] = date.split("-");
  const monthParam = `${year}-${month}`;

  const url = new URL(`${TP_BASE}/aviasales/v3/prices_for_dates`);
  url.searchParams.set("origin", from.toUpperCase());
  url.searchParams.set("destination", to.toUpperCase());
  url.searchParams.set("departure_at", monthParam);
  url.searchParams.set("currency", "usd");
  url.searchParams.set("sorting", "price");
  url.searchParams.set("unique", "false");
  url.searchParams.set("limit", "30");
  if (direct) url.searchParams.set("direct", "true");

  let res: Response;
  try {
    res = await withRetry(() => fetch(url.toString(), {
      next: { revalidate: 3600 },
      headers: {
        Accept: "application/json",
        "X-Access-Token": token,
      },
      signal: AbortSignal.timeout(3500),
    }));
  } catch (err) {
    logError(`[engine] aviasales v3 network error for ${from}→${to}:`, err);
    return [];
  }

  if (!res.ok) {
    logError(`[engine] aviasales v3 ${res.status} for ${from}→${to}`);
    return [];
  }

  const json = (await res.json()) as {
    success?: boolean;
    data?: Array<{
      price: number;
      airline: string;
      duration?: number;
      transfers?: number;
      departure_at?: string;
      link?: string;
    }>;
  };

  if (!Array.isArray(json.data) || json.data.length === 0) return [];

  // Deduplicate by (airline, departure date) — keep cheapest price per pairing
  const seen = new Map<string, typeof json.data[0]>();
  for (const f of json.data) {
    // Extract date safely: departure_at should be ISO format (YYYY-MM-DD...), fallback to empty string
    const day = f.departure_at && typeof f.departure_at === "string" ? f.departure_at.slice(0, 10) : "";
    // Skip records without valid departure date to prevent cache key collisions
    if (!day) continue;
    const key = `${f.airline}::${day}`;
    const existing = seen.get(key);
    if (!existing || f.price < existing.price) seen.set(key, f);
  }

  return Array.from(seen.values())
    .filter((f) => f.price >= MIN_REALISTIC_PRICE_USD)          // drop data artifacts
    .filter((f) => iataToAirline(f.airline) !== null)           // skip blacklisted/virtual carriers
    .slice(0, 15)
    .map((f) => {
      const flight: NormalizedFlight = {
        from,
        to,
        price: f.price,
        airlines: [iataToAirline(f.airline) ?? f.airline.toUpperCase()],
        stops: f.transfers ?? 0,
      };
      if (f.duration && f.duration > 0) flight.duration = f.duration;
      if (f.link) flight.bookingLink = `${AVIASALES_BASE_URL}${f.link}&marker=${TP_MARKER}`;
      return flight;
    });
}

export async function fetchMonthMatrix(
  from: string,
  to: string,
  date: string,
  direct: boolean,
  token: string
): Promise<NormalizedFlight[]> {
  const [year, month] = date.split("-");
  const monthParam = `${year}-${month}`;

  const url = new URL(`${TP_BASE}/v2/prices/month-matrix`);
  url.searchParams.set("origin", from.toUpperCase());
  url.searchParams.set("destination", to.toUpperCase());
  url.searchParams.set("month", monthParam);
  url.searchParams.set("currency", "USD");
  url.searchParams.set("show_to_affiliates", "true");
  if (direct) url.searchParams.set("direct", "true");

  let res: Response;
  try {
    res = await withRetry(() => fetch(url.toString(), {
      next: { revalidate: 3600 },
      headers: {
        Accept: "application/json",
        "X-Access-Token": token,
      },
      signal: AbortSignal.timeout(3500),
    }));
  } catch (err) {
    logError(`[engine] month-matrix network error for ${from}→${to}:`, err);
    return [];
  }

  if (!res.ok) {
    logError(`[engine] month-matrix ${res.status} for ${from}→${to}`);
    return [];
  }

  const json = (await res.json()) as {
    data?: Array<{
      value: number;
      number_of_changes: number;
      duration: number;
      depart_date: string;
      actual?: boolean;
    }>;
  };

  if (!Array.isArray(json.data) || json.data.length === 0) return [];

  const byDate = new Map<string, typeof json.data[0]>();
  for (const f of json.data) {
    if (f.actual === false) continue;
    const existing = byDate.get(f.depart_date);
    if (!existing || f.value < existing.value) byDate.set(f.depart_date, f);
  }

  return Array.from(byDate.values())
    .filter((f) => f.value >= MIN_REALISTIC_PRICE_USD)   // drop data artifacts
    .slice(0, 15)
    .map((f) => ({
      from,
      to,
      price: f.value,
      airlines: [],
      duration: f.duration > 0 ? f.duration : undefined,
      stops: f.number_of_changes,
    }));
}

/**
 * Fetch price-per-day for an entire month.
 * Used by the calendar/flexible-dates UI — returns ALL days, not top 15.
 */
export async function fetchMonthMatrixFull(
  from: string,
  to: string,
  date: string,
  direct: boolean,
  token: string
): Promise<CalendarDay[]> {
  const [year, month] = date.split("-");
  const monthParam = `${year}-${month}`;

  const url = new URL(`${TP_BASE}/v2/prices/month-matrix`);
  url.searchParams.set("origin", from.toUpperCase());
  url.searchParams.set("destination", to.toUpperCase());
  url.searchParams.set("month", monthParam);
  url.searchParams.set("currency", "USD");
  url.searchParams.set("show_to_affiliates", "true");
  if (direct) url.searchParams.set("direct", "true");

  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 },
    headers: {
      Accept: "application/json",
      "X-Access-Token": token,
    },
    signal: AbortSignal.timeout(4000),
  });

  if (!res.ok) return [];

  const json = (await res.json()) as {
    data?: Array<{
      value: number;
      number_of_changes: number;
      duration: number;
      depart_date: string;
      actual?: boolean;
    }>;
  };

  if (!Array.isArray(json.data) || json.data.length === 0) return [];

  // Keep cheapest per day
  const byDate = new Map<string, CalendarDay>();
  for (const f of json.data) {
    if (f.actual === false) continue;
    const existing = byDate.get(f.depart_date);
    if (!existing || f.value < existing.price) {
      byDate.set(f.depart_date, {
        date: f.depart_date,
        price: f.value,
        stops: f.number_of_changes,
        duration: f.duration > 0 ? f.duration : undefined,
      });
    }
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/** Also try v3 for calendar — has airline data per day */
export async function fetchV3Calendar(
  from: string,
  to: string,
  date: string,
  direct: boolean,
  token: string
): Promise<CalendarDay[]> {
  const [year, month] = date.split("-");
  const monthParam = `${year}-${month}`;

  const url = new URL(`${TP_BASE}/aviasales/v3/prices_for_dates`);
  url.searchParams.set("origin", from.toUpperCase());
  url.searchParams.set("destination", to.toUpperCase());
  url.searchParams.set("departure_at", monthParam);
  url.searchParams.set("currency", "usd");
  url.searchParams.set("sorting", "price");
  url.searchParams.set("unique", "false");
  url.searchParams.set("limit", "60");
  if (direct) url.searchParams.set("direct", "true");

  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 },
    headers: {
      Accept: "application/json",
      "X-Access-Token": token,
    },
    signal: AbortSignal.timeout(4000),
  });

  if (!res.ok) return [];

  const json = (await res.json()) as {
    data?: Array<{
      price: number;
      transfers?: number;
      duration?: number;
      departure_at?: string;
    }>;
  };

  if (!Array.isArray(json.data) || json.data.length === 0) return [];

  const byDate = new Map<string, CalendarDay>();
  for (const f of json.data) {
    const day = f.departure_at?.slice(0, 10) ?? "";
    if (!day) continue;
    const existing = byDate.get(day);
    if (!existing || f.price < existing.price) {
      byDate.set(day, {
        date: day,
        price: f.price,
        stops: f.transfers ?? 0,
        duration: f.duration && f.duration > 0 ? f.duration : undefined,
      });
    }
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Public: fetch calendar prices for a route + month.
 * Tries v3 first (better data), falls back to month-matrix.
 * Uses unified fallback attempt order for consistency with fetchFromTravelpayouts().
 */
export async function fetchCalendarPrices(
  from: string,
  to: string,
  date: string
): Promise<CalendarDay[]> {
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token || token === "xxx") return [];

  const attempts = buildFallbackAttempts(from, to);

  // Try v3 first (better data — includes price trends, airline codes)
  for (const [o, d] of attempts) {
    const v3 = await fetchV3Calendar(o, d, date, false, token);
    if (v3.length > 0) return v3;
  }

  // Fallback to month-matrix (broader coverage, price history)
  for (const [o, d] of attempts) {
    const mm = await fetchMonthMatrixFull(o, d, date, false, token);
    if (mm.length > 0) return mm;
  }

  return [];
}

/**
 * Rewrite a NormalizedFlight's from/to back to the airport codes the user
 * asked for, AND fix booking-link URLs that Travelpayouts built using the
 * metro-code fallback (e.g. DKR instead of DSS, PAR instead of CDG).
 */
export function rebrandRoute(flights: NormalizedFlight[], from: string, to: string): NormalizedFlight[] {
  const fromMetro = metroFor(from);   // e.g. "DKR" when from="DSS", null when no metro alias
  const toMetro   = metroFor(to);     // e.g. "PAR" when to="CDG"
  return flights.map((f) => {
    const result = { ...f, from, to };
    if (result.bookingLink) {
      // Replace the metro code with the actual airport code so that the
      // Aviasales deep link opens for the right airport.
      if (fromMetro) result.bookingLink = result.bookingLink.replaceAll(fromMetro, from);
      if (toMetro)   result.bookingLink = result.bookingLink.replaceAll(toMetro, to);
    }
    return result;
  });
}

export async function fetchFromTravelpayouts(
  from: string,
  to: string,
  date: string,
  direct: boolean
): Promise<NormalizedFlight[]> {
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token || token === "xxx") {
    logWarn("[engine] TRAVELPAYOUTS_TOKEN not configured — returning empty results");
    return [];
  }

  // Use unified fallback attempt order for consistency with fetchCalendarPrices()
  const attempts = buildFallbackAttempts(from, to);

  try {
    // ── Pass 1: v3 with exact month — best data (airline + deep links + price) ──
    for (const [o, d] of attempts) {
      const v3 = await fetchV3(o, d, date, direct, token);
      if (v3.length > 0) {
        logWarn(`[engine] fetchFromTP: v3 returned ${v3.length} results for ${from}→${to}`);
        return rebrandRoute(v3, from, to);
      }
    }

    // ── Pass 2: month-matrix for prices, then enrich with airline discovery ──
    // month-matrix has broader coverage but no airline codes.
    // We do a separate v3 call WITHOUT a date filter to discover which airlines
    // fly this route, then attach those airlines to each month-matrix result
    // so the cost engine can compare cash vs miles.
    let mmFlights: NormalizedFlight[] = [];
    for (const [o, d] of attempts) {
      const mm = await fetchMonthMatrix(o, d, date, direct, token);
      if (mm.length > 0) {
        logWarn(`[engine] fetchFromTP: month-matrix returned ${mm.length} results for ${from}→${to}`);
        mmFlights = rebrandRoute(mm, from, to);
        break;
      }
    }

    if (mmFlights.length === 0) {
      logWarn(`[engine] fetchFromTP: No results from v3 or month-matrix for ${from}→${to}`);
      return [];
    }

    // Discover airlines operating this route (any date)
    const { discoverRouteAirlines } = await import("./supplements");
    const routeAirlines = await discoverRouteAirlines(attempts, token);

    if (routeAirlines.length > 0) {
      logWarn(`[engine] fetchFromTP: Discovered ${routeAirlines.length} airlines for ${from}→${to}`);
      // Assign discovered airlines to each month-matrix flight.
      // This enables the cost engine to compute miles options.
      for (const f of mmFlights) {
        f.airlines = routeAirlines;
      }
    } else {
      logWarn(`[engine] fetchFromTP: No airlines discovered for ${from}→${to}`);
    }

    return mmFlights;
  } catch (err) {
    logError("[engine] fetch failed:", err);
    return [];
  }
}
