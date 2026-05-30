// lib/mileValue.ts
//
// Achieved CPP (cents per mile) for a specific redemption — for DISPLAY only.
//
// IMPORTANT: Do NOT use getAchievedCpp() to compute totalMilesCost in buildOption().
// Opportunity cost must stay flat (market rate from milesPrices.ts) regardless of
// cabin or route length — the formula `savings = cashTotal - (milesRequired × marketRate + taxes)`
// already reflects higher savings on premium cabins because cashTotal is higher.
//
// This module answers a different question: "How many ¢ of flight value did I get
// per mile burned?" — a quality signal for the user, not a cost signal for the engine.

/**
 * Compute the CPP (cents per mile) actually achieved on this redemption.
 *
 * Formula: (cashCost / milesRequired) × 100
 * Example: $4,000 business / 90,000 KrisFlyer miles = 4.44 ¢/mile
 *
 * @param cashCost      - USD cash price of the equivalent flight
 * @param milesRequired - Miles burned for this award redemption
 * @returns             - Achieved CPP in cents, 2 decimal places (0 if inputs invalid)
 */
export function getAchievedCpp(cashCost: number, milesRequired: number): number {
  if (milesRequired <= 0 || cashCost <= 0) return 0;
  return Math.round((cashCost / milesRequired) * 100 * 100) / 100;
}

/**
 * Rate the quality of a redemption relative to the program's market value.
 *
 * @param achievedCpp  - CPP from getAchievedCpp()
 * @param marketCpp    - Program's market rate (from milesPrices.ts, via bestOption.valuePerMile)
 * @returns            - Quality label for display
 */
export type CppRating = "excellent" | "good" | "fair" | "poor";

export function rateCpp(achievedCpp: number, marketCpp: number): CppRating {
  if (marketCpp <= 0 || achievedCpp <= 0) return "fair";
  const ratio = achievedCpp / marketCpp;
  if (ratio >= 2.0) return "excellent"; // ≥2× market rate — classic sweet spot
  if (ratio >= 1.4) return "good";      // ≥1.4× market rate — solid redemption
  if (ratio >= 0.9) return "fair";      // near market rate — acceptable
  return "poor";                         // below market rate — hold miles for better deal
}

/** UI labels and colors for each rating */
export const CPP_RATING_DISPLAY: Record<CppRating, {
  fr: string; en: string; color: string;
}> = {
  excellent: { fr: "Excellent",  en: "Excellent",  color: "text-success" },
  good:      { fr: "Bon",        en: "Good",        color: "text-blue-400" },
  fair:      { fr: "Correct",    en: "Fair",        color: "text-muted" },
  poor:      { fr: "Faible",     en: "Poor",        color: "text-warning" },
};
