import { parseJsonPromos, type Promotion } from "./parsers";
import { redis } from "@/lib/redis";

export const PROMOS_KEY = "keza:promotions";
// 35-day TTL — cron refreshes every 30 days, giving a 5-day safety window
export const PROMOS_TTL_SECONDS = 35 * 24 * 60 * 60;

export async function loadPromotions(): Promise<Promotion[]> {
  try {
    const raw = await redis.get<unknown[]>(PROMOS_KEY);
    if (!raw || !Array.isArray(raw)) return [];
    return parseJsonPromos(raw);
  } catch {
    console.error("[promotions] failed to load from Redis, returning empty");
    return [];
  }
}

export interface NormalizedFlight {
  from: string;
  to: string;
  price: number;
  airlines: string[];
  duration?: number;
  stops?: number;
  bookingLink?: string;
  /**
   * True for synthetic entries injected via ROUTE_AIRLINE_SUPPLEMENTS —
   * airlines known to fly the route but not indexed by Travelpayouts.
   * The price is an indicative estimate (cheapest available fare on the route).
   * UI must show a "prix indicatif" warning for these flights.
   */
  isSupplemental?: boolean;
}

export function applyPromotions(
  flights: NormalizedFlight[],
  promotions: Promotion[]
): NormalizedFlight[] {
  const now = new Date();
  // Only apply promotions that have not expired
  const activePromos = promotions.filter(
    (p) => !p.validUntil || new Date(p.validUntil) >= now
  );

  return flights.map((f) => {
    let price = f.price;
    for (const promo of activePromos) {
      const airlineMatch = f.airlines.some(
        (a) => a.toLowerCase() === promo.airline.toLowerCase()
      );
      if (!airlineMatch) continue;

      // Check route filter if present
      if (promo.routes && promo.routes.length > 0) {
        const routeKey = `${f.from}-${f.to}`.toUpperCase();
        const reverseKey = `${f.to}-${f.from}`.toUpperCase();
        const routeMatch = promo.routes.some(
          (r) => r.toUpperCase() === routeKey || r.toUpperCase() === reverseKey
        );
        if (!routeMatch) continue;
      }

      price = price * (1 - promo.discount);
    }
    return { ...f, price: Math.round(price * 100) / 100 };
  });
}
