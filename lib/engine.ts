import "server-only";
import { redis } from "./redis";
import { loadPromotions, applyPromotions, type NormalizedFlight } from "./promotions/engine";
import { optimizeMiles, type OptimizerDecision } from "./optimizer";
import { buildCostOptions, getEffectivePrices, type FlightInput, type MilesOption } from "./costEngine";
import { iataToAirline } from "./iataAirlines";
import { metroFor } from "./metroCodes";
import { recordObservation } from "./autoCalibrate";
import { fetchFromDuffel } from "./duffelProvider";

// ─── Cabin price multipliers (estimation when API doesn't filter by cabin) ───
const CABIN_MULTIPLIER: Record<Cabin, number> = {
  economy:  1.0,
  premium:  1.8,
  business: 4.0,
  first:    6.5,
};

export type TripType = "oneway" | "roundtrip";
export type Stops    = "any" | "direct" | "with_stops";
export type Cabin    = "economy" | "premium" | "business" | "first";

export interface SearchParams {
  from: string;
  to: string;
  date: string;            // YYYY-MM-DD departure
  returnDate?: string;     // YYYY-MM-DD return leg (roundtrip only)
  tripType?: TripType;     // default "oneway"
  stops?: Stops;           // default "any"
  cabin?: Cabin;           // default "economy"
  passengers?: number;     // default 1
  userPrograms?: string[];
}

// ─── Public API surface ──────────────────────────────────────────────────────
export interface FlightResult {
  from: string;
  to: string;
  price: number;           // per-person outbound price (cabin + promo applied)
  airlines: string[];
  stops?: number;
  duration?: number;
  tripType: TripType;
  returnPrice?: number;
  returnAirlines?: string[];
  totalPrice?: number;     // (price + returnPrice) × passengers
  cabin: Cabin;
  passengers: number;
  bookingLink?: string;    // Travelpayouts deep link (aviasales v3 only)

  // ── Cost comparison ────────────────────────────────────────────────────────
  cashCost: number;                       // total cash price
  milesCost: number;                      // total cost of best miles option
  savings: number;                        // |cashCost - milesCost|
  recommendation: "USE_MILES" | "USE_CASH";
  bestOption: MilesOption | null;         // cheapest miles scenario
  milesOptions: MilesOption[];            // all options for detail view
  explanation: string;                    // human-readable reason
  displayMessage: string;
  disclaimer: string;

  // ── Cabin price accuracy ───────────────────────────────────────────────────
  cabinPriceEstimated: boolean;   // true when price = economy × multiplier (not real cabin price)
  searchId: string;               // UUID per search — used for click tracking

  // ── Extra ──────────────────────────────────────────────────────────────────
  optimization: OptimizerDecision;
  /**
   * True when this flight entry was synthetically injected for an airline
   * known to fly the route but absent from Travelpayouts' index.
   * Price is indicative (derived from cheapest available TP fare).
   * UI must surface a "prix indicatif" disclaimer.
   */
  isSupplemental?: boolean;
}

// ─── Travelpayouts fetch ─────────────────────────────────────────────────────
// Primary:  aviasales/v3/prices_for_dates  — returns airline IATA codes + deep links
// Fallback: v2/prices/month-matrix         — broader coverage, but no airline data
//
// We try the richer endpoint first because the cost engine's miles comparison
// depends on knowing the operating airline. Only when v3 returns zero results
// do we fall back to month-matrix (so users at least see a cash price).

const TP_BASE = "https://api.travelpayouts.com";
const AVIASALES_BASE_URL = "https://www.aviasales.com";
const TP_MARKER = "714947";

async function fetchV3(
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
  url.searchParams.set("token", token);
  if (direct) url.searchParams.set("direct", "true");

  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    console.error(`[engine] aviasales v3 ${res.status} for ${from}→${to}`);
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
    const day = f.departure_at?.slice(0, 10) ?? "";
    const key = `${f.airline}::${day}`;
    const existing = seen.get(key);
    if (!existing || f.price < existing.price) seen.set(key, f);
  }

  return Array.from(seen.values())
    .filter((f) => f.price >= MIN_REALISTIC_PRICE_USD)   // drop data artifacts
    .slice(0, 15)
    .map((f) => {
      const flight: NormalizedFlight = {
        from,
        to,
        price: f.price,
        airlines: [iataToAirline(f.airline)],
        stops: f.transfers ?? 0,
      };
      if (f.duration && f.duration > 0) flight.duration = f.duration;
      if (f.link) flight.bookingLink = `${AVIASALES_BASE_URL}${f.link}&marker=${TP_MARKER}`;
      return flight;
    });
}

