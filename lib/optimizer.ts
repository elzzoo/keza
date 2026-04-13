import { ALLIANCES } from "./alliances";
import { TRANSFERS } from "./transfers";

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

  // 1. Direct: user already has miles in this airline's program
  if (userPrograms.includes(airline)) {
    return { type: "DIRECT", program: airline };
  }

  // 2. Alliance: user has miles in a partner airline
  const airlineAlliance = ALLIANCES[airline];
  if (airlineAlliance && airlineAlliance !== "Independent") {
    for (const program of userPrograms) {
      if (ALLIANCES[program] === airlineAlliance) {
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
