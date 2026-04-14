import fs from "fs";
import path from "path";
import { parseJsonPromos, type Promotion } from "./parsers";

export function loadPromotions(): Promotion[] {
  try {
    const filePath = path.join(process.cwd(), "data", "promotions.json");
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown[];
    return parseJsonPromos(raw);
  } catch {
    console.error("[promotions] failed to load promotions.json, returning empty");
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
