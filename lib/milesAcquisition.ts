/**
 * Miles Acquisition Engine — calculates the cheapest way to ACQUIRE miles
 * for a specific redemption.
 *
 * Answers: "I need X miles in program Y. What's the cheapest way to get them?"
 *
 * Acquisition paths:
 *  1. Direct purchase from the airline (buy miles)
 *  2. Transfer from bank/credit-card points
 *
 * Self-contained — imports types only, no project dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AcquisitionMethod = "direct_purchase" | "bank_transfer";

export interface AcquisitionPath {
  method: AcquisitionMethod;
  /** Source of the miles (airline name or bank currency name) */
  source: string;
  /** Total USD cost to acquire the needed miles via this path */
  costUsd: number;
  /** Cost per 1 000 miles via this path */
  costPer1000: number;
  /** Number of bank points needed (only for bank_transfer) */
  pointsNeeded?: number;
  /** Transfer ratio (only for bank_transfer, e.g. 1:1 = 1.0) */
  transferRatio?: number;
  /** Notes / caveats */
  note?: string;
}

export interface AcquisitionResult {
  program: string;
  milesNeeded: number;
  paths: AcquisitionPath[];
  cheapest: AcquisitionPath | null;
  /** Estimated value of the redemption in USD (miles × market value) */
  redemptionValueUsd: number;
  /** Value ratio: redemptionValue / cheapest cost. >1 = good deal. */
  valueRatio: number | null;
}

// ---------------------------------------------------------------------------
// Program data (inline to keep self-contained)
// ---------------------------------------------------------------------------

interface ProgramAcquisitionData {
  purchaseMileCostPer1000: number | null; // USD, null = not purchasable
  marketValueCents: number;               // value of 1 mile in cents
  transferPartnersFrom: string[];
  /** Per-partner transfer ratios. Default is 1:1 if not specified. */
  transferRatios?: Record<string, number>;
}

/**
 * Key acquisition data per program.
 * Kept in sync with globalPrograms.ts but duplicated here for independence.
 */
