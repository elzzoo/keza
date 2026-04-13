import "server-only";
import { redis } from "./redis";
import { loadPromotions, applyPromotions, type NormalizedFlight } from "./promotions/engine";
import {
  estimateMiles,
  calculateMilesValue,
  getRecommendation,
} from "./milesEngine";
import { optimizeMiles, type OptimizerDecision } from "./optimizer";

export interface SearchParams {
  from: string;
  to: string;
  date: string;                    // YYYY-MM-DD
  userPrograms?: string[];
}

// ─── Public API surface (what the UI receives) ───────────────────────────────
// Keep this minimal. Add fields here only when the UI strictly needs them.
export interface FlightResult {
  // Flight identity
  from: string;
  to: string;
  price: number;
  airlines: string[];
  stops?: number;
  // Decision layer
  value: number;                               // value per mile in cents (e.g. 1.42)
  recommendation: "USE MILES" | "CONSIDER" | "USE CASH";
  optimization: OptimizerDecision;
  savings?: number;                            // USD saved vs cash (omitted if negative)
}

// ─── Travelpayouts fetch ───────────────────────────────────────────────────────

async function fetchFromTravelpayouts(
  from: string,
  to: string,
  date: string
): Promise<NormalizedFlight[]> {
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token || token === "xxx") {
    console.warn("[engine] TRAVELPAYOUTS_TOKEN not configured — returning empty results");
    return [];
  }

  // date format: YYYY-MM → Travelpayouts uses month-level cheapest prices
  const [year, month] = date.split("-");
  const monthParam = `${year}-${month}`;

  const url = new URL("https://api.travelpayouts.com/v2/prices/month-matrix");
  url.searchParams.set("origin", from.toUpperCase());
  url.searchParams.set("destination", to.toUpperCase());
  url.searchParams.set("month", monthParam);
  url.searchParams.set("currency", "USD");
  url.searchParams.set("show_to_affiliates", "false");
  url.searchParams.set("token", token);

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      console.error(`[engine] Travelpayouts error ${res.status}: ${res.statusText}`);
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

// ─── Kiwi/Tequila stub (future integration) ──────────────────────────────────
// async function fetchFromKiwi(from: string, to: string, date: string) {
//   const url = `https://api.tequila.kiwi.com/v2/search?fly_from=${from}&fly_to=${to}&date_from=${date}&date_to=${date}`;
//   const res = await fetch(url, { headers: { apikey: process.env.TEQUILA_API_KEY } });
//   const data = await res.json();
//   return data.data.map((f: { cityFrom: string; cityTo: string; price: number; airlines: string[] }) => ({
//     from: f.cityFrom, to: f.cityTo, price: f.price, airlines: f.airlines,
//   }));
// }

// ─── Main engine ─────────────────────────────────────────────────────────────

export async function searchEngine(params: SearchParams): Promise<FlightResult[]> {
  const { from, to, date, userPrograms = [] } = params;
  const cacheKey = `keza:${from}:${to}:${date}`;

  // 1. Cache check
  const cached = await redis.get<FlightResult[]>(cacheKey).catch(() => null);
  if (cached) return cached;

  // 2. Fetch flights
  const raw = await fetchFromTravelpayouts(from, to, date);

  // 3. Apply promotions
  const promotions = loadPromotions();
  const withPromos = applyPromotions(raw, promotions);

  // 4. Enrich — run full V2 logic internally, expose only the clean API surface
  const results: FlightResult[] = withPromos.map((f) => {
    // V2 internals (never exposed to API consumers)
    const distanceProxy = f.price * 4;
    const estimatedMiles = estimateMiles(distanceProxy);
    const taxes = f.price * 0.2;
    const calc = calculateMilesValue({
      cashPrice: f.price,
      taxes,
      milesRequired: estimatedMiles,
    });
    // breakeven, badge, recommendationColor, savingsPercent used internally only

    // Public recommendation (V1 signature — 3-tier)
    const recommendation = getRecommendation(calc.valuePerMile);

    // Optimizer
    const optimization = optimizeMiles(f.airlines, userPrograms);

    // Build clean public result
    const result: FlightResult = {
      from: f.from,
      to: f.to,
      price: f.price,
      airlines: f.airlines,
      stops: f.stops,
      value: calc.valuePerMile,
      recommendation,
      optimization,
    };
    if (calc.savings > 0) result.savings = calc.savings;
    return result;
  });

  // 5. Cache result
  await redis.set(cacheKey, results, { ex: 3600 }).catch(() => null);

  return results;
}
