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

  // Step 1: Empty portfolio guard
  if (!hasAnyPoints) {
    return { type: "NO_PORTFOLIO" };
  }

  // If there are no options to check, we can't afford anything
  if (milesOptions.length === 0) {
    return { type: "CANT_AFFORD", bestProgram: "", milesNeeded: 0, shortfall: 0 };
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

  // ── Step 3: Transfer check — iterate all options by shortfall (smallest first)
  const candidatesWithShortfall = milesOptions
    .map(option => ({
      option,
      shortfall: option.milesRequired - (balances[option.program] ?? 0),
    }))
    .filter(c => c.shortfall > 0)
    .sort((a, b) => a.shortfall - b.shortfall);

  for (const { option, shortfall } of candidatesWithShortfall) {
    for (const bonus of TRANSFER_BONUSES) {
      if (bonus.to !== option.program) continue;
      const ratio = getEffectiveRatio(bonus);
      const pointsNeeded = Math.ceil(shortfall / ratio);
      if ((bankPoints[bonus.from] ?? 0) >= pointsNeeded) {
        return {
          type:           "CAN_TRANSFER",
          program:        option.program,
          milesNeeded:    option.milesRequired,
          shortfall,
          transferFrom:   bonus.from,
          transferAmount: pointsNeeded,
          transferRatio:  ratio,
        };
      }
    }
  }

  // ── Step 4: CANT_AFFORD — use the option with smallest shortfall
  const best = candidatesWithShortfall[0] ?? { option: milesOptions[0], shortfall: milesOptions[0].milesRequired };
  return {
    type:        "CANT_AFFORD",
    bestProgram: best.option.program,
    milesNeeded: best.option.milesRequired,
    shortfall:   best.shortfall,
  };
}
