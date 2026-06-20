// lib/costEngine.ts
import { getZone } from "./zones";
import { getAwardTaxes } from "@/data/awardTaxes";
import { getMilesRequired } from "@/data/awardCharts";
import { MILES_PRICE_MAP, MILES_CONFIDENCE_MAP, DEFAULT_MILE_VALUE_CENTS, type Confidence } from "@/data/milesPrices";
import { TRANSFER_BONUSES as TRANSFER_BONUSES_STATIC, getEffectiveRatio } from "@/data/transferBonuses";
import type { TransferBonusRecord } from "@/data/transferBonuses";
import { ALLIANCES } from "./alliances";
import { estimateMilesRequired, type CabinClass } from "./dynamicAwardEngine";
import { GLOBAL_PROGRAMS, PROGRAMS_BY_NAME } from "./globalPrograms";
import { calculateAcquisitionCost } from "./milesAcquisition";
import { AIRPORTS, type Airport } from "@/data/airports";

// Pre-built Map for O(1) airport lookup (AIRPORTS has 410 entries — linear scan per call is wasteful)
const AIRPORTS_BY_CODE: Map<string, Airport> = new Map(AIRPORTS.map(a => [a.code, a]));
import type { Cabin, TripType } from "./engine";
import { buildScenarios, type Scenario } from "./scenarioEngine";

// ─── In-Memory Cache for Bonus Transfers ──────────────────────────────────────
// Populated on app startup from Redis or static fallback.
// This allows synchronous access from costEngine while still supporting dynamic updates.
let cachedBonusTransfers: TransferBonusRecord[] = TRANSFER_BONUSES_STATIC;

/**
 * Get bonus transfers (sync).
 * Uses in-memory cache populated at app startup.
 * Falls back to static data if cache not initialized.
 */
export function getBonusTransfers(): TransferBonusRecord[] {
  return cachedBonusTransfers;
}

/**
 * Initialize bonus transfers cache (called at app startup).
 * Loads from Redis if available, falls back to static data.
 */
export async function initializeBonusTransfers(): Promise<void> {
  const { loadBonusTransfers } = await import("./bonusTransfersRedis");
  try {
    cachedBonusTransfers = await loadBonusTransfers();
  } catch {
    // Fallback to static data on error
    cachedBonusTransfers = TRANSFER_BONUSES_STATIC;
  }
}

// ─── Public types ─────────────────────────────────────────────────────────────

export type Recommendation = "USE_MILES" | "USE_CASH" | "IF_HAVE_MILES";

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
  savings: number;                // cashCost - milesCost: positive = miles cheaper, negative = cash cheaper
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
export const PROGRAM_TO_AIRLINE: Record<string, string> = {
  // ─── SkyTeam ───────────────────────────────────────────────────────────────
  "Flying Blue":             "Air France",        // Air France + KLM
  "Delta SkyMiles":          "Delta",             // matches iataToAirline("DL")
  "Korean Air SKYPASS":      "Korean Air",
  "Kenya Airways Mileage Club": "Kenya Airways",  // SkyTeam, NBO hub — P5 Task 2.4
  // ─── Star Alliance ─────────────────────────────────────────────────────────
  "Turkish Miles&Smiles":    "Turkish Airlines",
  "Ethiopian ShebaMiles":    "Ethiopian Airlines",
  "Air Canada Aeroplan":     "Air Canada",
  "United MileagePlus":      "United",
  "Lufthansa Miles & More":  "Lufthansa",
  "Singapore KrisFlyer":     "Singapore Airlines",
  "ANA Mileage Club":        "All Nippon Airways",
  "LifeMiles":               "Avianca",
  "COPA ConnectMiles":       "Copa Airlines",     // P5 Scaling Task 1.4 — MIA hub
  // ─── Oneworld ──────────────────────────────────────────────────────────────
  "Aeromexico Club Premier":  "Aeromexico",       // P5 Task 3.1 — MEX hub
  "British Airways Avios":   "British Airways",   // awardCharts key
  "Qatar Privilege Club":    "Qatar Airways",
  "AAdvantage":              "American Airlines",
  "Iberia Avios Plus":       "Iberia",
  "Japan Airlines Mileage Bank": "Japan Airlines",
  "LATAM Pass":              "LATAM Brasil",
  "Qantas Frequent Flyer":   "Qantas",
  "Alaska Mileage Plan":     "Alaska Airlines",  // Oneworld — bookable on BA/QR/AA partners
  "Cathay Pacific Asia Miles": "Cathay Pacific", // static chart added in audit-21
  "Malaysia Airlines Enrich":  "Malaysia Airlines",
  "Thai Royal Orchid Plus":    "Thai Airways",    // P5 Scaling Task 1.2 — BKK hub
  "Finnair Plus":              "Finnair",          // Oneworld — HEL hub
  "Royal Air Maroc Safar Flyer": "Royal Air Maroc",  // P5 Scaling Task 1.5 — CMN hub
  "South African Voyager":   "South African Airways", // P5 Scaling Task 1.5 — JNB hub
  // ─── P5 Task 2.1: 10 European Programs ────────────────────────────────────
  "Swiss Miles":             "Swiss International Air Lines", // Star Alliance, ZRH hub
  "TAP Air Portugal Miles":  "TAP Air Portugal",              // Star Alliance, LIS hub
  "LOT Polish Airlines Frequent Flyer": "LOT Polish Airlines", // Star Alliance, WAW hub
  "SAS EuroBonus":           "SAS",                           // Star Alliance, CPH hub
  // ─── P5 Task 2.2: 10 Asian Programs ───────────────────────────────────────
  "Air India Flying Returns": "Air India",                    // Star Alliance, DEL hub
  "Garuda GarudaMiles":       "Garuda Indonesia",              // Star Alliance, CGK hub
  "EVA Air Points":           "EVA Air",                       // Star Alliance, TPE hub
  "Asiana Airlines Club":     "Asiana Airlines",               // Star Alliance, ICN hub
  // ─── Independent ───────────────────────────────────────────────────────────
  "Emirates Skywards":       "Emirates",
  "Etihad Guest":            "Etihad",            // matches alliances.ts key
  "Virgin Atlantic Flying Club": "Virgin Atlantic",
};

