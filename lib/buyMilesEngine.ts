// lib/buyMilesEngine.ts
// Public API for querying "buy miles" options.
// Core logic lives in lib/milesAcquisition.ts.

import { calculateAcquisitionCost, type AcquisitionResult, type AcquisitionPath } from "./milesAcquisition";

export type { AcquisitionResult, AcquisitionPath };

export interface BuyOption {
  program: string;
  milesNeeded: number;
  source: string;          // "airline direct" or bank name
  costUsd: number;         // total cost to acquire
  costPer1000: number;     // USD per 1K miles
  isGoodDeal: boolean;     // costUsd < redemptionValueUsd
  note?: string;
}

/** Get all ways to BUY miles for a given program and quantity needed. */
export function getBuyOptions(program: string, milesNeeded: number): BuyOption[] {
  const result = calculateAcquisitionCost(program, milesNeeded);
  return result.paths.map((path) => ({
    program,
    milesNeeded,
    source:      path.source,
    costUsd:     path.costUsd,
    costPer1000: path.costPer1000,
    isGoodDeal:  result.valueRatio !== null && result.valueRatio > 1,
    note:        path.note,
  }));
}

/** Effective cost per mile after applying a purchase bonus (e.g. 100% promo). */
export function effectiveCostPerMile(basePricePer1000: number, bonusPercent: number): number {
  return basePricePer1000 / (1 + bonusPercent / 100) / 1000;
}
