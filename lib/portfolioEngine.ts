// lib/portfolioEngine.ts
// Pure function: checks whether a user can afford a flight using their miles/points portfolio.
// No side effects, no API calls, no external dependencies beyond data and types.

import type { MilesOption } from "./costEngine";
import { TRANSFER_BONUSES, getEffectiveRatio } from "@/data/transferBonuses";

// ─── Return types ─────────────────────────────────────────────────────────────

export type PortfolioStatus =
  | { type: "CAN_AFFORD";   program: string; milesNeeded: number; balanceAfter: number }
  | { type: "CAN_TRANSFER"; program: string; milesNeeded: number; shortfall: number;
      transferFrom: string; transferAmount: number; transferRatio: number }
  | { type: "CANT_AFFORD";  bestProgram: string; milesNeeded: number; shortfall: number }
  | { type: "NO_PORTFOLIO" }

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Check whether the user can afford any of the provided miles options.
 *
 * @param milesOptions  Sorted cheapest-first (caller responsibility — search API does this)
 * @param balances      Miles balances per loyalty program, e.g. { "Flying Blue": 45000 }
 * @param bankPoints    Transferable bank points, e.g. { "Amex MR": 80000 }
 * @returns             PortfolioStatus discriminated union
 */
export function checkPortfolio(
  milesOptions: MilesOption[],
  balances: Record<string, number>,
  bankPoints: Record<string, number>,
): PortfolioStatus {

  // ── Step 1: Empty guard ────────────────────────────────────────────────────
  // If the user has entered no data at all (all zeros or empty), there's nothing to evaluate.
  const hasAnyPoints =
    Object.values(balances).some(v => v > 0) ||
    Object.values(bankPoints).some(v => v > 0);

  if (!hasAnyPoints || milesOptions.length === 0) {
    return { type: "NO_PORTFOLIO" };
  }

  // ── Step 2: Direct check ───────────────────────────────────────────────────
  // Iterate cheapest-first; return the first program the user can directly afford.
  for (const option of milesOptions) {
    const balance = balances[option.program] ?? 0;
    if (balance >= option.milesRequired) {
      return {
        type: "CAN_AFFORD",
        program: option.program,
        milesNeeded: option.milesRequired,
        balanceAfter: balance - option.milesRequired,
      };
    }
  }

  // ── Step 3: Transfer check ─────────────────────────────────────────────────
  // Find the option with the smallest shortfall (best candidate for a top-up).
  let bestOption = milesOptions[0];
  let bestShortfall = bestOption.milesRequired - (balances[bestOption.program] ?? 0);

  for (const option of milesOptions) {
    const shortfall = option.milesRequired - (balances[option.program] ?? 0);
    if (shortfall < bestShortfall) {
      bestShortfall = shortfall;
      bestOption = option;
    }
  }

  // Search TRANSFER_BONUSES for a bank currency that can cover the shortfall.
  for (const bonus of TRANSFER_BONUSES) {
    if (bonus.to !== bestOption.program) continue;

    const ratio = getEffectiveRatio(bonus);
    // Points needed = ceil(shortfall / ratio)  — because 1 bank point → ratio miles
    const pointsNeeded = Math.ceil(bestShortfall / ratio);
    const available = bankPoints[bonus.from] ?? 0;

    if (available >= pointsNeeded) {
      return {
        type: "CAN_TRANSFER",
        program: bestOption.program,
        milesNeeded: bestOption.milesRequired,
        shortfall: bestShortfall,
        transferFrom: bonus.from,
        transferAmount: pointsNeeded,
        transferRatio: ratio,
      };
    }
  }

  // ── Step 4: Fallback ───────────────────────────────────────────────────────
  return {
    type: "CANT_AFFORD",
    bestProgram: bestOption.program,
    milesNeeded: bestOption.milesRequired,
    shortfall: bestShortfall,
  };
}
