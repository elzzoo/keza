import { ALLIANCES } from "./alliances";
import { TRANSFERS } from "./transfers";
import { PROGRAMS_BY_NAME } from "./globalPrograms";

// Airline → flagship program mapping (must stay in sync with costEngine OPERATOR_TO_PROGRAM)
// Used by the optimizer to match user programs against operating airlines.
const AIRLINE_TO_PROGRAM: Record<string, string> = {
  "Air France":         "Flying Blue",
  "KLM":                "Flying Blue",
  "Delta":              "Delta SkyMiles",
  "Korean Air":         "Korean Air SKYPASS",
  "Turkish Airlines":   "Turkish Miles&Smiles",
  "Ethiopian Airlines": "Ethiopian ShebaMiles",
  "Air Canada":         "Air Canada Aeroplan",
  "United":             "United MileagePlus",
  "Lufthansa":          "Lufthansa Miles & More",
  "Singapore Airlines": "Singapore KrisFlyer",
  "All Nippon Airways": "ANA Mileage Club",
  "Avianca":            "LifeMiles",
  "British Airways":    "British Airways Avios",
  "Qatar Airways":      "Qatar Privilege Club",
  "American Airlines":  "AAdvantage",
  "Iberia":             "Iberia Avios Plus",
  "Japan Airlines":     "Japan Airlines Mileage Bank",
  "Emirates":           "Emirates Skywards",
  "Etihad":             "Etihad Guest",
  "LATAM Brasil":       "LATAM Pass",
  "LATAM Airlines":     "LATAM Pass",
};

export type OptimizerDecision =
  | { type: "DIRECT"; program: string }
  | { type: "ALLIANCE"; viaProgram: string; alliance: string }
  | { type: "TRANSFER"; from: string; to: string }
  | { type: "CASH" };

export function optimizeMiles(
  airlines: string[],
  userPrograms: string[]
): OptimizerDecision {
  const airline = airlines[0] ?? "";

  // 1. Direct: user holds miles in the flagship program for this airline.
  // userPrograms contains PROGRAM NAMES (e.g. "Flying Blue"), NOT airline names.
  // We look up the airline's flagship program and check if the user has it.
  const flagshipProgram = AIRLINE_TO_PROGRAM[airline];
  if (flagshipProgram && userPrograms.includes(flagshipProgram)) {
    return { type: "DIRECT", program: flagshipProgram };
  }

  // 2. Alliance: user has miles in a partner airline
  // ALLIANCES maps airline names → alliance string.
  // userPrograms contains program names (e.g. "Flying Blue"), not airline names,
  // so we look up each program in PROGRAMS_BY_NAME to get its alliance field.
  const airlineAlliance = ALLIANCES[airline];
  if (airlineAlliance && airlineAlliance !== "Independent") {
    for (const program of userPrograms) {
      const prog = PROGRAMS_BY_NAME[program];
      if (prog && prog.alliance === airlineAlliance) {
        return { type: "ALLIANCE", viaProgram: program, alliance: airlineAlliance };
      }
    }
  }

  // 3. Transfer: user has transferable points currency
  for (const transfer of TRANSFERS) {
    if (userPrograms.includes(transfer.from)) {
      return { type: "TRANSFER", from: transfer.from, to: transfer.to };
    }
  }

  // 4. Cash fallback
  return { type: "CASH" };
}
