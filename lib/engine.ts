import "server-only";
import { redis } from "./redis";
import { loadPromotions, applyPromotions, type NormalizedFlight } from "./promotions/engine";
import {
  estimateMiles,
  calculateMilesValue,
  getRecommendation,
} from "./milesEngine";
import { optimizeMiles, type OptimizerDecision } from "./optimizer";

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
  // Round-trip additions (Option A: two separate legs)
  tripType: TripType;
  returnPrice?: number;    // per-person return leg price
  returnAirlines?: string[];
  totalPrice?: number;     // (price + returnPrice) × passengers
  // Options echoed back for display
  cabin: Cabin;
  passengers: number;
  // Decision layer
  value: number;           // value per mile in cents
  recommendation: "USE MILES" | "CONSIDER" | "USE CASH";
  optimization: OptimizerDecision;
  savings?: number;        // positive savings only
}

// ─── Travelpayouts fetch ─────────────────────────────────────────────────────

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

  const [year, month] = date.split("-");
  const monthParam = `${year}-${month}`;

  const url = new URL("https://api.travelpayouts.com/v2/prices/month-matrix");
  url.searchParams.set("origin", from.toUpperCase());
  url.searchParams.set("destination", to.toUpperCase());
  url.searchParams.set("month", monthParam);
  url.searchParams.set("currency", "USD");
  url.searchParams.set("show_to_affiliates", "false");
  url.searchParams.set("token", token);
  if (direct) url.searchParams.set("direct", "true");

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      console.error(`[engine] Travelpayouts ${res.status} for ${from}→${to}`);
      return [];
    }

    const json = (await res.json()) as {
      success: boolean;
      data: Array<{
        origin: string;
        destination: string;
        price: number;
        airline: string;
        transfers: number;
        duration: number;
        departure_at: string;
      }>;
    };

    if (!json.success || !Array.isArray(json.data)) return [];

    return json.data.map((f) => ({
      from: f.origin,
      to: f.destination,
      price: f.price,
      airlines: [f.airline],
      duration: f.duration,
      stops: f.transfers,
    }));
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
  returnFlight?: NormalizedFlight
): FlightResult {
  const multiplier = CABIN_MULTIPLIER[cabin];

  // Apply cabin multiplier to base price
  const outboundPrice = Math.round(f.price * multiplier * 100) / 100;
  const returnPrice   = returnFlight
    ? Math.round(returnFlight.price * multiplier * 100) / 100
    : undefined;

  // Total cost for all passengers
  const totalPrice = returnPrice !== undefined
    ? Math.round((outboundPrice + returnPrice) * passengers * 100) / 100
    : Math.round(outboundPrice * passengers * 100) / 100;

  // Miles V2 calc on total trip cost
  const distanceProxy   = totalPrice * 4;
  const estimatedMiles  = estimateMiles(distanceProxy);
  const taxes           = totalPrice * 0.2;
  const calc            = calculateMilesValue({ cashPrice: totalPrice, taxes, milesRequired: estimatedMiles });
  const recommendation  = getRecommendation(calc.valuePerMile);
  const optimization    = optimizeMiles(f.airlines, userPrograms);

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
    value: calc.valuePerMile,
    recommendation,
    optimization,
    totalPrice,
  };

  if (returnPrice !== undefined) {
    result.returnPrice    = returnPrice;
    result.returnAirlines = returnFlight?.airlines;
  }
  if (calc.savings > 0) result.savings = calc.savings;

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
  const cacheKey   = `keza:${from}:${to}:${date}:${tripType}:${returnDate ?? ""}:${stops}:${cabin}:${passengers}`;

  // 1. Cache check
  const cached = await redis.get<FlightResult[]>(cacheKey).catch(() => null);
  if (cached) return cached;

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
    enrich(f, cabin, passengers, userPrograms, tripType, cheapestReturn)
  );

  // Sort: best value first
  results.sort((a, b) => b.value !== a.value ? b.value - a.value : a.totalPrice! - b.totalPrice!);

  // 6. Cache
  await redis.set(cacheKey, results, { ex: 3600 }).catch(() => null);

  return results;
}