async function fetchMonthMatrix(
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
  url.searchParams.set("token", token);
  if (direct) url.searchParams.set("direct", "true");

  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 },
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    console.error(`[engine] month-matrix ${res.status} for ${from}→${to}`);
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

// Minimum realistic price for any international route (USD).
// Travelpayouts occasionally surfaces promotional micro-fares ($1–$10) that
// are data artifacts or expired flash deals — they skew the "best price" tile
// and make the miles comparison misleading. Anything below this is discarded.
const MIN_REALISTIC_PRICE_USD = 30;

/**
 * Rewrite a NormalizedFlight's from/to back to the airport codes the user
 * asked for, AND fix booking-link URLs that Travelpayouts built using the
 * metro-code fallback (e.g. DKR instead of DSS, PAR instead of CDG).
 */
function rebrandRoute(flights: NormalizedFlight[], from: string, to: string): NormalizedFlight[] {
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

// ─── Static airline supplements ──────────────────────────────────────────────
// Travelpayouts doesn't index many African/regional carriers (Air Senegal,
// Transair, etc.) because they don't distribute through GDS/OTAs.
// This map injects known carriers for specific routes so the cost engine can
// show the right miles programs (e.g. Flying Blue for Air France partner routes).
//
// Key format: "ORIGIN-DEST" (canonical, uppercase). Both directions are listed.
// Values are airline NAMES (as used in iataAirlines.ts / alliances.ts).
// DO NOT add carriers you're unsure about — better to under-report than mislead.
const ROUTE_AIRLINE_SUPPLEMENTS: Record<string, string[]> = {
  // West Africa ↔ Europe
  "DSS-CDG": ["Air Senegal", "Air France", "Corsair"],
  "CDG-DSS": ["Air Senegal", "Air France", "Corsair"],
  "DSS-LHR": ["Air Senegal"],
  "LHR-DSS": ["Air Senegal"],

  "LOS-CDG": ["Air France"],
  "CDG-LOS": ["Air France"],
  "LOS-LHR": ["British Airways"],
  "LHR-LOS": ["British Airways"],
  "LOS-FRA": ["Lufthansa"],
  "FRA-LOS": ["Lufthansa"],

  "ABJ-CDG": ["Air France"],
  "CDG-ABJ": ["Air France"],
  "ACC-LHR": ["British Airways"],
  "LHR-ACC": ["British Airways"],
  "CMN-CDG": ["Royal Air Maroc", "Air France"],
  "CDG-CMN": ["Royal Air Maroc", "Air France"],

  // East / Southern Africa ↔ Europe
  "NBO-LHR": ["British Airways", "Kenya Airways"],
  "LHR-NBO": ["British Airways", "Kenya Airways"],
  "NBO-CDG": ["Air France", "Kenya Airways"],
  "CDG-NBO": ["Air France", "Kenya Airways"],
  "JNB-LHR": ["British Airways", "South African Airways"],
  "LHR-JNB": ["British Airways", "South African Airways"],
  "ADD-CDG": ["Ethiopian Airlines", "Air France"],
  "CDG-ADD": ["Ethiopian Airlines", "Air France"],

  // West Africa ↔ North America (often via European hubs)
  "DSS-JFK": ["Air Senegal", "Air France"],
  "JFK-DSS": ["Air Senegal", "Air France"],
  "LOS-JFK": ["United"],
  "JFK-LOS": ["United"],
};

/**
 * Discover airlines that operate a route by querying v3 WITHOUT a date filter.
 * Merges Travelpayouts data with static supplements for routes with poor GDS coverage
 * (primarily African carriers that don't distribute through OTAs).
 */
async function discoverRouteAirlines(
  attempts: Array<[string, string]>,
  token: string
): Promise<string[]> {
  // Check static supplements first (keyed by first attempt = canonical code pair)
  const [primaryFrom, primaryTo] = attempts[0] ?? ["", ""];
  const supplementKey = `${primaryFrom.toUpperCase()}-${primaryTo.toUpperCase()}`;
  const supplements = ROUTE_AIRLINE_SUPPLEMENTS[supplementKey] ?? [];

  for (const [o, d] of attempts) {
    const url = new URL(`${TP_BASE}/aviasales/v3/prices_for_dates`);
    url.searchParams.set("origin", o.toUpperCase());
    url.searchParams.set("destination", d.toUpperCase());
    url.searchParams.set("currency", "usd");
    url.searchParams.set("sorting", "price");
    url.searchParams.set("unique", "true");   // one per airline
    url.searchParams.set("limit", "10");
    url.searchParams.set("token", token);

    try {
      const res = await fetch(url.toString(), {
        next: { revalidate: 86400 },          // cache 24h — airline roster changes slowly
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { data?: Array<{ airline: string }> };
      if (Array.isArray(json.data) && json.data.length > 0) {
        const fromApi = json.data.map((f) => iataToAirline(f.airline));
        // Merge API result with supplements — deduplicated, supplements appended
        const merged = Array.from(new Set([...fromApi, ...supplements]));
        return merged;
      }
    } catch { /* try next attempt pair */ }
  }

  // Travelpayouts returned nothing — return supplements only so the cost engine
  // can still compute miles options for the known carriers on this route.
  return supplements;
}

async function fetchFromTravelpayouts(
  from: string,
  to: string,
  date: string,
  direct: boolean
): Promise<NormalizedFlight[]> {
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token || token === "xxx") {
    console.warn("[engine] TRAVELPAYOUTS_TOKEN not configured — returning empty results");
    return [];
  }

  // Candidate (origin, destination) pairs to try in order. We always start with
  // the exact codes the user asked for, then fall back to metro codes so that
  // DSS→JFK retries as DKR→NYC (which is how most carriers index that route).
  const fromMetro = metroFor(from);
  const toMetro   = metroFor(to);
  const attempts: Array<[string, string]> = [[from, to]];
  if (fromMetro) attempts.push([fromMetro, to]);
  if (toMetro)   attempts.push([from, toMetro]);
  if (fromMetro && toMetro) attempts.push([fromMetro, toMetro]);

  try {
    // ── Pass 1: v3 with exact month — best data (airline + deep links + price) ──
    for (const [o, d] of attempts) {
      const v3 = await fetchV3(o, d, date, direct, token);
      if (v3.length > 0) return rebrandRoute(v3, from, to);
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
        mmFlights = rebrandRoute(mm, from, to);
        break;
      }
    }

    if (mmFlights.length === 0) return [];

    // Discover airlines operating this route (any date)
    const routeAirlines = await discoverRouteAirlines(attempts, token);

    if (routeAirlines.length > 0) {
      // Assign discovered airlines to each month-matrix flight.
      // This enables the cost engine to compute miles options.
      for (const f of mmFlights) {
        f.airlines = routeAirlines;
      }
    }

    return mmFlights;
  } catch (err) {
    console.error("[engine] fetch failed:", err);
    return [];
  }
}

// ─── Calendar / flexible dates ──────────────────────────────────────────────

export interface CalendarDay {
  date: string;      // YYYY-MM-DD
  price: number;     // cheapest price USD
  stops: number;
  duration?: number;
}

/**
 * Fetch price-per-day for an entire month.
 * Used by the calendar/flexible-dates UI — returns ALL days, not top 15.
 */
async function fetchMonthMatrixFull(
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
  url.searchParams.set("token", token);
  if (direct) url.searchParams.set("direct", "true");

  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 },
    headers: { Accept: "application/json" },
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
async function fetchV3Calendar(
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
  url.searchParams.set("token", token);
  if (direct) url.searchParams.set("direct", "true");

  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 },
    headers: { Accept: "application/json" },
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
 */
export async function fetchCalendarPrices(
  from: string,
  to: string,
  date: string
): Promise<CalendarDay[]> {
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token || token === "xxx") return [];

  const fromMetro = metroFor(from);
  const toMetro   = metroFor(to);
  const attempts: Array<[string, string]> = [[from, to]];
  if (fromMetro) attempts.push([fromMetro, to]);
  if (toMetro)   attempts.push([from, toMetro]);
  if (fromMetro && toMetro) attempts.push([fromMetro, toMetro]);

  // Try v3 first
  for (const [o, d] of attempts) {
    const v3 = await fetchV3Calendar(o, d, date, false, token);
    if (v3.length > 0) return v3;
  }

  // Fallback to month-matrix
  for (const [o, d] of attempts) {
    const mm = await fetchMonthMatrixFull(o, d, date, false, token);
    if (mm.length > 0) return mm;
  }

  return [];
}

