// lib/costEngine.ts
import { getZone } from "./zones";
import { getAwardTaxes } from "@/data/awardTaxes";
import { getMilesRequired } from "@/data/awardCharts";
import { MILES_PRICE_MAP, MILES_CONFIDENCE_MAP, DEFAULT_MILE_VALUE_CENTS, type Confidence } from "@/data/milesPrices";
import { TRANSFER_BONUSES, getEffectiveRatio } from "@/data/transferBonuses";
import { ALLIANCES } from "./alliances";
import type { Cabin, TripType } from "./engine";

// ─── Thresholds (named constants — tune without touching logic) ───────────────
const MILES_WIN_THRESHOLD    = 0.95; // miles win if 5%+ cheaper than cash, even buying
const MILES_OWNED_THRESHOLD  = 0.90; // miles worth it if 10%+ cheaper when already owned

// ─── Public types ─────────────────────────────────────────────────────────────

export interface FlightInput {
  from: string;
  to: string;
  totalPrice: number;
  airlines: string[];
  stops: number;
  cabin: Cabin;
  tripType: TripType;
  passengers: number;
}

export interface MilesOption {
  type: "DIRECT" | "ALLIANCE" | "TRANSFER";
  program: string;
  via?: string;
  operatingAirline: string;
  milesRequired: number;

  taxes: number;

  // If user already has the miles: cost = taxes only
  ownedCost: number;
  ownedSavings: number;

  // Market value approach: cost = (miles × market value per mile) + taxes
  valuePerMile: number;           // market value in cents (e.g. 1.5)
  milesCost: number;              // miles × valuePerMile (dollars)
  totalMilesCost: number;         // milesCost + taxes = real cost of miles option
  savings: number;                // cashTotal - totalMilesCost (positive = miles cheaper)

  confidence: Confidence;         // HIGH / MEDIUM / LOW
  promoApplied?: string;
  chartSource: "REAL" | "ESTIMATE";
}

export interface CostComparison {
  cashTotal: number;
  milesOptions: MilesOption[];
  bestOption: MilesOption | null;          // cheapest overall (totalMilesCost vs cash)
  bestOwnedOption: MilesOption | null;     // cheapest if you already have miles
  recommendation: "MILES_WIN" | "MILES_IF_OWNED" | "CASH_WINS";
  savings: number;                         // how much cheaper the best option is vs cash
}

// ─── Helper: which airlines are in each program's network ────────────────────
// NOTE: keys must match exactly what alliances.ts has (e.g. "United" not "United Airlines")

const PROGRAM_TO_AIRLINE: Record<string, string> = {
  "Flying Blue":          "Air France",
  "Turkish Miles&Smiles": "Turkish Airlines",
  "Emirates Skywards":    "Emirates",
  "Qatar Privilege Club": "Qatar Airways",
  "British Airways Avios":"British Airways",
  "Ethiopian ShebaMiles": "Ethiopian Airlines",
  "Air Canada Aeroplan":  "Air Canada",
  "United MileagePlus":   "United",
};

function getProgramsForAirline(airline: string): Array<{ program: string; type: "DIRECT" | "ALLIANCE" }> {
  const results: Array<{ program: string; type: "DIRECT" | "ALLIANCE" }> = [];
  const airlineAlliance = ALLIANCES[airline];

  for (const [program, programAirline] of Object.entries(PROGRAM_TO_AIRLINE)) {
    if (programAirline === airline) {
      results.push({ program, type: "DIRECT" });
    } else if (
      airlineAlliance &&
      airlineAlliance !== "Independent" &&
      ALLIANCES[programAirline] === airlineAlliance
    ) {
      results.push({ program, type: "ALLIANCE" });
    }
  }
  return results;
}

// ─── Helper: build one MilesOption ───────────────────────────────────────────