// ─── Operator → flagship program (hard guarantees) ───────────────────────────
// Explicit airline-name → program map used in Step 3 of getProgramsForAirline.
// This is a direct lookup complementing the inverse PROGRAM_TO_AIRLINE iteration.
// Covers edge cases: multi-segment flights where the flagship carrier isn't airlines[0],
// naming variants (LATAM Airlines vs LATAM Brasil), and any future iataToAirline gaps.
//
// Rule: if any airline in flight.airlines is a key here, its program is injected
// BEFORE ranking — goes through the full cost/scoring pipeline, never forced to top.
const OPERATOR_TO_PROGRAM: Record<string, string> = {
  // Star Alliance
  "Singapore Airlines":  "Singapore KrisFlyer",
  "All Nippon Airways":  "ANA Mileage Club",
  "United":              "United MileagePlus",
  "Lufthansa":           "Lufthansa Miles & More",
  "Turkish Airlines":    "Turkish Miles&Smiles",
  "Ethiopian Airlines":  "Ethiopian ShebaMiles",
  "Air Canada":          "Air Canada Aeroplan",
  "Avianca":             "LifeMiles",
  "Copa Airlines":       "COPA ConnectMiles",   // P5 Scaling Task 1.4 — MIA hub
  "Aeromexico":          "Aeromexico Club Premier", // P5 Task 3.1 — MEX hub
  // Oneworld
  "Japan Airlines":      "Japan Airlines Mileage Bank",
  "British Airways":     "British Airways Avios",
  "American Airlines":   "AAdvantage",
  "Qatar Airways":       "Qatar Privilege Club",
  "Cathay Pacific":      "Cathay Pacific Asia Miles",
  "Qantas":              "Qantas Frequent Flyer",
  "Iberia":              "Iberia Avios Plus",
  "LATAM Airlines":      "LATAM Pass",   // iataToAirline("LA") returns this name
  "LATAM Brasil":        "LATAM Pass",   // alliances.ts canonical name
  // Malaysia Airlines Enrich is intentionally NOT in OPERATOR_TO_PROGRAM:
  // MH has codeshares on many routes it doesn't operate, causing Enrich to appear
  // globally (DSS→CDG, SIN→LAX, DXB→JFK). Enrich is only guaranteed via
  // HOME_CARRIER_PROGRAMS for KUL hub routes where MH actually operates.
  "Thai Airways":        "Thai Royal Orchid Plus", // P5 Scaling Task 1.2 — BKK hub
  "Finnair":             "Finnair Plus", // Oneworld — HEL-JFK, HEL-BKK hub
  "Royal Air Maroc":     "Royal Air Maroc Safar Flyer", // P5 Scaling Task 1.5 — CMN hub
  "South African Airways": "South African Voyager", // P5 Scaling Task 1.5 — JNB hub
  // P5 Task 2.1: 10 European Programs
  "Swiss International Air Lines": "Swiss Miles",
  "Swiss":               "Swiss Miles",
  "TAP Air Portugal":    "TAP Air Portugal Miles",
  "LOT Polish Airlines": "LOT Polish Airlines Frequent Flyer",
  "SAS":                 "SAS EuroBonus",
  "Scandinavian Airlines": "SAS EuroBonus",
  // P5 Task 2.2: 10 Asian Programs
  "Air India":           "Air India Flying Returns",
  "Garuda Indonesia":    "Garuda GarudaMiles",
  "EVA Air":             "EVA Air Points",
  "Asiana Airlines":     "Asiana Airlines Club",
  // SkyTeam
  "Air France":          "Flying Blue",
  "KLM":                 "Flying Blue",
  "Transavia France":    "Flying Blue",
  "Transavia":           "Flying Blue",
  "HOP! Air France":     "Flying Blue",
  "Delta":               "Delta SkyMiles",
  "Korean Air":          "Korean Air SKYPASS",
  "Kenya Airways":       "Kenya Airways Mileage Club", // P5 Task 2.4 — NBO hub
  // Independent
  "Emirates":            "Emirates Skywards",
  "Etihad":              "Etihad Guest",
  "Virgin Atlantic":     "Virgin Atlantic Flying Club",
  "Alaska Airlines":     "Alaska Mileage Plan",
};

// Airlines whose native program is Flying Blue (Air France-KLM group).
// Flying Blue must ALWAYS be included for these, regardless of matching logic.
const FLYING_BLUE_AIRLINES = new Set([
  "Air France", "KLM", "Transavia France", "Transavia", "HOP! Air France",
]);

// Star Alliance airlines for which Aeroplan should always be guaranteed
const AEROPLAN_GUARANTEE_AIRLINES = new Set([
  "Air Canada", "United", "Lufthansa", "Turkish Airlines", "Singapore Airlines",
  "Ethiopian Airlines", "Swiss", "Swiss International Air Lines", "South African Airways", "EgyptAir",
  "TAP Air Portugal", "All Nippon Airways", "Avianca",
  "Brussels Airlines", "Austrian Airlines", "LOT Polish Airlines", "SAS", "Scandinavian Airlines", "Finnair",
  // Additional Star Alliance members — ensures Aeroplan surfaces on their routes
  "Air India", "Air China", "Asiana Airlines", "EVA Air", "Thai Airways",
  "Copa Airlines", "Garuda Indonesia", "Aegean Airlines",
]); // Thai Airways already listed

// Airlines for which Singapore KrisFlyer should always be guaranteed
const KRISFLYER_GUARANTEE_AIRLINES = new Set([
  "Singapore Airlines", "All Nippon Airways",
]);