const PROGRAM_DATA: Record<string, ProgramAcquisitionData> = {
  "Flying Blue": {
    purchaseMileCostPer1000: 30,
    marketValueCents: 1.2,
    transferPartnersFrom: ["Amex Membership Rewards", "Chase Ultimate Rewards", "Citi ThankYou", "Capital One Miles", "Bilt Rewards"],
  },
  "Delta SkyMiles": {
    purchaseMileCostPer1000: 35,
    marketValueCents: 1.1,
    transferPartnersFrom: ["Amex Membership Rewards", "Marriott Bonvoy"],
    transferRatios: { "Marriott Bonvoy": 0.333 },  // 3:1
  },
  "Korean Air SKYPASS": {
    purchaseMileCostPer1000: 33,
    marketValueCents: 1.5,
    transferPartnersFrom: ["Chase Ultimate Rewards", "Marriott Bonvoy"],
    transferRatios: { "Marriott Bonvoy": 0.333 },
  },
  "Turkish Miles&Smiles": {
    purchaseMileCostPer1000: null,
    marketValueCents: 1.5,
    transferPartnersFrom: ["Citi ThankYou", "Capital One Miles", "Bilt Rewards", "Marriott Bonvoy"],
    transferRatios: { "Marriott Bonvoy": 0.333 },
  },
  "Aeroplan": {
    purchaseMileCostPer1000: 25,
    marketValueCents: 1.5,
    transferPartnersFrom: ["Amex Membership Rewards", "Chase Ultimate Rewards", "Capital One Miles", "Bilt Rewards", "Marriott Bonvoy"],
    transferRatios: { "Marriott Bonvoy": 0.333 },
  },
  "United MileagePlus": {
    purchaseMileCostPer1000: 22,
    marketValueCents: 1.2,
    transferPartnersFrom: ["Chase Ultimate Rewards", "Bilt Rewards", "Marriott Bonvoy"],
    transferRatios: { "Marriott Bonvoy": 0.333 },
  },
  "ANA Mileage Club": {
    purchaseMileCostPer1000: null,
    marketValueCents: 1.5,
    transferPartnersFrom: ["Amex Membership Rewards", "Marriott Bonvoy"],
    transferRatios: { "Marriott Bonvoy": 0.333 },
  },
  "Singapore KrisFlyer": {
    purchaseMileCostPer1000: 35,
    marketValueCents: 1.5,
    transferPartnersFrom: ["Amex Membership Rewards", "Chase Ultimate Rewards", "Citi ThankYou", "Capital One Miles", "Bilt Rewards", "Marriott Bonvoy"],
    transferRatios: { "Marriott Bonvoy": 0.333 },
  },
  "LifeMiles": {
    purchaseMileCostPer1000: 15,
    marketValueCents: 1.3,
    transferPartnersFrom: ["Amex Membership Rewards", "Capital One Miles", "Citi ThankYou", "Bilt Rewards", "Marriott Bonvoy", "Brex Rewards"],
    transferRatios: { "Marriott Bonvoy": 0.333 },
  },
  "Ethiopian ShebaMiles": {
    purchaseMileCostPer1000: 30,
    marketValueCents: 1.0,
    transferPartnersFrom: ["Marriott Bonvoy"],
    transferRatios: { "Marriott Bonvoy": 0.333 },
  },
  "BA Avios": {
    purchaseMileCostPer1000: 25,
    marketValueCents: 1.3,
    transferPartnersFrom: ["Amex Membership Rewards", "Chase Ultimate Rewards", "Capital One Miles", "Bilt Rewards", "Marriott Bonvoy"],
    transferRatios: { "Marriott Bonvoy": 0.333 },
  },
  "Qatar Privilege Club": {
    purchaseMileCostPer1000: 30,
    marketValueCents: 1.4,
    transferPartnersFrom: ["Citi ThankYou", "Bilt Rewards", "Marriott Bonvoy"],
    transferRatios: { "Marriott Bonvoy": 0.333 },
  },
  "Cathay Pacific Asia Miles": {
    purchaseMileCostPer1000: 30,
    marketValueCents: 1.3,
    transferPartnersFrom: ["Amex Membership Rewards", "Citi ThankYou", "Capital One Miles", "Bilt Rewards", "Marriott Bonvoy"],
    transferRatios: { "Marriott Bonvoy": 0.333 },
  },
  "AAdvantage": {
    purchaseMileCostPer1000: 30,
    marketValueCents: 1.3,
    transferPartnersFrom: ["Marriott Bonvoy"],
    transferRatios: { "Marriott Bonvoy": 0.333 },
  },
  "Iberia Avios Plus": {
    purchaseMileCostPer1000: 22,
    marketValueCents: 1.3,
    transferPartnersFrom: ["Amex Membership Rewards", "Chase Ultimate Rewards", "Capital One Miles", "Bilt Rewards", "Marriott Bonvoy"],
    transferRatios: { "Marriott Bonvoy": 0.333 },
  },
  "Alaska Mileage Plan": {
    purchaseMileCostPer1000: 25,
    marketValueCents: 1.5,
    transferPartnersFrom: ["Marriott Bonvoy", "Bilt Rewards"],
    transferRatios: { "Marriott Bonvoy": 0.333 },
  },
  "Emirates Skywards": {
    purchaseMileCostPer1000: 30,
    marketValueCents: 1.0,
    transferPartnersFrom: ["Amex Membership Rewards", "Chase Ultimate Rewards", "Capital One Miles", "Citi ThankYou", "Bilt Rewards", "Marriott Bonvoy"],
    transferRatios: { "Marriott Bonvoy": 0.333 },
  },
  "Etihad Guest": {
    purchaseMileCostPer1000: 28,
    marketValueCents: 1.2,
    transferPartnersFrom: ["Amex Membership Rewards", "Citi ThankYou", "Capital One Miles", "Marriott Bonvoy"],
    transferRatios: { "Marriott Bonvoy": 0.333 },
  },
  "Virgin Atlantic Flying Club": {
    purchaseMileCostPer1000: 25,
    marketValueCents: 1.4,
    transferPartnersFrom: ["Amex Membership Rewards", "Chase Ultimate Rewards", "Capital One Miles", "Citi ThankYou", "Bilt Rewards", "Marriott Bonvoy"],
    transferRatios: { "Marriott Bonvoy": 0.333 },
  },
  "Lufthansa Miles & More": {
    purchaseMileCostPer1000: 35,
    marketValueCents: 1.0,
    transferPartnersFrom: ["Marriott Bonvoy"],
    transferRatios: { "Marriott Bonvoy": 0.333 },
  },
  "Qantas Frequent Flyer": {
    purchaseMileCostPer1000: 28,
    marketValueCents: 1.2,
    transferPartnersFrom: ["Amex Membership Rewards", "Marriott Bonvoy"],
    transferRatios: { "Marriott Bonvoy": 0.333 },
  },
};

// ---------------------------------------------------------------------------
// Bank point costs (USD cents per point — what it "costs" to earn/acquire)
// ---------------------------------------------------------------------------

/**
 * Effective cost in USD cents to acquire 1 bank point.
 * Based on typical earning rates and card annual-fee amortization.
 */