function buildOption(
  type: "DIRECT" | "ALLIANCE" | "TRANSFER",
  program: string,
  via: string | undefined,
  operatingAirline: string,
  milesRequired: number,
  chartSource: "REAL" | "ESTIMATE",
  taxes: number,
  cashTotal: number,
  effectivePrices: Map<string, number>
): MilesOption {
  // Market value of a mile for this program (cents).
  // For TRANSFER: use the source currency's value (e.g. Amex MR value).
  const sourceProgram = via ?? program;
  const valuePerMile =
    effectivePrices.get(sourceProgram) ??
    effectivePrices.get(program) ??
    MILES_PRICE_MAP.get(sourceProgram) ??
    MILES_PRICE_MAP.get(program) ??
    DEFAULT_MILE_VALUE_CENTS;

  // Core formula: totalMilesCost = (miles × value per mile) + taxes
  const milesCost     = Math.round((milesRequired * valuePerMile) / 100 * 100) / 100;
  const totalMilesCost = Math.round((milesCost + taxes) * 100) / 100;
  const savings        = Math.round((cashTotal - totalMilesCost) * 100) / 100;

  // Confidence based on program data availability
  const confidence: Confidence =
    MILES_CONFIDENCE_MAP.get(sourceProgram) ??
    MILES_CONFIDENCE_MAP.get(program) ??
    "LOW";

  return {
    type,
    program,
    via,
    operatingAirline,
    milesRequired,
    taxes,
    ownedCost:    Math.round(taxes * 100) / 100,
    ownedSavings: Math.round((cashTotal - taxes) * 100) / 100,
    valuePerMile,
    milesCost,
    totalMilesCost,
    savings,
    confidence,
    chartSource,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildCostOptions(
  flight: FlightInput,
  effectivePrices: Map<string, number>
): CostComparison {
  const { from, to, totalPrice: cashTotal, airlines, cabin, tripType, passengers } = flight;

  const originZone = getZone(from);
  const destZone   = getZone(to);
  const operatingAirline = airlines[0] ?? "";

  const milesOptions: MilesOption[] = [];

  // ── Direct + Alliance options ──────────────────────────────────────────────
  const programs = getProgramsForAirline(operatingAirline);

  // When the operating airline is unknown or not in any alliance, fall back to
  // checking ALL programs directly based on route zones. This is common for
  // month-matrix results where we only have prices but no airline codes.
  const useZoneFallback = programs.length === 0 && originZone && destZone;
  const effectivePrograms = useZoneFallback
    ? Object.entries(PROGRAM_TO_AIRLINE).map(([program, airline]) => ({
        program,
        type: "ALLIANCE" as const,          // mark as alliance since we don't know the exact operator
        inferredAirline: airline,
      }))
    : programs.map((p) => ({ ...p, inferredAirline: operatingAirline }));

  for (const entry of effectivePrograms) {
    const airlineForTaxes = useZoneFallback ? entry.inferredAirline : operatingAirline;
    if (!originZone || !destZone) {
      const { miles, source } = getMilesRequired(entry.program, "EUROPE", "EUROPE", cabin, tripType, passengers);
      const taxes = getAwardTaxes(airlineForTaxes, cabin, passengers);
      milesOptions.push(buildOption(entry.type, entry.program, undefined, airlineForTaxes, miles, source, taxes, cashTotal, effectivePrices));
      continue;
    }
    const { miles, source } = getMilesRequired(entry.program, originZone, destZone, cabin, tripType, passengers);
    const taxes = getAwardTaxes(airlineForTaxes, cabin, passengers);
    milesOptions.push(buildOption(entry.type, entry.program, undefined, airlineForTaxes, miles, source, taxes, cashTotal, effectivePrices));
  }

  // ── Transfer options ──────────────────────────────────────────────────────
  // When using zone fallback, allow all transfer bonuses that target any program
  const programNames = new Set(effectivePrograms.map((p) => p.program));

  for (const bonus of TRANSFER_BONUSES) {
    if (!programNames.has(bonus.to)) continue;
    if (!originZone || !destZone) continue;

    const airlineForTaxes = useZoneFallback
      ? (PROGRAM_TO_AIRLINE[bonus.to] ?? operatingAirline)
      : operatingAirline;

    const { miles: destMiles, source } = getMilesRequired(bonus.to, originZone, destZone, cabin, tripType, passengers);
    const ratio = getEffectiveRatio(bonus);
    const sourceMiles = Math.ceil(destMiles / ratio);
    const taxes = getAwardTaxes(airlineForTaxes, cabin, passengers);

    const promoApplied = bonus.promoRatio
      ? `${bonus.from} bonus ${Math.round((ratio - 1) * 100)}%`
      : undefined;

    const opt = buildOption(
      "TRANSFER",
      bonus.to,
      bonus.from,
      airlineForTaxes,
      sourceMiles,
      source,
      taxes,
      cashTotal,
      effectivePrices
    );
    if (promoApplied) opt.promoApplied = promoApplied;
    milesOptions.push(opt);
  }

  // ── Deduplicate: keep cheapest option per (program + via) key ─────────────
  const seen = new Map<string, MilesOption>();
  for (const opt of milesOptions) {
    const key = `${opt.program}::${opt.via ?? ""}`;
    const existing = seen.get(key);
    if (!existing || opt.totalMilesCost < existing.totalMilesCost) {
      seen.set(key, opt);
    }
  }
  const dedupedOptions = Array.from(seen.values())
    .sort((a, b) => a.totalMilesCost - b.totalMilesCost)  // cheapest first
    .slice(0, 8);

  // ── Pick best options ─────────────────────────────────────────────────────
  // bestOption: lowest totalMilesCost (real cost with market value miles)
  const bestOption = dedupedOptions[0] ?? null;

  // bestOwnedOption: lowest ownedCost (just taxes — if you already have the miles)
  const bestOwned = dedupedOptions.length > 0
    ? [...dedupedOptions].sort((a, b) => a.ownedCost - b.ownedCost)[0]!
    : null;

  // ── Recommendation: compare REAL costs ────────────────────────────────────
  // MILES_WIN:      totalMilesCost < cash (miles cheaper even buying them)
  // MILES_IF_OWNED: ownedCost < cash (miles cheaper only if you already have them)
  // CASH_WINS:      cash is cheaper
  let recommendation: CostComparison["recommendation"] = "CASH_WINS";
  if (bestOption && bestOption.totalMilesCost < cashTotal * MILES_WIN_THRESHOLD) {
    recommendation = "MILES_WIN";
  } else if (bestOwned && bestOwned.ownedCost < cashTotal * MILES_OWNED_THRESHOLD) {
    recommendation = "MILES_IF_OWNED";
  }

  // Savings = how much the best option saves vs cash
  const savings = bestOption
    ? Math.max(bestOption.savings, 0)
    : 0;

  return {
    cashTotal,
    milesOptions: dedupedOptions,
    bestOption,
    bestOwnedOption: bestOwned,
    recommendation,
    savings,
  };
}

// ─── Redis-backed effective price loader ──────────────────────────────────────

export async function getEffectivePrices(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const programs = Array.from(MILES_PRICE_MAP.keys());

  try {
    const { redis } = await import("./redis");
    await Promise.all(
      programs.map(async (program) => {
        const key = `miles:price:${program}`;
        const cached = await redis.get<number>(key).catch(() => null);
        if (typeof cached === "number") {
          map.set(program, cached);
        } else {
          map.set(program, MILES_PRICE_MAP.get(program)!);
        }
      })
    );
  } catch {
    Array.from(MILES_PRICE_MAP.entries()).forEach(([program, price]) => {
      map.set(program, price);
    });
  }

  return map;
}
