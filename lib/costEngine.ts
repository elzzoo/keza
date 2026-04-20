// lib/costEngine.ts
import { getZone } from "./zones";
import { getAwardTaxes } from "@/data/awardTaxes";
import { getMilesRequired } from "@/data/awardCharts";
import { MILES_PRICE_MAP, MILES_CONFIDENCE_MAP, DEFAULT_MILE_VALUE_CENTS, type Confidence } from "@/data/milesPrices";
import { TRANSFER_BONUSES, getEffectiveRatio } from "@/data/transferBonuses";
import { ALLIANCES } from "./alliances";
import { estimateMilesRequired, type CabinClass } from "./dynamicAwardEngine";
import { GLOBAL_PROGRAMS, PROGRAMS_BY_NAME, type LoyaltyProgram } from "./globalPrograms";
import { calculateAcquisitionCost } from "./milesAcquisition";
import { AIRPORTS } from "@/data/airports";
import type { Cabin, TripType } from "./engine";

// ─── Public types ─────────────────────────────────────────────────────────────

export type Recommendation = "USE_MILES" | "USE_CASH";

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
  via?: string;                   // source program for TRANSFER (e.g. "Amex MR")
  operatingAirline: string;
  milesRequired: number;
  taxes: number;

  // Core calculation: milesCost = (milesRequired × valuePerMile) + taxes
  valuePerMile: number;           // market value in cents (e.g. 1.5 = $0.015)
  milesCost: number;              // milesRequired × valuePerMile in dollars
  totalMilesCost: number;         // milesCost + taxes = REAL COST of this option
  savings: number;                // cashTotal - totalMilesCost (positive = miles cheaper)

  confidence: Confidence;         // HIGH / MEDIUM / LOW
  promoApplied?: string;
  chartSource: "REAL" | "ESTIMATE";
}

export interface CostComparison {
  cashCost: number;               // total flight price in cash
  milesCost: number;              // total cost of best miles option (0 if none)
  savings: number;                // |cashCost - milesCost| = how much you save
  recommendation: Recommendation; // USE_MILES or USE_CASH — binary, no ambiguity
  bestOption: MilesOption | null; // the cheapest miles scenario
  milesOptions: MilesOption[];    // all computed options for detail view
  explanation: string;            // human-readable reason (FR)
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

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE FORMULA:  totalMilesCost = (milesRequired × valuePerMile) + taxes
  // ═══════════════════════════════════════════════════════════════════════════
  const milesCost      = Math.round((milesRequired * valuePerMile) / 100 * 100) / 100;
  const totalMilesCost = Math.round((milesCost + taxes) * 100) / 100;
  const savings        = Math.round((cashTotal - totalMilesCost) * 100) / 100;

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

  // ── Dynamic global options (for routes/programs not in hardcoded charts) ──
  // Uses distance-based estimation to suggest ANY program worldwide
  const fromAirport = AIRPORTS.find(a => a.code === from);
  const toAirport   = AIRPORTS.find(a => a.code === to);

