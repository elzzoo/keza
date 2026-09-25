import { GLOBAL_PROGRAMS } from "./data";
import type { Alliance, LoyaltyProgram } from "./types";

/** Map from program name to program data for O(1) lookups. */
export const PROGRAMS_BY_NAME: Record<string, LoyaltyProgram> = {};
for (const p of GLOBAL_PROGRAMS) {
  PROGRAMS_BY_NAME[p.name] = p;
}

/** Map from IATA airline code to program data. */
export const PROGRAMS_BY_AIRLINE_CODE: Record<string, LoyaltyProgram> = {};
for (const p of GLOBAL_PROGRAMS) {
  PROGRAMS_BY_AIRLINE_CODE[p.airlineCode] = p;
}

/** Get all programs that a given bank currency can transfer to. */
export function programsForBankCurrency(currency: string): LoyaltyProgram[] {
  return GLOBAL_PROGRAMS.filter((p) =>
    p.transferPartnersFrom.includes(currency),
  );
}

/** Get all programs in a given alliance. */
export function programsByAlliance(alliance: Alliance): LoyaltyProgram[] {
  return GLOBAL_PROGRAMS.filter((p) => p.alliance === alliance);
}