/**
 * Merge NormalizedFlight arrays from multiple providers.
 * Deduplicates by (sorted airlines, stops), keeping the cheapest price per pairing.
 * Preserves booking links from the first provider that has them (Travelpayouts).
 */
function mergeFlights(primary: NormalizedFlight[], secondary: NormalizedFlight[]): NormalizedFlight[] {
  const all = [...primary, ...secondary];
  if (all.length === 0) return [];

  const best = new Map<string, NormalizedFlight>();
  for (const f of all) {
    const key = `${[...f.airlines].sort().join(",")}::${f.stops ?? 0}`;
    const existing = best.get(key);
    if (!existing) {
      best.set(key, f);
    } else if (f.price < existing.price) {
      // Keep booking link from the existing entry if the cheaper one doesn't have one
      const merged: NormalizedFlight = {
        ...f,
        bookingLink: f.bookingLink ?? existing.bookingLink,
      };
      best.set(key, merged);
    }
  }

  return Array.from(best.values());
}

// ─── Filter by stops preference ──────────────────────────────────────────────

function filterByStops(flights: NormalizedFlight[], stops: Stops): NormalizedFlight[] {
  if (stops === "any") return flights;
  if (stops === "direct") return flights.filter((f) => (f.stops ?? 0) === 0);
  return flights.filter((f) => (f.stops ?? 0) > 0);
}

