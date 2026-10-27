// lib/dealsEngine.ts
// Pure functions — no Redis, no API calls. Testable in isolation.

import { roundPrice } from "./roundPrice";

export type DealRecommendation = "USE_MILES" | "USE_CASH" | "NEUTRAL";
export type DealCashSource = "travelpayouts-month-matrix" | "static-example";

export interface RawDeal {
  from: string;         // IATA code
  to: string;
  cashPrice: number;    // USD
  milesRequired: number;
  program: string;      // "Flying Blue"
  fromFlag: string;     // "🇸🇳"
  toFlag: string;
  cashSource?: DealCashSource;
  cashCheckedAt?: string; // UTC time when Xalifly fetched the supplier's monthly minimum
  cashSearchMonth?: string; // YYYY-MM; not a bookable departure date
}

export interface LiveDeal extends RawDeal {
  ratio: number;                    // cents per mile
  recommendation: DealRecommendation;
  multiplier: string;               // "×1.9" — display only
}

export function dealSearchPath(deal: Pick<RawDeal, "from" | "to">, lang: "fr" | "en"): string {
  const path = lang === "en" ? "/en" : "/";
  return `${path}?${new URLSearchParams({ from: deal.from, to: deal.to })}`;
}

// Thresholds (cents per mile)
const MILES_WIN_THRESHOLD  = 1.5;
const CASH_WIN_THRESHOLD   = 1.0;

/**
 * Returns how many cents of value each mile delivers.
 * ratio = (cashPrice * 100) / milesRequired
 */
export function computeDealRatio(cashPrice: number, milesRequired: number): number {
  if (milesRequired <= 0) return 0;
  return roundPrice(cashPrice * 100 / milesRequired);
}

export function classifyDeal(ratioCpp: number): DealRecommendation {
  if (ratioCpp >= MILES_WIN_THRESHOLD) return "USE_MILES";
  if (ratioCpp < CASH_WIN_THRESHOLD)   return "USE_CASH";
  return "NEUTRAL";
}

export function enrichDeal(raw: RawDeal): LiveDeal {
  const ratio          = computeDealRatio(raw.cashPrice, raw.milesRequired);
  const recommendation = classifyDeal(ratio);
  const multiplier     = `×${ratio.toFixed(1)}`;
  return { ...raw, ratio, recommendation, multiplier };
}

export function dealPriceContext(deal: LiveDeal, lang: "fr" | "en"): string {
  if (deal.cashSource === "static-example") {
    return lang === "fr"
      ? "Exemple illustratif, pas un tarif actuel. Vérifiez les prix pour vos dates."
      : "Illustrative example, not a current fare. Check prices for your dates.";
  }

  if (
    deal.cashSource === "travelpayouts-month-matrix" &&
    typeof deal.cashSearchMonth === "string" &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(deal.cashSearchMonth) &&
    typeof deal.cashCheckedAt === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(deal.cashCheckedAt) &&
    !Number.isNaN(Date.parse(deal.cashCheckedAt))
  ) {
    const checked = deal.cashCheckedAt.slice(0, 10);
    return lang === "fr"
      ? `Minimum mensuel Travelpayouts (${deal.cashSearchMonth}), consulté le ${checked} UTC. Disponibilité à vérifier.`
      : `Travelpayouts monthly minimum (${deal.cashSearchMonth}), checked ${checked} UTC. Check availability.`;
  }

  return lang === "fr"
    ? "Source ou date inconnue. Vérifiez les prix pour vos dates."
    : "Source or date unavailable. Check prices for your dates.";
}

/** Sort: USE_MILES first, then by ratio descending */
export function sortDeals(deals: RawDeal[]): LiveDeal[] {
  return deals
    .map(enrichDeal)
    .sort((a, b) => {
      const rankA = a.recommendation === "USE_MILES" ? 0 : a.recommendation === "NEUTRAL" ? 1 : 2;
      const rankB = b.recommendation === "USE_MILES" ? 0 : b.recommendation === "NEUTRAL" ? 1 : 2;
      if (rankA !== rankB) return rankA - rankB;
      return b.ratio - a.ratio;
    });
}