const BANK_POINT_COST_CENTS: Record<string, number> = {
  "Chase Ultimate Rewards":   2.0,
  "Amex Membership Rewards":  2.0,
  "Citi ThankYou":            1.7,
  "Capital One Miles":        1.85,
  "Bilt Rewards":             1.8,
  "Marriott Bonvoy":          0.7,
  "Wells Fargo Rewards":      1.5,
  "Brex Rewards":             1.5,
};

// ---------------------------------------------------------------------------
// Core engine
// ---------------------------------------------------------------------------

/**
 * Calculate all available acquisition paths for a given number of miles
 * in a specific loyalty program, and identify the cheapest.
 *
 * @param program    - Loyalty program name (must match keys in PROGRAM_DATA)
 * @param milesNeeded - Total miles required for the redemption
 * @returns Sorted list of acquisition paths (cheapest first) + value analysis
 */
export function calculateAcquisitionCost(
  program: string,
  milesNeeded: number,
): AcquisitionResult {
  const data = PROGRAM_DATA[program];

  if (!data) {
    return {
      program,
      milesNeeded,
      paths: [],
      cheapest: null,
      redemptionValueUsd: 0,
      valueRatio: null,
    };
  }

  const paths: AcquisitionPath[] = [];

  // ── Path 1: Direct purchase ──────────────────────────────────────────
  if (data.purchaseMileCostPer1000 !== null) {
    const costUsd = (milesNeeded / 1000) * data.purchaseMileCostPer1000;
    paths.push({
      method: "direct_purchase",
      source: program,
      costUsd: round2(costUsd),
      costPer1000: data.purchaseMileCostPer1000,
      note: "Direct purchase from airline (sale pricing)",
    });
  }

  // ── Path 2: Bank point transfers ─────────────────────────────────────
  for (const bank of data.transferPartnersFrom) {
    const ratio = data.transferRatios?.[bank] ?? 1.0;
    const pointsNeeded = Math.ceil(milesNeeded / ratio);
    const costPerPointCents = BANK_POINT_COST_CENTS[bank];

    if (costPerPointCents === undefined) continue;

    const costUsd = (pointsNeeded * costPerPointCents) / 100;
    const effectiveCostPer1000 = (costUsd / milesNeeded) * 1000;

    paths.push({
      method: "bank_transfer",
      source: bank,
      costUsd: round2(costUsd),
      costPer1000: round2(effectiveCostPer1000),
      pointsNeeded,
      transferRatio: ratio,
      note:
        ratio < 1
          ? `Transfer ratio ${Math.round(1 / ratio)}:1 (${Math.round(1 / ratio)} bank points = 1 mile)`
          : "1:1 transfer",
    });
  }

  // Sort cheapest first
  paths.sort((a, b) => a.costUsd - b.costUsd);

  // ── Value analysis ───────────────────────────────────────────────────
  const redemptionValueUsd = round2((milesNeeded * data.marketValueCents) / 100);
  const cheapest = paths[0] ?? null;
  const valueRatio = cheapest ? round2(redemptionValueUsd / cheapest.costUsd) : null;

  return {
    program,
    milesNeeded,
    paths,
    cheapest,
    redemptionValueUsd,
    valueRatio,
  };
}

// ---------------------------------------------------------------------------
// Multi-program comparison
// ---------------------------------------------------------------------------

export interface ProgramComparison {
  program: string;
  milesNeeded: number;
  cheapestAcquisitionUsd: number;
  redemptionValueUsd: number;
  valueRatio: number;
  cheapestMethod: string;
}

/**
 * Compare acquisition costs across multiple programs for different mile
 * requirements. Useful when the dynamic engine returns estimates for
 * several programs on the same route.
 */
export function compareAcquisitionAcrossPrograms(
  programMiles: Array<{ program: string; milesNeeded: number }>,
): ProgramComparison[] {
  return programMiles
    .map(({ program, milesNeeded }) => {
      const result = calculateAcquisitionCost(program, milesNeeded);
      if (!result.cheapest) return null;
      return {
        program,
        milesNeeded,
        cheapestAcquisitionUsd: result.cheapest.costUsd,
        redemptionValueUsd: result.redemptionValueUsd,
        valueRatio: result.valueRatio ?? 0,
        cheapestMethod: `${result.cheapest.method} (${result.cheapest.source})`,
      };
    })
    .filter((r): r is ProgramComparison => r !== null)
    .sort((a, b) => a.cheapestAcquisitionUsd - b.cheapestAcquisitionUsd);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Check if a program is supported by the acquisition engine.
 */
export function isSupportedProgram(program: string): boolean {
  return program in PROGRAM_DATA;
}

/**
 * Get list of all programs supported by the acquisition engine.
 */
export function supportedPrograms(): string[] {
  return Object.keys(PROGRAM_DATA);
}