// ─── Enrich a single flight into a FlightResult ──────────────────────────────

function enrich(
  f: NormalizedFlight,
  cabin: Cabin,
  passengers: number,
  userPrograms: string[],
  tripType: TripType,
  effectivePrices: Map<string, number>,
  returnFlight?: NormalizedFlight,
  searchDate?: string,
  returnDate?: string,
): FlightResult {
  const multiplier = CABIN_MULTIPLIER[cabin];

  const outboundPrice = Math.round(f.price * multiplier * 100) / 100;
  const returnPrice   = returnFlight
    ? Math.round(returnFlight.price * multiplier * 100) / 100
    : undefined;

  const totalPrice = returnPrice !== undefined
    ? Math.round((outboundPrice + returnPrice) * passengers * 100) / 100
    : Math.round(outboundPrice * passengers * 100) / 100;

  const flightInput: FlightInput = {
    from: f.from,
    to: f.to,
    totalPrice,
    airlines: f.airlines,
    stops: f.stops ?? 0,
    cabin,
    tripType,
    passengers,
  };

  const comparison  = buildCostOptions(flightInput, effectivePrices);

  // DEBUG — remove once production activation confirmed (set KEZA_DEBUG_PROGRAMS=1)
  if (process.env.KEZA_DEBUG_PROGRAMS === "1") {
    const programs = comparison.milesOptions.map(o => `${o.program}(${o.type})`).join(", ");
    console.log(`[KEZA_DEBUG] ${f.from}→${f.to} | airlines:${f.airlines.join("+")} | programs:[${programs}]`);
  }

  const optimization = optimizeMiles(f.airlines, userPrograms);

  const result: FlightResult = {
    from: f.from,
    to: f.to,
    price: outboundPrice,
    airlines: f.airlines,
    stops: f.stops,
    duration: f.duration,
    tripType,
    cabin,
    passengers,
    totalPrice,
    cashCost:            comparison.cashCost,
    milesCost:           comparison.milesCost,
    savings:             comparison.savings,
    recommendation:      comparison.recommendation,
    bestOption:          comparison.bestOption,
    milesOptions:        comparison.milesOptions,
    explanation:         comparison.explanation,
    displayMessage:      comparison.displayMessage,
    disclaimer:          comparison.disclaimer,
    cabinPriceEstimated: cabin !== "economy",
    searchId:            "",   // filled by caller; placeholder here
    optimization,
  };

  if (f.isSupplemental) result.isSupplemental = true;

  if (returnPrice !== undefined) {
    result.returnPrice    = returnPrice;
    result.returnAirlines = returnFlight?.airlines;
  }

  if (tripType === "roundtrip" && searchDate && returnDate && f.from && f.to) {
    // Round-trip: always build a proper RT Aviasales search URL.
    // TP v3 deep links are per-leg (one-way); they don't encode the return segment,
    // so they open a one-way search and confuse users. The RT search URL correctly
    // shows combined outbound + return itineraries.
    // Format: {FROM}{DEPART_DATE}{TO}{RETURN_DATE}{FROM}{PAX}
    // Example: DSS20260610CDG20260617DSS1
    const departureDateCompact = searchDate.replace(/-/g, "");
    const returnDateCompact    = returnDate.replace(/-/g, "");
    result.bookingLink = `${AVIASALES_BASE_URL}/search/${f.from}${departureDateCompact}${f.to}${returnDateCompact}${f.from}${passengers}?marker=${TP_MARKER}`;
  } else if (f.bookingLink) {
    result.bookingLink = f.bookingLink;
  } else if (searchDate && f.from && f.to) {
    // One-way fallback: build Aviasales search link
    const dateCompact = searchDate.replace(/-/g, "");
    result.bookingLink = `${AVIASALES_BASE_URL}/search/${f.from}${dateCompact}${f.to}${passengers ?? 1}?marker=${TP_MARKER}`;
  }

  return result;
}

