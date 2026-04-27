// lib/costEngine.ts
import { getZone } from "./zones";
import { getAwardTaxes } from "@/data/awardTaxes";
import { getMilesRequired } from "@/data/awardCharts";
import { MILES_PRICE_MAP, MILES_CONFIDENCE_MAP, DEFAULT_MILE_VALUE_CENTS, type Confidence } from "@/data/milesPrices";
import { TRANSFER_BONUSES, getEffectiveRatio } from "@/data/transferBonuses";
import { ALLIANCES } from "./alliances";
import { estimateMilesRequired, type CabinClass } from "./dynamicAwardEngine";
import { GLOBAL_PROGRAMS, PROGRAMS_BY_NAME } from "./globalPrograms";
import { calculateAcquisitionCost } from "./milesAcquisition";
import { AIRPORTS } from "@/data/airports";
import type { Cabin, TripType } from "./engine";
import { buildScenarios, type Scenario } from "./scenarioEngine";

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
  explanation: string;     // e.g. "Flying Blue direct · 30 000 miles + $300 taxes"
  isBestDeal: boolean;     // true only on the cheapest option after deduplication
  chartSource: "REAL" | "ESTIMATE";
}

export interface CostComparison {
  cashCost: number;               // total flight price in cash
  milesCost: number;              // total cost of best miles option (0 if none)
  savings: number;                // |cashCost - milesCost| = how much you save
  recommendation: Recommendation; // USE_MILES or USE_CASH — binary, no ambiguity
  bestOption: MilesOption | null; // the cheapest miles scenario
  milesOptions: MilesOption[];    // all computed options for detail view
  scenarios?: Scenario[];         // NEW — same data as milesOptions, typed as Scenario[]
  explanation: string;            // kept for backward compat
  displayMessage: string;         // "🔥 Tu économises $X" or "❌ Les miles coûtent $X de plus"
  disclaimer: string;             // trust disclaimer shown on every result
}

// ─── Helper: which airlines are in each program's network ────────────────────
// NOTE: keys must match exactly what alliances.ts has (e.g. "United" not "United Airlines")

// Maps each loyalty program name → the program's own operating airline.
// Used to determine DIRECT (same airline) vs ALLIANCE (partner) matching.
// Keys must match exactly what awardCharts.ts AND globalPrograms.ts use.
// Values must match keys in lib/alliances.ts and lib/iataAirlines.ts.
const PROGRAM_TO_AIRLINE: Record<string, string> = {
  // ─── SkyTeam ───────────────────────────────────────────────────────────────
  "Flying Blue":             "Air France",        // Air France + KLM
  "Delta SkyMiles":          "Delta",             // matches iataToAirline("DL")
  "Korean Air SKYPASS":      "Korean Air",
  // ─── Star Alliance ─────────────────────────────────────────────────────────
  "Turkish Miles&Smiles":    "Turkish Airlines",
  "Ethiopian ShebaMiles":    "Ethiopian Airlines",
  "Air Canada Aeroplan":     "Air Canada",
  "Aeroplan":                "Air Canada",        // globalPrograms alias
  "United MileagePlus":      "United",
  "Lufthansa Miles & More":  "Lufthansa",
  "Singapore KrisFlyer":     "Singapore Airlines",
  "ANA Mileage Club":        "All Nippon Airways",
  "LifeMiles":               "Avianca",
  // ─── Oneworld ──────────────────────────────────────────────────────────────
  "British Airways Avios":   "British Airways",   // awardCharts key
  "BA Avios":                "British Airways",   // globalPrograms alias
  "Qatar Privilege Club":    "Qatar Airways",
  "AAdvantage":              "American Airlines",
  "Iberia Avios Plus":       "Iberia",
  "Japan Airlines Mileage Bank": "Japan Airlines",
  // ─── Independent ───────────────────────────────────────────────────────────
  "Emirates Skywards":       "Emirates",
  "Etihad Guest":            "Etihad",            // matches alliances.ts key
};

// Airlines whose native program is Flying Blue (Air France-KLM group).
// Flying Blue must ALWAYS be included for these, regardless of matching logic.
const FLYING_BLUE_AIRLINES = new Set([
  "Air France", "KLM", "Transavia France", "Transavia", "HOP! Air France",
]);

