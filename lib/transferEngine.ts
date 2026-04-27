// lib/transferEngine.ts
// Public API for querying transfer partner relationships.
// Underlying data lives in data/transferBonuses.ts.

import { TRANSFER_BONUSES, getEffectiveRatio, type TransferBonusRecord } from "@/data/transferBonuses";

export type { TransferBonusRecord };
export { getEffectiveRatio };

export interface TransferOption {
  from: string;         // source currency (e.g. "Amex MR")
  to: string;           // destination program
  effectiveRatio: number;  // 1.0 = 1:1, 1.25 = 25% bonus
  isPromo: boolean;
  transferTime: string;
  /** milesRequired / effectiveRatio = source points needed */
  pointsNeeded: (milesRequired: number) => number;
}

/** Get all transfer options that can earn miles in a given program. */
export function getTransferOptionsForProgram(program: string): TransferOption[] {
  return TRANSFER_BONUSES
    .filter((b) => b.to === program)
    .map((b) => {
      const ratio = getEffectiveRatio(b);
      const isPromo = !!b.promoRatio && ratio > b.baseRatio;
      return {
        from: b.from,
        to: b.to,
        effectiveRatio: ratio,
        isPromo,
        transferTime: b.transferTime,
        pointsNeeded: (milesRequired: number) => Math.ceil(milesRequired / ratio),
      };
    });
}

/** Compute how many source points are needed given a transfer ratio and bonus. */
export function effectivePointsNeeded(milesRequired: number, ratio: number): number {
  return Math.ceil(milesRequired / ratio);
}
