// lib/programEngine.ts
// Program discovery, airline-to-program mapping, and corridor-specific guarantees.

import { ALLIANCES } from "./alliances";
import { PROGRAMS_BY_NAME } from "./globalPrograms";

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
  "Air New Zealand Airpoints": "Air New Zealand",
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
  "Air New Zealand":     "Air New Zealand Airpoints",
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

export interface ProgramMatch {
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
export function getProgramsForAirline(airlines: string[]): ProgramMatch[] {
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

export interface CorridorGuarantee {
  program: string;
  type: "DIRECT" | "ALLIANCE";
  inferredAirline: string;
}

export function getCorridorGuarantees(originZone: string, destZone: string, airlines: string[] = []): CorridorGuarantee[] {
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