// Star Alliance airlines for which Aeroplan should always be guaranteed
const AEROPLAN_GUARANTEE_AIRLINES = new Set([
  "Air Canada", "United", "Lufthansa", "Turkish Airlines", "Singapore Airlines",
  "Ethiopian Airlines", "Swiss", "South African Airways", "EgyptAir",
  "TAP Air Portugal", "All Nippon Airways", "Avianca",
  "Brussels Airlines", "Austrian Airlines", "LOT Polish Airlines", "SAS",
]);

// Airlines for which Singapore KrisFlyer should always be guaranteed
const KRISFLYER_GUARANTEE_AIRLINES = new Set([
  "Singapore Airlines", "All Nippon Airways",
]);

function getProgramsForAirline(airline: string): Array<{ program: string; type: "DIRECT" | "ALLIANCE" }> {
  const results: Array<{ program: string; type: "DIRECT" | "ALLIANCE" }> = [];
  const airlineAlliance = ALLIANCES[airline];

  for (const [program, programAirline] of Object.entries(PROGRAM_TO_AIRLINE)) {
    if (PROGRAMS_BY_NAME[program]?.isBookable === false) continue;
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

  // Hard guarantee: Flying Blue is always available on Air France-KLM group.
  // Defensive against airline name normalization edge cases (code-shares, IATA
  // lookup misses) that would otherwise silently drop the most relevant program.
  if (FLYING_BLUE_AIRLINES.has(airline) && !results.some(r => r.program === "Flying Blue")) {
    results.push({ program: "Flying Blue", type: airline === "Air France" ? "DIRECT" : "ALLIANCE" });
  }

  // Guarantee Aeroplan for all Star Alliance airlines
  if (AEROPLAN_GUARANTEE_AIRLINES.has(airline) && !results.some(r => r.program === "Aeroplan")) {
    results.push({ program: "Aeroplan", type: airline === "Air Canada" ? "DIRECT" : "ALLIANCE" });
  }

  // Guarantee Singapore KrisFlyer for Singapore Airlines and close Star Alliance partners
  if (KRISFLYER_GUARANTEE_AIRLINES.has(airline) && !results.some(r => r.program === "Singapore KrisFlyer")) {
    results.push({ program: "Singapore KrisFlyer", type: airline === "Singapore Airlines" ? "DIRECT" : "ALLIANCE" });
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
  effectivePrices: Map<string, number>,
): MilesOption {
  // Market value of a mile for this program (cents).
  // For TRANSFER: use the source currency's value (e.g. Amex MR value).
  const sourceProgram = via ?? program;
  const baseCents =
    effectivePrices.get(sourceProgram) ??
    effectivePrices.get(program) ??
    MILES_PRICE_MAP.get(sourceProgram) ??
    MILES_PRICE_MAP.get(program) ??
    DEFAULT_MILE_VALUE_CENTS;

  // valuePerMile is constant per program — no contextual adjustment.
  // This ensures consistent, predictable comparisons across routes.
  const valuePerMile = baseCents;

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

  const explanation = buildOptionExplanation(type, program, via, milesRequired, taxes, undefined);

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
    explanation,
    isBestDeal: false,
    chartSource,
  };
}

// ─── Helper: human-readable per-option explanation ────────────────────────────

function buildOptionExplanation(
  type: "DIRECT" | "ALLIANCE" | "TRANSFER",
  program: string,
  via: string | undefined,
  milesRequired: number,
  taxes: number,
  promoApplied: string | undefined,
): string {
  const typeLabel =
    type === "DIRECT"   ? "direct" :
    type === "ALLIANCE" ? "alliance" :
    via?.startsWith("Achat") ? `achat via ${via}` :
    `transfert ${via ?? ""}`;

  const milesFormatted = milesRequired.toLocaleString("fr-FR");
  const promoNote = promoApplied ? ` · ${promoApplied}` : "";

  return `${program} (${typeLabel}) · ${milesFormatted} miles + $${taxes} taxes${promoNote}`;
}

// ─── Accessibility penalty ────────────────────────────────────────────────────

const ACCESSIBILITY_MULTIPLIER: Record<1 | 2 | 3, number> = {
  1: 1.0,
  2: 1.2,
  3: 1.4,
};

function accessibilityPenalty(programName: string): number {
  const score = PROGRAMS_BY_NAME[programName]?.accessibilityScore ?? 2;
  return ACCESSIBILITY_MULTIPLIER[score];
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildCostOptions(
  flight: FlightInput,
  effectivePrices: Map<string, number>
): CostComparison {
  const { from, to, totalPrice: cashTotal, airlines, cabin, tripType, passengers } = flight;

  const originZone = getZone(from) ?? undefined;
  const destZone   = getZone(to)   ?? undefined;
  const operatingAirline = airlines[0] ?? "";

  const milesOptions: MilesOption[] = [];

  // ── Pre-compute airport coordinates (used for dynamic global options) ───────
  const fromAirport = AIRPORTS.find(a => a.code === from);
  const toAirport   = AIRPORTS.find(a => a.code === to);

  // ── Direct + Alliance options ──────────────────────────────────────────────
  const programs = getProgramsForAirline(operatingAirline);

  // Zone fallback: used for month-matrix results where no airline codes are
  // available. When the operating airline IS known (even if not in PROGRAM_TO_AIRLINE),
  // we must filter zone-fallback programs by alliance to avoid suggesting
  // irrelevant programs (e.g. Turkish Miles on Ryanair flights).
  const useZoneFallback = programs.length === 0 && originZone && destZone;
  const operatingAlliance = ALLIANCES[operatingAirline] ?? null;

  const effectivePrograms = useZoneFallback
    ? Object.entries(PROGRAM_TO_AIRLINE)
        .filter(([program, programAirline]) => {
          if (PROGRAMS_BY_NAME[program]?.isBookable === false) return false;
          // Unknown airline (empty string, month-matrix): allow all programs
          if (!operatingAirline) return true;
          // Known airline but not in any alliance: exclude all programs
          // (low-cost carriers, independent airlines with no partner network)
          if (!operatingAlliance) return false;
          // Independent airlines: only match programs from the same airline
          if (operatingAlliance === "Independent") {
            return ALLIANCES[programAirline] === "Independent";
          }
          // Alliance airline: only match programs in the same alliance
          return ALLIANCES[programAirline] === operatingAlliance;
        })
        .map(([program, airline]) => ({
          program,
          type: "ALLIANCE" as const,
          inferredAirline: airline,
        }))
    : programs.map((p) => ({ ...p, inferredAirline: operatingAirline }));

  for (const entry of effectivePrograms) {
    const airlineForTaxes = useZoneFallback ? entry.inferredAirline : operatingAirline;
    if (!originZone || !destZone) {
      const { miles, source } = getMilesRequired(entry.program, "EUROPE", "EUROPE", cabin, tripType, passengers);
      const taxes = getAwardTaxes(airlineForTaxes, cabin, passengers, from, to, originZone, destZone)
        * (tripType === "roundtrip" ? 2 : 1);
      milesOptions.push(buildOption(entry.type, entry.program, undefined, airlineForTaxes, miles, source, taxes, cashTotal, effectivePrices));
      continue;
    }
    const { miles, source } = getMilesRequired(entry.program, originZone, destZone, cabin, tripType, passengers);
    const taxes = getAwardTaxes(airlineForTaxes, cabin, passengers, from, to, originZone, destZone)
      * (tripType === "roundtrip" ? 2 : 1);
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
    const taxes = getAwardTaxes(airlineForTaxes, cabin, passengers, from, to, originZone, destZone)
      * (tripType === "roundtrip" ? 2 : 1);

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
      effectivePrices,
    );
    if (promoApplied) {
      opt.promoApplied = promoApplied;
      opt.explanation = buildOptionExplanation("TRANSFER", bonus.to, bonus.from, sourceMiles, taxes, promoApplied);
    }
    milesOptions.push(opt);
  }

  // ── Dynamic global options (for routes/programs not in hardcoded charts) ──
  // Uses distance-based estimation to suggest ANY program worldwide
  if (fromAirport && toAirport) {
    const cabinMap: Record<Cabin, CabinClass> = {
      economy: "economy", premium: "premium_economy", business: "business", first: "first"
    };
    const dynamicCabin = cabinMap[cabin];

    // Only add dynamic options for programs NOT already covered by hardcoded charts
    const coveredPrograms = new Set(milesOptions.map(o => o.program));

    for (const prog of GLOBAL_PROGRAMS) {
      if (prog.isBookable === false) continue;
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

      // Score-3 "Independent" programs (Hainan, niche carriers) have no partner
      // networks — they can only book their own airline's flights.
      // Only show them when the operating airline IS the program's own airline.
      const isRestrictedIndependent =
        prog.alliance === "Independent" &&
        (PROGRAMS_BY_NAME[prog.name]?.accessibilityScore ?? 2) === 3;
      if (isRestrictedIndependent && operatingAirline && operatingAirline !== prog.airline) continue;

      const estimate = estimateMilesRequired(
        prog.name,
        prog.alliance,
        fromAirport.lat, fromAirport.lon,
        toAirport.lat, toAirport.lon,
        dynamicCabin,
        tripType,
        passengers,
        originZone,
        destZone,
      );

      // Compute taxes: route+airline based, RT-aware
      const taxes = getAwardTaxes(prog.airline, cabin, passengers, from, to, originZone, destZone)
        * (tripType === "roundtrip" ? 2 : 1);

      // Market value of miles — constant per program, no contextual adjustment
      const baseCents = effectivePrices.get(prog.name) ?? prog.marketValueCents;
      const valuePerMile = baseCents;
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
        explanation: buildOptionExplanation("ALLIANCE", prog.name, undefined, estimate.milesRequired, taxes, undefined),
        isBestDeal: false,
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
        explanation: buildOptionExplanation("TRANSFER", opt.program, `Achat ${acquisition.cheapest.source}`, opt.milesRequired, opt.taxes, undefined),
        isBestDeal: false,
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
    .sort((a, b) =>
      a.totalMilesCost * accessibilityPenalty(a.program) -
      b.totalMilesCost * accessibilityPenalty(b.program)
    )
    .slice(0, 12);

  // ── DECISION: compare REAL TOTAL COSTS ────────────────────────────────────
  const bestOption = dedupedOptions[0] ?? null;
  const bestMilesCost = bestOption?.totalMilesCost ?? Infinity;
  const signedSavings = cashTotal - bestMilesCost;  // positive = miles cheaper
  const savings = Math.round(Math.abs(signedSavings) * 100) / 100;

  // Strict: USE_MILES only when best miles cost is strictly cheaper than cash
  const recommendation: Recommendation = (bestOption !== null && bestOption.totalMilesCost < cashTotal)
    ? "USE_MILES"
    : "USE_CASH";

  // NOTE: displayMessage is not rendered by the UI (FlightCard generates it client-side
  // with the user's currency via fmt()). This server-side value is kept for logging only.
  const displayMessage: string = !bestOption
    ? "no_miles_option"
    : recommendation === "USE_MILES"
      ? `miles_cheaper:${Math.round(savings)}`
      : `cash_cheaper:${Math.round(savings)}`;

  // Trust disclaimer
  const disclaimer =
    "⚠️ Prix indicatifs basés sur tarifs réels et valeurs de miles estimées — vérifiez la disponibilité avant de réserver.";

  // Mark best deal: prefer accessible (score 1 or 2) options over score-3 programs.
  // Score-3 programs may still appear in the list for users who hold those miles,
  // but they should never surface as the headline recommendation.
  if (dedupedOptions.length > 0) {
    const hasAccessibleOption = dedupedOptions.some(
      (o) => (PROGRAMS_BY_NAME[o.program]?.accessibilityScore ?? 2) <= 2,
    );
    const bestDeal = hasAccessibleOption
      ? dedupedOptions.find((o) => (PROGRAMS_BY_NAME[o.program]?.accessibilityScore ?? 2) <= 2)!
      : dedupedOptions[0]; // fall back to cheapest if no accessible option exists
    bestDeal.isBestDeal = true;
  }

  // Legacy explanation string
  const explanation = bestOption
    ? recommendation === "USE_MILES"
      ? `Économisez ${Math.round(savings)} en utilisant ${bestOption.program}${bestOption.via ? ` via ${bestOption.via}` : ""} (${bestOption.milesRequired.toLocaleString()} miles + ${bestOption.taxes} taxes = ${bestMilesCost} vs ${cashTotal} cash)`
      : signedSavings < 0
        ? `Le cash est moins cher de ${Math.round(savings)}. Miles coûteraient ${bestMilesCost} vs ${cashTotal} cash.`
        : `Quasi identique — cash légèrement avantageux de ${Math.round(savings)}.`
    : `Aucune option miles disponible. Payez en cash (${cashTotal}).`;

  return {
    cashCost: cashTotal,
    milesCost: bestOption ? bestMilesCost : 0,
    savings,
    recommendation,
    displayMessage,
    disclaimer,
    bestOption,
    milesOptions: dedupedOptions,
    scenarios: buildScenarios(dedupedOptions),
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