// Airlines for which British Airways Avios should always be guaranteed (Oneworld metal)
const BA_AVIOS_GUARANTEE_AIRLINES = new Set([
  "British Airways", "Iberia", "American Airlines", "Qatar Airways",
  "Japan Airlines", "Finnair", "Royal Air Maroc",
  // Additional Oneworld members — ensures BA Avios surfaces on their routes
  "Cathay Pacific", "Qantas", "Malaysia Airlines", "Alaska Airlines",
  "LATAM Airlines", "LATAM Brasil", "Royal Jordanian", "SriLankan Airlines",
]);

interface ProgramMatch {
  program: string;
  type: "DIRECT" | "ALLIANCE";
  /** The specific airline that triggered this match — used for correct tax calculation. */
  matchedAirline: string;
}

/**
 * Resolve loyalty programs for a set of airlines operating a route.
 *
 * Accepts the FULL airlines array (not just airlines[0]) so that multi-airline
 * month-matrix results (e.g. ["Air Senegal", "Air France"]) correctly find
 * Flying Blue via the Air France entry rather than silently dropping it.
 *
 * Priority:
 *   1. Direct match — programAirline is in the airlines list
 *   2. Alliance match — same alliance as the primary (first) airline
 *   3. Airline-based guarantee — any airline in the list triggers the guarantee
 *      (HIGH PRIORITY: airline-specific, fires regardless of alliance)
 */
function getProgramsForAirline(airlines: string[]): ProgramMatch[] {
  const results: ProgramMatch[] = [];
  const primary = airlines[0] ?? "";
  const primaryAlliance = ALLIANCES[primary];

  for (const [program, programAirline] of Object.entries(PROGRAM_TO_AIRLINE)) {
    if (PROGRAMS_BY_NAME[program]?.isBookable === false) continue;
    // Direct match: any airline in the list IS the program's own airline
    const directMatch = airlines.find((a) => a === programAirline);
    if (directMatch) {
      results.push({ program, type: "DIRECT", matchedAirline: directMatch });
    } else if (
      primaryAlliance &&
      primaryAlliance !== "Independent" &&
      ALLIANCES[programAirline] === primaryAlliance
    ) {
      results.push({ program, type: "ALLIANCE", matchedAirline: primary });
    }
  }

  // ── Airline-based guarantees (HIGH PRIORITY) ──────────────────────────────
  // Checked against ALL airlines in the list. This catches cases where the
  // FIRST airline is an independent carrier (e.g. Air Senegal) but Air France
  // is also in the list — Flying Blue must still be guaranteed.

  const fbMatch = airlines.find((a) => FLYING_BLUE_AIRLINES.has(a));
  if (fbMatch && PROGRAMS_BY_NAME["Flying Blue"]?.isBookable !== false && !results.some((r) => r.program === "Flying Blue")) {
    results.push({ program: "Flying Blue", type: fbMatch === "Air France" ? "DIRECT" : "ALLIANCE", matchedAirline: fbMatch });
  }

  const aeroplanMatch = airlines.find((a) => AEROPLAN_GUARANTEE_AIRLINES.has(a));
  if (aeroplanMatch && PROGRAMS_BY_NAME["Air Canada Aeroplan"]?.isBookable !== false && !results.some((r) => r.program === "Air Canada Aeroplan")) {
    results.push({ program: "Air Canada Aeroplan", type: aeroplanMatch === "Air Canada" ? "DIRECT" : "ALLIANCE", matchedAirline: aeroplanMatch });
  }

  const kfMatch = airlines.find((a) => KRISFLYER_GUARANTEE_AIRLINES.has(a));
  if (kfMatch && PROGRAMS_BY_NAME["Singapore KrisFlyer"]?.isBookable !== false && !results.some((r) => r.program === "Singapore KrisFlyer")) {
    results.push({ program: "Singapore KrisFlyer", type: kfMatch === "Singapore Airlines" ? "DIRECT" : "ALLIANCE", matchedAirline: kfMatch });
  }

  // ── Step 3: Operator-based flagship injection ─────────────────────────────
  // For each airline actually present in this flight, ensure its primary loyalty
  // program is included. This is a direct O(1) lookup that complements the
  // inverse PROGRAM_TO_AIRLINE iteration above. It catches:
  //   • Multi-segment flights where the flagship carrier isn't airlines[0]
  //   • Naming drift (e.g. "LATAM Airlines" vs "LATAM Brasil")
  //   • Any future iataToAirline additions not yet in PROGRAM_TO_AIRLINE
  // Programs go through full cost/scoring/ranking — nothing is forced to top.
  for (const airline of airlines) {
    const flagship = OPERATOR_TO_PROGRAM[airline];
    if (
      flagship &&
      PROGRAMS_BY_NAME[flagship]?.isBookable !== false &&
      !results.some((r) => r.program === flagship)
    ) {
      results.push({ program: flagship, type: "DIRECT", matchedAirline: airline });
    }
  }

  return results;
}

// ─── Corridor guarantees ─────────────────────────────────────────────────────
// Programs that must always appear on specific route corridors, regardless of
// which airline operated the flight. Applied unconditionally pre-loop so they
// participate in the same cost calculation, scoring, and ranking as all other
// programs.
//
// Priority: airline-based guarantees (getProgramsForAirline) fire first;
// corridor guarantees only ADD programs not already present.

interface CorridorGuarantee {
  program: string;
  type: "DIRECT" | "ALLIANCE";
  inferredAirline: string;
}

