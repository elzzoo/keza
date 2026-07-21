// IATA airline code → canonical airline name.
// Names must match keys used in lib/alliances.ts and lib/costEngine.ts PROGRAM_TO_AIRLINE.

export const IATA_TO_AIRLINE: Record<string, string> = {
  // ─── SkyTeam ───────────────────────────────────────────────────────────────
  AF: "Air France",
  KL: "KLM",
  DL: "Delta",
  KE: "Korean Air",
  CZ: "China Southern",
  AM: "Aeromexico",
  UX: "Air Europa",
  AZ: "ITA Airways",
  MU: "China Eastern",
  CI: "China Airlines",        // Taiwan (Oneworld)
  OZ: "Asiana Airlines",       // Star Alliance

  // ─── Star Alliance ─────────────────────────────────────────────────────────
  AI: "Air India",            // Star Alliance
  TG: "Thai Airways",         // Star Alliance
  LH: "Lufthansa",
  UA: "United",
  AC: "Air Canada",
  SQ: "Singapore Airlines",
  TK: "Turkish Airlines",
  ET: "Ethiopian Airlines",
  SA: "South African Airways",
  LX: "Swiss",
  NH: "All Nippon Airways",
  AV: "Avianca",
  OS: "Austrian Airlines",
  SN: "Brussels Airlines",
  LO: "LOT Polish Airlines",
  CA: "Air China",             // Star Alliance
  MS: "EgyptAir",              // Star Alliance
  BR: "EVA Air",               // Star Alliance
  JX: "Starlux Airlines",      // Taiwan independent
  ZH: "Shenzhen Airlines",     // Air China subsidiary
  MF: "Xiamen Air",            // Air China subsidiary
  PR: "Philippine Airlines",
  AS: "Alaska Airlines",       // Oneworld

  // ─── Oneworld ──────────────────────────────────────────────────────────────
  BA: "British Airways",
  AA: "American Airlines",
  QR: "Qatar Airways",
  AY: "Finnair",
  IB: "Iberia",
  AT: "Royal Air Maroc",
  MH: "Malaysia Airlines",
  JL: "Japan Airlines",
  CX: "Cathay Pacific",        // Oneworld — needed for Cathay Pacific Asia Miles match
  QF: "Qantas",                // Oneworld — needed for Qantas Frequent Flyer match
  RJ: "Royal Jordanian",
  TP: "TAP Air Portugal",      // Star Alliance
  I2: "Iberia Express",        // Oneworld affiliate
  LA: "LATAM Airlines",        // Oneworld

  // ─── Independent (Xalifly-relevant) ───────────────────────────────────────────
  EK: "Emirates",
  EY: "Etihad",
  FZ: "flydubai",              // Emirates group, key MENA/Africa carrier
  G9: "Air Arabia",            // Major LCC, North Africa–Middle East
  GA: "Garuda Indonesia",      // Star Alliance member
  WB: "RwandAir",
  HC: "Air Senegal",
  KQ: "Kenya Airways",
  VS: "Virgin Atlantic",
  KU: "Kuwait Airways",
  WY: "Oman Air",
  SV: "Saudia",                // SkyTeam
  J2: "Azerbaijan Airlines",
  JU: "Air Serbia",
  FI: "Icelandair",
  WS: "WestJet",
  B6: "JetBlue",               // independent
  CM: "Copa Airlines",
  OB: "BoA (Boliviana)",
  AH: "Air Algérie",
  VN: "Vietnam Airlines",     // SkyTeam associate
  GF: "Gulf Air",             // independent

  // ─── Low-cost carriers (common in Travelpayouts / Duffel results) ─────────
  HV: "Transavia",            // Air France-KLM LCC
  "3O": "Air Arabia Maroc",   // Air Arabia subsidiary
  VY: "Vueling",
  VF: "Ajet",
  FR: "Ryanair",
  W6: "Wizz Air",
  PC: "Pegasus Airlines",
  TO: "Transavia France",
  XK: "Corsair",
  V7: "Volotea",               // European LCC
  W9: "Wizz Air Abu Dhabi",
  W4: "Wizz Air Malta",
  X5: "SmartLynx Airlines",
  "3U": "Sichuan Airlines",   // Chinese carrier
  S4: "SATA Air Açores",      // Portuguese regional

  // ─── Duffel virtual codes ─────────────────────────────────────────────────
  // "ZZ" is Duffel's placeholder for multi-carrier or unidentified segments.
  // "YP" / "ZG" are Duffel internal codes with no public airline mapping.
  // These are intentionally omitted so iataToAirline returns null for them,
  // allowing the engine to skip or label them as "Multi-compagnies".
};

// Virtual/unresolved IATA codes — declared at module level so the Set is allocated
// ONCE and reused across all calls (iataToAirline is called ~100+ times per search).
export const VIRTUAL_IATA_CODES = new Set(["ZZ", "YP", "ZG", "DM", "Z0", "NI"]);

/**
 * Map a Travelpayouts/Duffel IATA code to our canonical airline name.
 * Returns null for virtual/unresolved codes (ZZ, YP, ZG…) so callers can
 * choose to omit them instead of displaying raw unintelligible codes.
 */
export function iataToAirline(code: string): string | null {
  const upper = code.toUpperCase();
  if (VIRTUAL_IATA_CODES.has(upper)) return null;
  return IATA_TO_AIRLINE[upper] ?? null;
}

/**
 * Map a code, falling back to the code itself when not recognised.
 * Use this when you need a display string regardless.
 */
export function iataToAirlineOrCode(code: string): string {
  return iataToAirline(code) ?? code.toUpperCase();
}
