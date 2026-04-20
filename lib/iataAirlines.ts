// IATA airline code → canonical airline name.
// Names must match keys used in lib/alliances.ts and lib/costEngine.ts PROGRAM_TO_AIRLINE.
// Keep the list focused on carriers relevant to Keza's African + long-haul corridors.

export const IATA_TO_AIRLINE: Record<string, string> = {
  // ─── SkyTeam ───────────────────────────────────────────────────────────────
  AF: "Air France",
  KL: "KLM",
  DL: "Delta",
  KE: "Korean Air",
  CZ: "China Southern",
  AM: "Aeromexico",
  UX: "Air Europa",
  AZ: "Alitalia",

  // ─── Star Alliance ─────────────────────────────────────────────────────────
  LH: "Lufthansa",
  UA: "United",
  AC: "Air Canada",
  SQ: "Singapore Airlines",
  TK: "Turkish Airlines",
  ET: "Ethiopian Airlines",
  SA: "South African Airways",
  LX: "Swiss",

  // ─── Oneworld ──────────────────────────────────────────────────────────────
  BA: "British Airways",
  AA: "American Airlines",
  QR: "Qatar Airways",
  AY: "Finnair",
  IB: "Iberia",
  AT: "Royal Air Maroc",
  MH: "Malaysia Airlines",

  // ─── Independent (Keza-relevant) ───────────────────────────────────────────
  EK: "Emirates",
  EY: "Etihad",
  WB: "RwandAir",
  HC: "Air Senegal",
  KQ: "Kenya Airways",

  // ─── Low-cost carriers (common in Travelpayouts results) ──────────────────
  VY: "Vueling",           // IAG group (Oneworld adjacent, Avios partner)
  VF: "Ajet",              // Turkish low-cost subsidiary
  FR: "Ryanair",
  W6: "Wizz Air",
  PC: "Pegasus Airlines",  // Turkish low-cost
  TO: "Transavia France",  // Air France-KLM group
  XK: "Corsair",           // flies West Africa from Paris
};

/** Map a Travelpayouts IATA code to our canonical airline name (or return the code itself). */
export function iataToAirline(code: string): string {
  return IATA_TO_AIRLINE[code.toUpperCase()] ?? code.toUpperCase();
}
