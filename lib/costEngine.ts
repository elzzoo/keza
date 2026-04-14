// lib/costEngine.ts
import { getZone } from "./zones";
import { getAwardTaxes } from "@/data/awardTaxes";
import { getMilesRequired } from "@/data/awardCharts";
import { MILES_PRICE_MAP } from "@/data/milesPrices";
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

  ownedCost: number;
  ownedSavings: number;

  pricePerMile: number;
  acquisitionCost: number;
  purchasedCost: number;
  purchasedSavings: number;

  promoApplied?: string;
  chartSource: "REAL" | "ESTIMATE";
}

export interface CostComparison {
  cashTotal: number;
  milesOptions: MilesOption[];
  bestOwnedOption: MilesOption | null;
  bestPurchasedOption: MilesOption | null;
  recommendation: "MILES_WIN" | "MILES_IF_OWNED" | "CASH_WINS";
  savings: number;
  value: number;
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
  const sourceProgram = via ?? program;
  const basePrice = effectivePrices.get(sourceProgram)
    ?? MILES_PRICE_MAP.get(sourceProgram)
    ?? 3.0;

  const pricePerMile   = basePrice;
  const acquisitionCost = Math.round((milesRequired * pricePerMile) / 100 * 100) / 100;
  const purchasedCost   = Math.round((acquisitionCost + taxes) * 100) / 100;

  return {
    type,
    program,
    via,
    operatingAirline,
    milesRequired,
    taxes,
    ownedCost:        Math.round(taxes * 100) / 100,
    ownedSavings:     Math.round((cashTotal - taxes) * 100) / 100,
    pricePerMile,
    acquisitionCost,
    purchasedCost,
    purchasedSavings: Math.round((cashTotal - purchasedCost) * 100) / 100,
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

  for (const { program, type } of programs) {
    if (!originZone || !destZone) {
      const { miles, source } = getMilesRequired(program, "EUROPE", "EUROPE", cabin, tripType, passengers);
      const taxes = getAwardTaxes(operatingAirline, cabin, passengers);
      milesOptions.push(buildOption(type, program, undefined, operatingAirline, miles, source, taxes, cashTotal, effectivePrices));
      continue;
    }
    const { miles, source } = getMilesRequired(program, originZone, destZone, cabin, tripType, passengers);
    const taxes = getAwardTaxes(operatingAirline, cabin, passengers);
    milesOptions.push(buildOption(type, program, undefined, operatingAirline, miles, source, taxes, cashTotal, effectivePrices));
  }

  // ── Transfer options ──────────────────────────────────────────────────────
  for (const bonus of TRANSFER_BONUSES) {
    const canBook = programs.find((p) => p.program === bonus.to);
    if (!canBook) continue;

    if (!originZone || !destZone) continue;

    const { miles: destMiles, source } = getMilesRequired(bonus.to, originZone, destZone, cabin, tripType, passengers);
    const ratio = getEffectiveRatio(bonus);
    const sourceMiles = Math.ceil(destMiles / ratio);
    const taxes = getAwardTaxes(operatingAirline, cabin, passengers);

    const promoApplied = bonus.promoRatio
      ? `${bonus.from} bonus ${Math.round((ratio - 1) * 100)}%`
      : undefined;

    const opt = buildOption(
      "TRANSFER",
      bonus.to,
      bonus.from,
      operatingAirline,
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
    if (!existing || opt.purchasedCost < existing.purchasedCost) {
      seen.set(key, opt);
    }
  }
  const dedupedOptions = Array.from(seen.values())
    .sort((a, b) => a.purchasedCost - b.purchasedCost)
    .slice(0, 8);

  // ── Recommendation ────────────────────────────────────────────────────────
  const bestPurchased = dedupedOptions[0] ?? null;
  const bestOwned = dedupedOptions.length > 0
    ? [...dedupedOptions].sort((a, b) => a.ownedCost - b.ownedCost)[0]!
    : null;

  let recommendation: CostComparison["recommendation"] = "CASH_WINS";
  if (bestPurchased && bestPurchased.purchasedCost < cashTotal * MILES_WIN_THRESHOLD) {
    recommendation = "MILES_WIN";
  } else if (bestOwned && bestOwned.ownedCost < cashTotal * MILES_OWNED_THRESHOLD) {
    recommendation = "MILES_IF_OWNED";
  }

  const valueOption = bestOwned ?? bestPurchased;
  const value = valueOption && valueOption.milesRequired > 0
    ? Math.round((valueOption.ownedSavings / (valueOption.milesRequired / 100)) * 100) / 100
    : 0;

  const savings = bestOwned && bestOwned.ownedSavings > 0
    ? bestOwned.ownedSavings
    : (bestPurchased?.purchasedSavings ?? 0);

  return {
    cashTotal,
    milesOptions: dedupedOptions,
    bestOwnedOption: bestOwned,
    bestPurchasedOption: bestPurchased,
    recommendation,
    savings,
    value,
  };
}

// ─── Redis-backed effective price loader ──────────────────────────────────────

export async function getEffectivePrices(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const programs = [...MILES_PRICE_MAP.keys()];

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
    for (const [program, price] of MILES_PRICE_MAP) {
      map.set(program, price);
    }
  }

  return map;
}
