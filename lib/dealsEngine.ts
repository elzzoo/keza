// lib/dealsEngine.ts
// Pure functions — no Redis, no API calls. Testable in isolation.

export type DealRecommendation = "USE_MILES" | "USE_CASH" | "NEUTRAL";

export interface RawDeal {
  from: string;         // IATA code
  to: string;
  cashPrice: number;    // USD
  milesRequired: number;
  program: string;      // "Flying Blue"
  fromFlag: string;     // "🇸🇳"
  toFlag: string;
}

export interface LiveDeal extends RawDeal {
  ratio: number;                    // cents per mile
  recommendation: DealRecommendation;
  multiplier: string;               // "×1.9" — display only
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
  return Math.round((cashPrice * 100 / milesRequired) * 100) / 100;
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
