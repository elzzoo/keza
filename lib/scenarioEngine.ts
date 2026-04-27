// lib/scenarioEngine.ts
import type { MilesOption } from "./costEngine";

export type ScenarioType = "DIRECT" | "ALLIANCE" | "TRANSFER" | "BUY";

export interface Scenario {
  type: ScenarioType;
  program: string;
  via?: string;
  operatingAirline: string;
  milesRequired: number;
  totalCost: number;        // totalMilesCost in USD
  taxes: number;
  savings: number;          // cashTotal - totalCost
  valuePerMile: number;     // cents per mile
  chartSource: "REAL" | "ESTIMATE";
  confidenceScore: number;  // 0-100
  isBestDeal: boolean;
}

/** Map MilesOption type to ScenarioType (BUY = TRANSFER via "Achat ...") */
function toScenarioType(opt: MilesOption): ScenarioType {
  if (opt.type === "TRANSFER" && opt.via?.startsWith("Achat")) return "BUY";
  return opt.type;
}

/**
 * Compute a 0-100 confidence score from chartSource + confidence fields.
 * HIGH + REAL  → 95
 * HIGH + ESTIMATE → 75
 * MEDIUM + REAL  → 80
 * MEDIUM + ESTIMATE → 60
 * LOW + REAL  → 65
 * LOW + ESTIMATE → 40
 */
function computeConfidenceScore(opt: MilesOption): number {
  const c = opt.confidence;
  const s = opt.chartSource;
  if (c === "HIGH"   && s === "REAL")     return 95;
  if (c === "HIGH"   && s === "ESTIMATE") return 75;
  if (c === "MEDIUM" && s === "REAL")     return 80;
  if (c === "MEDIUM" && s === "ESTIMATE") return 60;
  if (c === "LOW"    && s === "REAL")     return 65;
  return 40;
}

/** Build Scenario[] from an existing MilesOption[] (already sorted cheapest-first). */
export function buildScenarios(options: MilesOption[]): Scenario[] {
  return options.map((opt) => ({
    type:             toScenarioType(opt),
    program:          opt.program,
    via:              opt.via,
    operatingAirline: opt.operatingAirline,
    milesRequired:    opt.milesRequired,
    totalCost:        opt.totalMilesCost,
    taxes:            opt.taxes,
    savings:          opt.savings,
    valuePerMile:     opt.valuePerMile,
    chartSource:      opt.chartSource,
    confidenceScore:  computeConfidenceScore(opt),
    isBestDeal:       opt.isBestDeal,
  }));
}