function getCorridorGuarantees(originZone: string, destZone: string, airlines: string[] = []): CorridorGuarantee[] {
  const g: CorridorGuarantee[] = [];

  const isEuropeAfrica =
    (originZone === "EUROPE" && destZone.startsWith("AFRICA_")) ||
    (originZone.startsWith("AFRICA_") && destZone === "EUROPE");

  const isAsiaNorthAmerica =
    (originZone === "ASIA" && destZone === "NORTH_AMERICA") ||
    (originZone === "NORTH_AMERICA" && destZone === "ASIA");

  const involvesSouthAmerica =
    originZone === "SOUTH_AMERICA" || destZone === "SOUTH_AMERICA";

  const isEuropeIntra = originZone === "EUROPE" && destZone === "EUROPE";

  // Middle East ↔ Europe, North America, or Africa — Emirates/Etihad are the flagship carriers
  const isMiddleEastLongHaul =
    (originZone === "MIDDLE_EAST" && (destZone === "EUROPE" || destZone === "NORTH_AMERICA" || destZone.startsWith("AFRICA_"))) ||
    (destZone === "MIDDLE_EAST" && (originZone === "EUROPE" || originZone === "NORTH_AMERICA" || originZone.startsWith("AFRICA_")));

  // Europe ↔ Africa — Flying Blue only when AF/KLM metal is involved.
  // Flying Blue cannot be redeemed on unrelated carriers (e.g. Ethiopian, Turkish).
  // When airlines list is empty/unknown we still inject it (conservative: better
  // to show an extra option than silently hide it).
  const fbPresent = airlines.length === 0 || airlines.some((a) => FLYING_BLUE_AIRLINES.has(a));
  const canBook = (name: string) => PROGRAMS_BY_NAME[name]?.isBookable !== false;

  if (isEuropeAfrica && fbPresent && canBook("Flying Blue")) {
    g.push({ program: "Flying Blue", type: "DIRECT", inferredAirline: "Air France" });
  }

  // Asia ↔ North America — KrisFlyer + ANA + JAL (three primary programs)
  if (isAsiaNorthAmerica) {
    if (canBook("Singapore KrisFlyer"))        g.push({ program: "Singapore KrisFlyer",       type: "DIRECT", inferredAirline: "Singapore Airlines" });
    if (canBook("ANA Mileage Club"))           g.push({ program: "ANA Mileage Club",           type: "DIRECT", inferredAirline: "All Nippon Airways" });
    if (canBook("Japan Airlines Mileage Bank"))g.push({ program: "Japan Airlines Mileage Bank",type: "DIRECT", inferredAirline: "Japan Airlines"     });
  }

  // South America routes — LATAM Pass + LifeMiles (flagship programs for this corridor)
  if (involvesSouthAmerica) {
    if (canBook("LATAM Pass")) g.push({ program: "LATAM Pass", type: "DIRECT", inferredAirline: "LATAM Brasil" });
    if (canBook("LifeMiles"))  g.push({ program: "LifeMiles",  type: "DIRECT", inferredAirline: "Avianca"      });
  }

  // Intra-Europe — Iberia Avios Plus (best short-haul value in Europe)
  if (isEuropeIntra && canBook("Iberia Avios Plus")) {
    g.push({ program: "Iberia Avios Plus", type: "DIRECT", inferredAirline: "Iberia" });
  }

  // Middle East ↔ Europe / North America — Emirates Skywards (flagship hub carrier)
  if (isMiddleEastLongHaul && canBook("Emirates Skywards")) {
    g.push({ program: "Emirates Skywards", type: "DIRECT", inferredAirline: "Emirates" });
  }

  // Oneworld transatlantic / long-haul — BA Avios when Oneworld metal is confirmed operating.
  // Do NOT fire on empty airline list: AF/KLM month-matrix searches pass [] and showing
  // BA Avios on Air France metal would mislead users.
  const isLongHaulWithOneworld =
    airlines.length > 0 && airlines.some((a) => BA_AVIOS_GUARANTEE_AIRLINES.has(a));
  const isLongHaul =
    (originZone === "EUROPE" && (destZone === "NORTH_AMERICA" || destZone === "ASIA")) ||
    (destZone === "EUROPE" && (originZone === "NORTH_AMERICA" || originZone === "ASIA")) ||
    (originZone.startsWith("AFRICA_") && destZone === "EUROPE") ||
    (destZone.startsWith("AFRICA_") && originZone === "EUROPE");
  if (isLongHaul && isLongHaulWithOneworld && canBook("British Airways Avios")) {
    g.push({ program: "British Airways Avios", type: "DIRECT", inferredAirline: "British Airways" });
  }

  return g;
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
  // For DIRECT/ALLIANCE: valuePerMile = destination program's cents/mile.
  // For TRANSFER: milesCost uses the SOURCE currency's cents/unit (opportunity
  // cost — e.g. Amex MR 2.0¢ per MR point burned), while valuePerMile also
  // reflects that source value so the UI formula stays self-consistent.
  // This is intentional: "how much does it cost me to burn X Amex MR points?"
  // is the right pricing question for a transfer.  The destination program's
  // own value (e.g. FB 1.5¢) would understate the true cost.
  const sourceProgram = via ?? program;
  const baseCents =
    effectivePrices.get(sourceProgram) ??
    effectivePrices.get(program) ??
    MILES_PRICE_MAP.get(sourceProgram) ??
    MILES_PRICE_MAP.get(program) ??
    DEFAULT_MILE_VALUE_CENTS;

  // valuePerMile — source currency value for TRANSFER, destination for others.
  // UI must label it "¢/pt" (not "¢/mile") when type === "TRANSFER" to avoid
  // implying that destination miles carry this valuation.
  const valuePerMile = baseCents;

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE FORMULA:  totalMilesCost = (milesRequired × valuePerMile) + taxes
  // For TRANSFER: milesRequired = destination miles needed; valuePerMile =
  // source currency cost/unit (assumes 1:1 ratio at transfer time).
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

// ─── Dynamic engine: per-program regional zone filter ────────────────────────
// Declared at module level (NOT inside the per-program loop) so the object is
// allocated ONCE and reused across all calls.
// Programs not listed here are allowed on any route.
const DYNAMIC_PROGRAM_SERVED_ZONES: Partial<Record<string, string[]>> = {
  "Air India Flying Returns":      ["ASIA", "EUROPE", "NORTH_AMERICA", "MIDDLE_EAST"],
  "Korean Air SKYPASS":            ["ASIA", "NORTH_AMERICA", "EUROPE"],
  "Thai Royal Orchid Plus":        ["ASIA", "EUROPE", "MIDDLE_EAST"],
  "Garuda GarudaMiles":            ["ASIA", "EUROPE", "NORTH_AMERICA"],
  "EVA Air Points":                ["ASIA", "EUROPE", "NORTH_AMERICA"],
  "Asiana Airlines Club":          ["ASIA", "EUROPE", "NORTH_AMERICA"],
  "Vietnam Airlines Lotusmiles":   ["ASIA"],
  "China Southern Sky Pearl Club": ["ASIA", "NORTH_AMERICA", "EUROPE"],
  "China Eastern Eastern Miles":   ["ASIA", "NORTH_AMERICA", "EUROPE"],
  "Hainan Fortune Wings Club":     ["ASIA"],
  "Aeromexico Club Premier":       ["NORTH_AMERICA", "SOUTH_AMERICA", "EUROPE"],
  "LATAM Pass":                    ["SOUTH_AMERICA", "NORTH_AMERICA", "EUROPE"],
};

// ─── Dynamic engine: per-program home-airport filter ─────────────────────────
// Prevents niche programs from appearing on routes with no home-country endpoint.
// Declared at module level — NOT inside the per-program loop.
const DYNAMIC_PROGRAM_HOME_AIRPORTS: Partial<Record<string, Set<string>>> = {
  "Air India Flying Returns": new Set([
    "DEL","BOM","CCU","MAA","HYD","BLR","AMD","GOI","COK","TRV",
    "IXC","ATQ","IXR","IXD","SXR","LKO","BBI","NAG","PAT","IXB",
    "GAU","VGA","VTZ","IXM","IXZ","CNN","IXE","IXA","DIB","IMF",
  ]),
  "Garuda GarudaMiles": new Set([
    "CGK","SUB","BDO","SRG","MES","YIA","KNO","BTJ",  // Jakarta, Surabaya, Bandung, Semarang, Medan, Yogyakarta, Kuala Namu, Balikpapan
  ]),
  "EVA Air Points": new Set([
    "TPE","KHH","TXG","RMQ","CYI","MZG","GNE",  // Taipei Taoyuan, Kaohsiung, Taichung, Taitung, Chiayi, Meizhou, Guangzhou
  ]),
  "Asiana Airlines Club": new Set([
    "ICN","GMP","CJU","PUS","TAE","CJJ","MWX","USN","KWJ",  // Seoul Incheon/Gimpo, Jeju, Busan, Daegu, Cheongju, Muan, Ulsan, Gwangju
  ]),
};

// ─── Accessibility penalty ────────────────────────────────────────────────────

const ACCESSIBILITY_MULTIPLIER: Record<1 | 2 | 3, number> = {
  1: 1.0,
  2: 1.1,
  3: 1.8,   // score-3 programs pushed well down the list — they're shown for users
             // who already hold those miles, not as headline recommendations
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
  const { from, to, totalPrice: cashTotal, airlines, cabin, tripType } = flight;
  const passengers = Math.max(1, Math.round(flight.passengers || 1)); // defensive: always ≥ 1

  // Guard: no valid cash price → skip miles comparison entirely
  if (!cashTotal || cashTotal <= 0) {
    return {
      cashCost: 0, milesCost: 0, savings: 0,
      recommendation: "USE_CASH",
      bestOption: null,
      milesOptions: [],
      scenarios: [],
      explanation: "No cash price available.",
      displayMessage: "no_cash_price",
      disclaimer: "",
    };
  }

  const originZone = getZone(from) ?? undefined;
  const destZone   = getZone(to)   ?? undefined;
  const operatingAirline = airlines[0] ?? "";

  const milesOptions: MilesOption[] = [];

  // ── Pre-compute airport coordinates (used for dynamic global options) ───────
  const fromAirport = AIRPORTS_BY_CODE.get(from);
  const toAirport   = AIRPORTS_BY_CODE.get(to);

  // ── Direct + Alliance options ──────────────────────────────────────────────
  // Pass the FULL airlines array so multi-airline routes (month-matrix +
  // discoverRouteAirlines) find the right programs even when airlines[0] is
  // an independent carrier that would otherwise block the guarantee logic.
  const programs = getProgramsForAirline(airlines);

  // Zone fallback: fires when no airline-based program was found AND zones are
  // known. This covers month-matrix results where discoverRouteAirlines failed
  // or returned only an empty-string airline.
  const useZoneFallback = programs.length === 0 && originZone && destZone;
  const operatingAlliance = ALLIANCES[operatingAirline] ?? null;

  const effectivePrograms: Array<{ program: string; type: "DIRECT" | "ALLIANCE"; inferredAirline: string }> = useZoneFallback
    ? (() => {
        const base: Array<{ program: string; type: "DIRECT" | "ALLIANCE"; inferredAirline: string }> =
          Object.entries(PROGRAM_TO_AIRLINE)
          .filter(([program, programAirline]) => {
            if (PROGRAMS_BY_NAME[program]?.isBookable === false) return false;
            // Empty/null airline: completely unknown — allow all programs (no data to filter on).
            if (!operatingAirline) return true;
            // Airline name known but NOT in alliances map: treat like Independent (apply the same
            // guard). This handles carriers like Fiji Airways, Saudia*, or any airline we haven't
            // catalogued yet — prevents Delta SkyMiles from leaking onto a Fiji Airways SIN→LAX
            // flight just because FJ's alliance is unknown. Corridor guarantees (KrisFlyer, ANA,
            // JAL for ASIA→NA) still inject the correct programs regardless of zone fallback.
            // (*Saudia has its own alliances.ts entry; this covers future unlisted carriers.)
            if (!operatingAlliance) {
              const progAlliance = ALLIANCES[programAirline];
              if (!progAlliance || progAlliance === "Independent") return true;
              return airlines.some((a) => ALLIANCES[a] === progAlliance);
            }
            // Independent carriers: only allow programs whose alliance has at least one airline
            // present in the FULL airlines list for this flight, or Independent programs.
            // This prevents e.g. LifeMiles (Star Alliance) from appearing on a Kuwait Airways
            // DXB→LHR flight (no Star Alliance metal on that specific itinerary), while still
            // allowing Emirates Skywards (Independent) for any Independent-carrier flight.
            // Exception: when airlines list is empty or all-unknown, fall back to allow-all so
            // we don't accidentally hide all options for truly unknown carriers.
            if (operatingAlliance === "Independent") {
              const progAlliance = ALLIANCES[programAirline];
              if (!progAlliance || progAlliance === "Independent") return true;
              return airlines.some((a) => ALLIANCES[a] === progAlliance);
            }
            // Alliance airline: only show same-alliance programs
            return ALLIANCES[programAirline] === operatingAlliance;
          })
          .map(([program, airline]) => ({
            program,
            type: "ALLIANCE" as const,
            inferredAirline: airline,
          }));

        return base;
      })()
    // Normal path: use matchedAirline (the specific airline that caused the
    // match) as inferredAirline so tax calculation uses the correct carrier —
    // not necessarily airlines[0] which may be a different airline.
    : programs.map((p) => ({ ...p, inferredAirline: p.matchedAirline }));

  // ── Apply corridor guarantees (pre-loop, unconditional) ────────────────────
  // Ensures flagship programs appear on their primary corridors regardless of
  // which specific airline Travelpayouts returned. Only adds programs not
  // already in effectivePrograms (no duplicates).
  //
  // Type assignment: a corridor-guaranteed program is set to DIRECT only when
  // the program's inferred airline actually appears in the flight's airlines list.
  // Example: KrisFlyer with inferredAirline "Singapore Airlines" on a BA-operated
  // NRT→LAX connecting flight via LHR → type ALLIANCE (you cannot redeem KrisFlyer
  // on BA metal). On an actual SQ-operated SIN→LAX flight → type DIRECT.
  const corridorGuaranteedPrograms = new Set<string>();
  if (originZone && destZone) {
    for (const g of getCorridorGuarantees(originZone, destZone, airlines)) {
      corridorGuaranteedPrograms.add(g.program);
      // DIRECT only when the inferred home carrier IS operating this specific flight
      const resolvedType: "DIRECT" | "ALLIANCE" =
        airlines.includes(g.inferredAirline) ? "DIRECT" : "ALLIANCE";
      if (!effectivePrograms.some((p) => p.program === g.program)) {
        effectivePrograms.push({ ...g, type: resolvedType });
      } else if (resolvedType === "DIRECT") {
        // Upgrade an existing ALLIANCE entry to DIRECT when home carrier confirmed
        const idx = effectivePrograms.findIndex(p => p.program === g.program);
        if (idx >= 0 && effectivePrograms[idx].type !== "DIRECT") {
          effectivePrograms[idx] = { ...effectivePrograms[idx], type: "DIRECT" };
        }
      }
    }
  }

  for (const entry of effectivePrograms) {
    // Always use the matched/inferred airline for taxes — this is the airline
    // the program actually uses on this route, regardless of which carrier
    // Travelpayouts happened to list first.
    const airlineForTaxes = entry.inferredAirline;
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

  // Middle-East hub programs are only relevant when Middle East is involved.
  // On intra-Europe routes (MAD→BCN, CDG→LHR, etc.) Emirates/Etihad/Qatar
  // only appear via long-haul hub connections (5h+ for a 1h flight) — misleading.
  const MIDDLE_EAST_HUB_PROGRAMS = new Set([
    "Emirates Skywards",
    "Etihad Guest",
    "Qatar Privilege Club",
  ]);

  for (const bonus of getBonusTransfers()) {
    if (!programNames.has(bonus.to)) continue;
    if (!originZone || !destZone) continue;
    // Skip Gulf hub programs on non-Middle-East routes — they can only fly via DXB/AUH/DOH
    // which is never optimal for routes not involving the Gulf.
    // Extended beyond intra-Europe: e.g. Amex MR → Emirates Skywards on NRT→LAX is never
    // the best use of points — the redemption would require a DXB connection.
    if (MIDDLE_EAST_HUB_PROGRAMS.has(bonus.to) &&
        originZone !== "MIDDLE_EAST" && destZone !== "MIDDLE_EAST") continue;

    // Always use the program's own airline for transfer taxes.
    // operatingAirline may be a different carrier (e.g. Air Senegal on a
    // DSS-CDG flight) — using it would give wrong tax figures.
    const airlineForTaxes = PROGRAM_TO_AIRLINE[bonus.to] ?? operatingAirline;

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
      // Note: operatingAlliance already computed above — re-use it, no re-declare.
      if (
        operatingAirline &&
        operatingAlliance &&
        operatingAlliance !== "Independent" &&
        prog.alliance !== operatingAlliance &&
        prog.alliance !== "Independent"
      ) continue;

      // Extended guard for Independent or unknown-alliance operating carriers: require at least
      // one airline in the full list to belong to the program's alliance before adding via
      // dynamic estimation. Without this, Iberia Avios appears on Air Senegal DSS→CDG because
      // Air Senegal is Independent → the first check above doesn't fire → Iberia gets estimated
      // as valid when no Oneworld metal exists. Same logic applies to unknown-alliance carriers
      // like Fiji Airways — prevents Delta SkyMiles from leaking onto SIN→LAX via dynamic path.
      if (
        operatingAirline && // airline is known
        (!operatingAlliance || operatingAlliance === "Independent") &&
        prog.alliance !== "Independent" &&
        !airlines.some((a) => ALLIANCES[a] === prog.alliance)
      ) continue;

      // Strict regional filter: exclude programs whose airlines don't serve these zones.
      // Prevents showing Air India on MIA-GRU, Korean Air on SA routes, etc.
      // IMPORTANT: declared at module level (DYNAMIC_PROGRAM_SERVED_ZONES) — NOT inside this loop.
      const servedZones = DYNAMIC_PROGRAM_SERVED_ZONES[prog.name];
      if (servedZones && originZone && destZone) {
        if (!servedZones.includes(originZone) || !servedZones.includes(destZone)) continue;
      }

      // Home-airport filter: some programs are only relevant when at least one
      // endpoint is in the airline's home country. Without this, Air India
      // appears on NRT→LAX and SIN→LAX (Star Alliance match) even though no
      // India connection exists — which misleads users.
      // IMPORTANT: declared at module level (DYNAMIC_PROGRAM_HOME_AIRPORTS) — NOT inside this loop.
      const homeAirports = DYNAMIC_PROGRAM_HOME_AIRPORTS[prog.name];
      if (homeAirports && !homeAirports.has(from) && !homeAirports.has(to)) continue;

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
    // For the top 5 cheapest programs, check if BUYING miles is still cheaper than cash
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

  // ── Zone-aware program filter ──────────────────────────────────────────────
  // Prevents geographically irrelevant programs from surfacing on routes they
  // have no operational connection to. Applied BEFORE deduplication so phantom
  // entries don't influence the bestOption ranking.
  //
  // Gulf hub programs (EK/EY/QR): only meaningful when a Middle East endpoint
  // is involved. On NRT→LAX, TP sometimes returns EK codeshare results —
  // this would inject Emirates Skywards as a DIRECT match. On routes like
  // BKK→CDG, Etihad would appear as an ALLIANCE match via Lufthansa Star Alliance.
  // Both are misleading: the redemption requires a 5–10h DXB/AUH/DOH detour.
  const REQUIRES_MIDDLE_EAST_ENDPOINT = new Set([
    "Emirates Skywards",
    "Etihad Guest",
    "Qatar Privilege Club",
  ]);
  // Asia-Pacific flagship programs: ALLIANCE matches only make sense when
  // Asia is an endpoint. JAL appearing on CMN→CDG (via RAM/Oneworld) or
  // Cathay Pacific on MAD→BCN (via Iberia/Oneworld) misleads users — the
  // redemption would require a routing via Asia. DIRECT matches are kept
  // (JAL DIRECT on NRT→LAX = JAL actually operates the flight → valid).
  const REQUIRES_ASIA_ENDPOINT = new Set([
    "Japan Airlines Mileage Bank",
    "ANA Mileage Club",
    "Cathay Pacific Asia Miles",
  ]);
  // Ethiopian ShebaMiles: primarily useful on ADD (Addis Ababa) routes.
  // On DXB→LHR it can appear via Star Alliance (Lufthansa) ALLIANCE match —
  // but Ethiopian doesn't operate that corridor and the detour via ADD is impractical.
  const REQUIRES_AFRICA_ENDPOINT = new Set([
    "Ethiopian ShebaMiles",
  ]);

  const filteredMilesOptions = milesOptions.filter((opt) => {
    // Gulf programs: filter all appearances when no Middle East endpoint
    if (
      REQUIRES_MIDDLE_EAST_ENDPOINT.has(opt.program) &&
      originZone !== "MIDDLE_EAST" &&
      destZone !== "MIDDLE_EAST"
    ) return false;
    // Asia-Pacific programs: filter ALLIANCE appearances when no Asia endpoint
    // DIRECT matches are preserved (e.g. JAL DIRECT on NRT→LAX)
    if (
      REQUIRES_ASIA_ENDPOINT.has(opt.program) &&
      opt.type === "ALLIANCE" &&
      originZone !== "ASIA" &&
      destZone !== "ASIA"
    ) return false;
    // Ethiopian: filter ALLIANCE appearances when no Africa endpoint
    if (
      REQUIRES_AFRICA_ENDPOINT.has(opt.program) &&
      opt.type === "ALLIANCE" &&
      !(originZone ?? "").startsWith("AFRICA_") &&
      !(destZone ?? "").startsWith("AFRICA_")
    ) return false;
    // Americas-only programs: LATAM Pass / Aeromexico only meaningful on routes
    // involving South or North America. They appear via Oneworld ALLIANCE matches
    // (e.g. LATAM Pass on CMN→CDG via BA/Oneworld) but with no real chart entry
    // the distance fallback gives unrealistically low miles (9 000 for Africa→Europe)
    // — the redemption is physically impossible on non-LATAM/non-Americas metal.
    if (
      (opt.program === "LATAM Pass" || opt.program === "Aeromexico Club Premier") &&
      opt.type === "ALLIANCE" &&
      originZone !== "SOUTH_AMERICA" && destZone !== "SOUTH_AMERICA" &&
      originZone !== "NORTH_AMERICA" && destZone !== "NORTH_AMERICA"
    ) return false;
    return true;
  });

  // ── Deduplicate: keep cheapest option per (program + via) key ─────────────
  const seen = new Map<string, MilesOption>();
  for (const opt of filteredMilesOptions) {
    const key = `${opt.program}::${opt.via ?? ""}`;
    const existing = seen.get(key);
    // Prefer DIRECT over ALLIANCE when cost is equal — avoids labeling a
    // direct-airline redemption as "alliance" just because the corridor
    // guarantee added it first.
    const cheaper = !existing || opt.totalMilesCost < existing.totalMilesCost;
    const samePrice = existing && opt.totalMilesCost === existing.totalMilesCost;
    const betterType = samePrice && opt.type === "DIRECT" && existing.type !== "DIRECT";
    if (cheaper || betterType) {
      seen.set(key, opt);
    }
  }

  const sortedOptions = Array.from(seen.values())
    .sort((a, b) =>
      a.totalMilesCost * accessibilityPenalty(a.program) -
      b.totalMilesCost * accessibilityPenalty(b.program)
    );

  // Corridor-guaranteed programs always appear FIRST, then remaining options sorted by cost.
  // This ensures flagship programs (KrisFlyer, ANA, JAL, Emirates, Flying Blue) are always
  // visible at the top of every card on their primary corridors — never buried past position 12.
  const corridorOpts    = sortedOptions.filter(o =>  corridorGuaranteedPrograms.has(o.program));
  const nonCorridorOpts = sortedOptions.filter(o => !corridorGuaranteedPrograms.has(o.program));
  const dedupedOptions  = [
    ...corridorOpts,
    ...nonCorridorOpts.slice(0, Math.max(0, 12 - corridorOpts.length)),
  ];

  // ── DECISION: accessible-first bestOption ─────────────────────────────────
  // IMPORTANT: bestOption selection uses sortedOptions (penalized-cost order), NOT
  // dedupedOptions (corridor-first display order). This preserves the invariant that
  // bestOption is always the cheapest accessible program — independent of display ordering.
  // Score-3 niche programs (SAA Voyager, Air China PhoenixMiles, etc.) may rank cheapest
  // by raw cost but are inaccessible to most users. Fall back to raw cheapest only when
  // no accessible (score ≤ 2) option exists.
  //
  // DIRECT-program preference (UX policy):
  // When a DIRECT program (home-carrier redemption) exists and its cost is within 40%
  // of the cheapest accessible option, prefer it as the headline recommendation.
  // Rationale: on SIN→LAX operated by Singapore Airlines, showing KrisFlyer as #1
  // (even if slightly more expensive than Delta SkyMiles ALLIANCE) is more useful —
  // it confirms the home-carrier redemption option the user expects to see first.
  // 40% threshold: conservative enough to not override genuinely better programs
  // (a 41%+ premium is real money worth surfacing to the user), but wide enough
  // to cover typical DIRECT vs ALLIANCE spreads on hub-carrier routes.
  let bestOption: MilesOption | null = null;
  if (sortedOptions.length > 0) {
    const cheapestAccessible = sortedOptions.find(
      (o) => (PROGRAMS_BY_NAME[o.program]?.accessibilityScore ?? 3) <= 2,
    ) ?? null;

    // Look for an accessible DIRECT program within 40% of cheapest accessible
    const directAccessible = cheapestAccessible
      ? (sortedOptions.find(
          (o) =>
            o.type === "DIRECT" &&
            (PROGRAMS_BY_NAME[o.program]?.accessibilityScore ?? 3) <= 2 &&
            o.totalMilesCost <= cheapestAccessible.totalMilesCost * 1.40,
        ) ?? null)
      : null;

    bestOption = directAccessible ?? cheapestAccessible ?? sortedOptions[0];
    // isBestDeal marks the best available miles option (cheapest accessible program).
    // It is unconditional: it identifies the best miles deal, not whether miles beat cash.
    // The UI must check `recommendation === "USE_MILES"` to decide whether to suggest using miles.
    bestOption.isBestDeal = true;
  }
  const bestMilesCost = bestOption?.totalMilesCost ?? Infinity;
  const signedSavings = cashTotal - bestMilesCost;  // positive = miles cheaper, negative = cash cheaper
  const savings = Math.round(signedSavings * 100) / 100;  // keep sign — UI uses recommendation to determine direction

  // USE_MILES only when miles save at least $10 AND at least 1.5% of the cash total.
  // The absolute floor prevents recommending miles for $1–$9 trivial "savings".
  // The percentage floor prevents recommending miles on a $2000 business ticket
  // where the $10 savings is within the noise of award chart variability.
  const MIN_SAVINGS_USD = 10;
  const MIN_SAVINGS_PCT = 0.015; // 1.5%
  const recommendation: Recommendation = (
    bestOption !== null &&
    bestOption.totalMilesCost < cashTotal &&
    (cashTotal - bestOption.totalMilesCost) >= MIN_SAVINGS_USD &&
    (cashTotal - bestOption.totalMilesCost) >= cashTotal * MIN_SAVINGS_PCT
  ) ? "USE_MILES" : "USE_CASH";

  // NOTE: displayMessage is not rendered by the UI (FlightCard generates it client-side
  // with the user's currency via fmt()). This server-side value is kept for logging only.
  const displayMessage: string = !bestOption
    ? "no_miles_option"
    : recommendation === "USE_MILES"
      ? `miles_cheaper:${Math.round(savings)}`          // savings > 0
      : `cash_cheaper:${Math.round(Math.abs(savings))}`; // savings ≤ 0 → log absolute amount

  // Trust disclaimer
  const disclaimer =
    "⚠️ Prix indicatifs basés sur tarifs réels et valeurs de miles estimées — vérifiez la disponibilité avant de réserver.";

  // Legacy explanation string
  const explanation = bestOption
    ? recommendation === "USE_MILES"
      ? `Économisez ${Math.round(savings)} en utilisant ${bestOption.program}${bestOption.via ? ` via ${bestOption.via}` : ""} (${bestOption.milesRequired.toLocaleString()} miles + ${bestOption.taxes} taxes = ${bestMilesCost} vs ${cashTotal} cash)`
      : signedSavings < 0
        ? `Le cash est moins cher de ${Math.round(Math.abs(savings))}. Miles coûteraient ${bestMilesCost} vs ${cashTotal} cash.`
        : `Quasi identique — cash légèrement avantageux de ${Math.round(Math.abs(savings))}.`
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
// Delegates to milesDataService for a single source of truth.
// Behaviour is identical to before (Redis-first, static fallback, never throws).

export async function getEffectivePrices(): Promise<Map<string, number>> {
  const { getAllEffectivePrices } = await import("./milesDataService");
  return getAllEffectivePrices();
}
