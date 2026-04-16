import "server-only";
import { redis } from "./redis";
import { loadPromotions, applyPromotions, type NormalizedFlight } from "./promotions/engine";
import { optimizeMiles, type OptimizerDecision } from "./optimizer";
import { buildCostOptions, getEffectivePrices, type FlightInput, type MilesOption } from "./costEngine";
import { iataToAirline } from "./iataAirlines";

// ─── Cabin price multipliers (estimation when API doesn't filter by cabin) ───
const CABIN_MULTIPLIER: Record<Cabin, number> = {
  economy:  1.0,
  premium:  1.6,
  business: 2.5,
  first:    4.0,
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
  cashTotal: number;
  milesOptions: MilesOption[];
  bestOwnedOption: MilesOption | null;
  bestPurchasedOption: MilesOption | null;
  recommendation: "MILES_WIN" | "MILES_IF_OWNED" | "CASH_WINS";
  savings: number;

  // ── Sorting + backwards compat ────────────────────────────────────────────
  value: number;           // cents per 100 miles (owned savings) — used for sorting
  optimization: OptimizerDecision;
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
      if (f.link) flight.bookingLink = `${AVIASALES_BASE_URL}${f.link}`;
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

  try {
    const v3 = await fetchV3(from, to, date, direct, token);
    if (v3.length > 0) return v3;

    // v3 empty → try month-matrix (no airline data but keeps at least a cash price visible)
    return await fetchMonthMatrix(from, to, date, direct, token);
  } catch (err) {
    console.error("[engine] fetch failed:", err);
    return [];
  }
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
  returnFlight?: NormalizedFlight
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
    cashTotal:           comparison.cashTotal,
    milesOptions:        comparison.milesOptions,
    bestOwnedOption:     comparison.bestOwnedOption,
    bestPurchasedOption: comparison.bestPurchasedOption,
    recommendation:      comparison.recommendation,
    savings:             comparison.savings,
    value:               comparison.value,
    optimization,
  };

  if (returnPrice !== undefined) {
    result.returnPrice    = returnPrice;
    result.returnAirlines = returnFlight?.airlines;
  }

  if (f.bookingLink) result.bookingLink = f.bookingLink;

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
  const cacheKey   = `keza:v2:${from}:${to}:${date}:${tripType}:${returnDate ?? ""}:${stops}:${cabin}:${passengers}`;

  // 1. Cache check
  const cached = await redis.get<FlightResult[]>(cacheKey).catch(() => null);
  if (cached) return cached;

  // Fetch effective miles prices once (Redis → static fallback)
  const effectivePrices = await getEffectivePrices().catch(() => {
    // If Redis is unreachable and static fallback also fails, use empty map
    // buildCostOptions will still work — it falls back to acquisition cost = 0
    return new Map<string, number>();
  });

  // 2. Fetch outbound flights
  const rawOutbound = await fetchFromTravelpayouts(from, to, date, directOnly);
  const outbound    = filterByStops(rawOutbound, stops);

  // 3. Fetch return flights (Option A — two separate calls)
  let returnFlights: NormalizedFlight[] = [];
  if (tripType === "roundtrip" && returnDate) {
    const rawReturn = await fetchFromTravelpayouts(to, from, returnDate, directOnly);
    returnFlights   = filterByStops(rawReturn, stops);
  }

  // 4. Apply promotions
  const promotions     = loadPromotions();
  const withPromos     = applyPromotions(outbound, promotions);
  const returnWithPromos = returnFlights.length
    ? applyPromotions(returnFlights, promotions)
    : [];

  // 5. Pair outbound + cheapest return, enrich
  const cheapestReturn = returnWithPromos.length
    ? returnWithPromos.reduce((best, f) => (f.price < best.price ? f : best))
    : undefined;

  const results: FlightResult[] = withPromos.map((f) =>
    enrich(f, cabin, passengers, userPrograms, tripType, effectivePrices, cheapestReturn)
  );

  // Sort: best value first
  results.sort((a, b) => b.value !== a.value ? b.value - a.value : a.totalPrice! - b.totalPrice!);

  // 6. Cache
  await redis.set(cacheKey, results, { ex: 3600 }).catch(() => null);

  return results;
}