  if (fromAirport && toAirport) {
    const cabinMap: Record<Cabin, CabinClass> = {
      economy: "economy", premium: "premium_economy", business: "business", first: "first"
    };
    const dynamicCabin = cabinMap[cabin];

    // Only add dynamic options for programs NOT already covered by hardcoded charts
    const coveredPrograms = new Set(milesOptions.map(o => o.program));

    for (const prog of GLOBAL_PROGRAMS) {
      if (coveredPrograms.has(prog.name)) continue;

      // Skip programs where the airline doesn't match alliance of operating airline
      // (they wouldn't have award space on this airline)
      const operatingAlliance = ALLIANCES[operatingAirline];
      if (
        operatingAirline &&
        operatingAlliance &&
        operatingAlliance !== "Independent" &&
        prog.alliance !== operatingAlliance &&
        prog.alliance !== "Independent"
      ) continue;

      const estimate = estimateMilesRequired(
        prog.name,
        prog.alliance,
        fromAirport.lat, fromAirport.lon,
        toAirport.lat, toAirport.lon,
        dynamicCabin,
        tripType,
        passengers
      );

      // Compute taxes using tax profile
      const taxPerPax = prog.taxProfile === "low" ? 50
        : prog.taxProfile === "medium" ? 150
        : 350;
      const taxes = taxPerPax * passengers * (tripType === "roundtrip" ? 2 : 1);

      // Market value of miles
      const valuePerMile = effectivePrices.get(prog.name) ?? prog.marketValueCents;
      const milesCost = Math.round((estimate.milesRequired * valuePerMile) / 100 * 100) / 100;
      const totalMilesCost = Math.round((milesCost + taxes) * 100) / 100;
      const savings = Math.round((cashTotal - totalMilesCost) * 100) / 100;

      // Only add if it's potentially interesting (not way more expensive than cash)
      if (totalMilesCost > cashTotal * 1.5) continue;

      milesOptions.push({
        type: "ALLIANCE",
        program: prog.name,
        via: undefined,
        operatingAirline: prog.airline,
        milesRequired: estimate.milesRequired,
        taxes,
        valuePerMile,
        milesCost,
        totalMilesCost,
        savings,
        confidence: "LOW",
        chartSource: "ESTIMATE",
      });
    }

    // ── Acquisition options: "Buy miles and use them" ───────────────────────
    // For the top 3 cheapest programs, check if BUYING miles is still cheaper than cash
    const sortedForAcquisition = [...milesOptions]
      .sort((a, b) => a.totalMilesCost - b.totalMilesCost)
      .slice(0, 5);

    for (const opt of sortedForAcquisition) {
      const acquisition = calculateAcquisitionCost(opt.program, opt.milesRequired);
      if (!acquisition.cheapest) continue;

      const totalAcquisitionCost = acquisition.cheapest.costUsd + opt.taxes;

      // Only suggest acquisition if it's cheaper than cash
      if (totalAcquisitionCost >= cashTotal) continue;

      // Don't duplicate if we already have a better option for this program
      const existingKey = `${opt.program}::ACQUIRE:${acquisition.cheapest.source}`;
      const existingForProgram = milesOptions.find(
        o => o.program === opt.program && o.via === `Achat ${acquisition.cheapest!.source}`
      );
      if (existingForProgram && existingForProgram.totalMilesCost <= totalAcquisitionCost) continue;

      milesOptions.push({
        type: "TRANSFER",
        program: opt.program,
        via: `Achat ${acquisition.cheapest.source}`,
        operatingAirline: opt.operatingAirline,
        milesRequired: opt.milesRequired,
        taxes: opt.taxes,
        valuePerMile: Math.round((acquisition.cheapest.costUsd / opt.milesRequired) * 100 * 100) / 100,
        milesCost: acquisition.cheapest.costUsd,
        totalMilesCost: totalAcquisitionCost,
        savings: Math.round((cashTotal - totalAcquisitionCost) * 100) / 100,
        confidence: "MEDIUM",
        chartSource: opt.chartSource,
      });
    }
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
    .slice(0, 12);

  // ── DECISION: compare REAL TOTAL COSTS ────────────────────────────────────
  // bestOption = cheapest miles scenario
  const bestOption = dedupedOptions[0] ?? null;

  // Binary decision: milesCost < cashCost → USE_MILES, else → USE_CASH
  const bestMilesCost = bestOption?.totalMilesCost ?? Infinity;
  const recommendation: Recommendation =
    bestMilesCost < cashTotal ? "USE_MILES" : "USE_CASH";

  // Savings = absolute difference between cash and best miles cost
  const savings = bestOption
    ? Math.round(Math.abs(cashTotal - bestMilesCost) * 100) / 100
    : 0;

  // Explanation
  const explanation = bestOption
    ? recommendation === "USE_MILES"
      ? `Économisez $${savings} en utilisant ${bestOption.program}${bestOption.via ? ` via ${bestOption.via}` : ""} (${bestOption.milesRequired.toLocaleString()} miles + $${bestOption.taxes} taxes = $${bestMilesCost} vs $${cashTotal} cash)`
      : `Le cash est moins cher de $${savings}. Miles coûteraient $${bestMilesCost} vs $${cashTotal} cash.`
    : `Aucune option miles disponible. Payez en cash ($${cashTotal}).`;

  return {
    cashCost: cashTotal,
    milesCost: bestOption ? bestMilesCost : 0,
    savings,
    recommendation,
    bestOption,
    milesOptions: dedupedOptions,
    explanation,
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
