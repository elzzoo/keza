// IATA airport code → IATA metro (city) code.
// Travelpayouts sometimes indexes data under the metro code rather than the
// specific airport. If a search for DSS returns 0 results we retry with DKR;
// for LHR we retry with LON; etc.
//
// Only map airports where a metro code genuinely exists and differs from the
// airport code. Airports that ARE their own metro (CDG is already PAR in some
// contexts but PAR also resolves; DSS → DKR is the textbook case).

export const AIRPORT_TO_METRO: Record<string, string> = {
  // ─── Africa ────────────────────────────────────────────────────────────────
  DSS: "DKR", // Dakar — Blaise Diagne (new) vs Yoff metro

  // ─── Europe ────────────────────────────────────────────────────────────────
  LHR: "LON",
  LGW: "LON",
  STN: "LON",
  LTN: "LON",
  CDG: "PAR",
  ORY: "PAR",
  BVA: "PAR",
  MXP: "MIL",
  LIN: "MIL",
  BGY: "MIL",
  FCO: "ROM",
  CIA: "ROM",
  SVO: "MOW",
  DME: "MOW",
  VKO: "MOW",
  ARN: "STO",
  BMA: "STO",

  // ─── North America ─────────────────────────────────────────────────────────
  JFK: "NYC",
  LGA: "NYC",
  EWR: "NYC",
  ORD: "CHI",
  MDW: "CHI",
  IAD: "WAS",
  DCA: "WAS",
  BWI: "WAS",

  // ─── Asia ──────────────────────────────────────────────────────────────────
  HND: "TYO",
  NRT: "TYO",
  KIX: "OSA",
  ITM: "OSA",

  // ─── South America ─────────────────────────────────────────────────────────
  GRU: "SAO",
  CGH: "SAO",
  GIG: "RIO",
  SDU: "RIO",
  EZE: "BUE",
  AEP: "BUE",
};

/** Return the metro code for an airport code, or null if the airport has no separate metro alias. */
export function metroFor(code: string): string | null {
  const upper = code.toUpperCase();
  const metro = AIRPORT_TO_METRO[upper];
  return metro && metro !== upper ? metro : null;
}
