// ─── CORE ─────────────────────────────────────────────────────────────────────
// Single source of truth for miles value calculation and recommendation logic.

export function estimateMiles(distance: number): number {
  return distance * 10;
}

export function getRecommendation(value: number): "USE MILES" | "CONSIDER" | "USE CASH" {
  if (value > 2) return "USE MILES";
  if (value > 1) return "CONSIDER";
  return "USE CASH";
}

export interface MilesInput {
  cashPrice: number;
  taxes: number;
  milesRequired: number;
}

export interface MilesCalculation {
  valuePerMile: number; // cents per mile
  savings: number;      // positive = miles cheaper than cash; can be negative
}

export function calculateMilesValue(input: MilesInput): MilesCalculation {
  const { cashPrice, taxes, milesRequired } = input;

  // valuePerMile: how many cents each mile is worth for this flight
  const valuePerMile =
    milesRequired > 0 ? ((cashPrice - taxes) / milesRequired) * 100 : 0;

  // savings: cash price minus what miles would cost at market rate (1¢/mile)
  const totalMilesCost = milesRequired * 0.01;
  const savings = cashPrice - (totalMilesCost + taxes);

  return {
    valuePerMile: Math.round(valuePerMile * 100) / 100,
    savings:      Math.round(savings * 100) / 100,
  };
}
