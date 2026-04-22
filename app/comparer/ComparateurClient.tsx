"use client";

import { DESTINATIONS } from "@/data/destinations";
import { computeDealRatio, classifyDeal } from "@/lib/dealsEngine";
import { getMonthlyPrices } from "@/lib/priceHistory";
import type { DealRecommendation } from "@/lib/dealsEngine";

// ─── Constants ──────────────────────────────────────────────────────────────

const REC_COLORS: Record<DealRecommendation, string> = {
  USE_MILES: "#3b82f6",
  NEUTRAL:   "#10b981",
  USE_CASH:  "#f59e0b",
};

const REC_LABELS_FR: Record<DealRecommendation, string> = {
  USE_MILES: "MILES ✓",
  NEUTRAL:   "NEUTRE ~",
  USE_CASH:  "CASH ✗",
};

const REC_LABELS_EN: Record<DealRecommendation, string> = {
  USE_MILES: "MILES ✓",
  NEUTRAL:   "NEUTRAL ~",
  USE_CASH:  "CASH ✗",
};

// ─── Pure function (exported for tests) ─────────────────────────────────────

export function buildComparisonData(iatas: string[]) {
  return iatas
    .map((iata) => {
      const dest = DESTINATIONS.find((d) => d.iata === iata.toUpperCase());
      if (!dest) return null;
      const cpm = computeDealRatio(dest.cashEstimateUsd, dest.milesEstimate);
      const recommendation = classifyDeal(cpm);
      const history = getMonthlyPrices(dest);
      const bestLabels = history.bestMonths.map((i) => history.monthlyPrices[i].monthLabel);
      return { dest, cpm, recommendation, bestLabels };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

// ─── Component (stub — full implementation in Task 2) ────────────────────────

export function ComparateurClient() {
  return null;
}