// ─── Main engine ─────────────────────────────────────────────────────────────

export async function searchEngine(params: SearchParams): Promise<FlightResult[]> {
  const {
    from, to, date,
    returnDate,
    tripType    = "oneway",
    stops       = "any",
    cabin       = "economy",
    passengers  = 1,
    userPrograms = [],
  } = params;

  const directOnly = stops === "direct";
  // v2 prefix: bumped when we moved to aviasales/v3 endpoint (airline data + booking links).
  // Bump this again whenever the FlightResult shape changes to avoid serving stale cached results.
  const cacheKey   = `keza:v14:${from}:${to}:${date}:${tripType}:${returnDate ?? ""}:${stops}:${cabin}:${passengers}`;

  // 1. Cache check
  const cached = await redis.get<FlightResult[]>(cacheKey).catch(() => null);
  if (cached) return cached;

  // Fetch effective miles prices once (Redis → static fallback)
  const effectivePrices = await getEffectivePrices().catch(() => {
    // If Redis is unreachable and static fallback also fails, use empty map
    // buildCostOptions will still work — it falls back to acquisition cost = 0
    return new Map<string, number>();
  });

  // 2. Fetch outbound flights — Travelpayouts + Duffel in parallel
  //    When stops=any, also try a direct-only TP fetch to catch nonstops that the
  //    main query sometimes misses (Travelpayouts may rank them lower than
  //    connections priced cheaper). Merge & dedupe by airline+stops.
  const [tpOutbound, duffelOutbound] = await Promise.all([
    fetchFromTravelpayouts(from, to, date, directOnly),
    fetchFromDuffel(from, to, date, cabin, passengers).catch((): NormalizedFlight[] => []),
  ]);
  const rawOutbound = mergeFlights(tpOutbound, duffelOutbound);

  // ── Inject synthetic entries for supplement airlines missing from providers ──
  // Airlines in ROUTE_AIRLINE_SUPPLEMENTS are known to fly this route but not
  // indexed by Travelpayouts (e.g. Air Senegal on DSS→CDG). We create a
  // placeholder entry so the cost engine can show the correct miles programs
  // and the UI can surface "Vol direct disponible" for these carriers.
  // The price is set to the cheapest available TP fare as an indicative floor.
  // FlightCard shows a "prix indicatif" warning for isSupplemental=true entries.
  {
    const suppKey = `${from}-${to}`;
    const suppAirlines = ROUTE_AIRLINE_SUPPLEMENTS[suppKey] ?? [];
    const coveredAirlines = new Set(rawOutbound.flatMap(f => f.airlines));
    const cheapestPrice = rawOutbound.length > 0
      ? Math.min(...rawOutbound.map(f => f.price))
      : 0;
    if (cheapestPrice > 0) {
      for (const airline of suppAirlines) {
        if (!coveredAirlines.has(airline)) {
          rawOutbound.push({ from, to, price: cheapestPrice, airlines: [airline], stops: 0, isSupplemental: true });
        }
      }
    }
  }

  if (!directOnly && rawOutbound.every(f => (f.stops ?? 0) > 0)) {
    // No direct flights in the merged results — try explicit direct TP search
    const directFlights = await fetchFromTravelpayouts(from, to, date, true);
    if (directFlights.length > 0) {
      // Prepend direct flights (they're more valuable to the user)
      const existingKeys = new Set(rawOutbound.map(f => `${f.airlines.join(",")}:${f.stops}`));
      for (const df of directFlights) {
        const key = `${df.airlines.join(",")}:${df.stops}`;
        if (!existingKeys.has(key)) {
          rawOutbound.unshift(df);
          existingKeys.add(key);
        }
      }
    }
  }

  const outbound = filterByStops(rawOutbound, stops);

  // 3. Fetch return flights (two separate legs) — Travelpayouts + Duffel in parallel
  let returnFlights: NormalizedFlight[] = [];
  if (tripType === "roundtrip" && returnDate) {
    const [tpReturn, duffelReturn] = await Promise.all([
      fetchFromTravelpayouts(to, from, returnDate, directOnly),
      fetchFromDuffel(to, from, returnDate, cabin, passengers).catch((): NormalizedFlight[] => []),
    ]);
    const rawReturn = mergeFlights(tpReturn, duffelReturn);

    // Same direct-flight recovery for return leg (TP only — Duffel already included all)
    if (!directOnly && rawReturn.every(f => (f.stops ?? 0) > 0)) {
      const directReturn = await fetchFromTravelpayouts(to, from, returnDate, true);
      if (directReturn.length > 0) {
        const existingKeys = new Set(rawReturn.map(f => `${f.airlines.join(",")}:${f.stops}`));
        for (const df of directReturn) {
          const key = `${df.airlines.join(",")}:${df.stops}`;
          if (!existingKeys.has(key)) {
            rawReturn.unshift(df);
            existingKeys.add(key);
          }
        }
      }
    }

    returnFlights = filterByStops(rawReturn, stops);
  }

  // 4. Apply promotions
  const promotions     = await loadPromotions();
  const withPromos     = applyPromotions(outbound, promotions);
  const returnWithPromos = returnFlights.length
    ? applyPromotions(returnFlights, promotions)
    : [];

  // 5. Pair outbound + cheapest return, enrich
  const cheapestReturn = returnWithPromos.length
    ? returnWithPromos.reduce((best, f) => (f.price < best.price ? f : best))
    : undefined;

  const searchId = crypto.randomUUID();
  const results: FlightResult[] = withPromos.map((f) => {
    const r = enrich(f, cabin, passengers, userPrograms, tripType, effectivePrices, cheapestReturn, date, returnDate);
    r.searchId = searchId;
    return r;
  });

  // Sort: best effective cost first (what the user actually pays, cash OR miles).
  // Cash-only flights (no miles option) rank by their cash price — they are NOT
  // pushed to the bottom. A cheap cash-only Air Senegal flight ranks above an
  // expensive miles redemption when it genuinely costs less.
  const effectiveCost = (r: FlightResult) =>
    r.milesCost > 0 ? Math.min(r.cashCost, r.milesCost) : r.cashCost;
  results.sort((a, b) => {
    const diff = effectiveCost(a) - effectiveCost(b);
    return diff !== 0 ? diff : (a.totalPrice ?? 0) - (b.totalPrice ?? 0);
  });

  // 5b. Auto-calibrate: record observations for self-learning mile values
  // Fire-and-forget — never block the response
  Promise.allSettled(
    results.map((r) => {
      if (!r.bestOption || r.cashCost <= 0) return Promise.resolve();
      return recordObservation(
        r.bestOption.program,
        r.cashCost,
        r.bestOption.taxes,
        r.bestOption.milesRequired,
        `${from}-${to}`,
        cabin
      );
    })
  ).catch(() => null);

  // 6. Cache
  await redis.set(cacheKey, results, { ex: 3600 }).catch(() => null);

  return results;
}
