/**
 * Global Alliance Membership — maps ~120 airlines (IATA code) to their
 * alliance. Covers all current alliance members plus major independents.
 *
 * Updated for 2025-2026 membership rosters.
 */

export type Alliance = "Star Alliance" | "Oneworld" | "SkyTeam" | "Independent";

/**
 * IATA 2-letter code → Alliance.
 *
 * Sources:
 *  - staralliance.com/member-airlines
 *  - oneworld.com/member-airlines
 *  - skyteam.com/member-airlines
 *  - Independent carriers are those not in any of the big three.
 */
export const AIRLINE_ALLIANCES: Record<string, Alliance> = {
  // ═══════════════════════════════════════════════════════════════════════
  // STAR ALLIANCE (26 members + connecting partners)
  // ═══════════════════════════════════════════════════════════════════════
  AC: "Star Alliance",  // Air Canada
  AI: "Star Alliance",  // Air India
  CA: "Star Alliance",  // Air China
  NH: "Star Alliance",  // ANA (All Nippon Airways)
  OZ: "Star Alliance",  // Asiana Airlines
  OS: "Star Alliance",  // Austrian Airlines
  AV: "Star Alliance",  // Avianca
  SN: "Star Alliance",  // Brussels Airlines
  CM: "Star Alliance",  // Copa Airlines
  MS: "Star Alliance",  // EgyptAir
  ET: "Star Alliance",  // Ethiopian Airlines
  BR: "Star Alliance",  // EVA Air
  LH: "Star Alliance",  // Lufthansa
  LX: "Star Alliance",  // Swiss International Air Lines
  SK: "Star Alliance",  // SAS Scandinavian Airlines
  ZH: "Star Alliance",  // Shenzhen Airlines
  SQ: "Star Alliance",  // Singapore Airlines
  SA: "Star Alliance",  // South African Airways
  TP: "Star Alliance",  // TAP Air Portugal
  TG: "Star Alliance",  // Thai Airways
  TK: "Star Alliance",  // Turkish Airlines
  UA: "Star Alliance",  // United Airlines
  LO: "Star Alliance",  // LOT Polish Airlines
  NZ: "Star Alliance",  // Air New Zealand
  A3: "Star Alliance",  // Aegean Airlines
  JP: "Star Alliance",  // Adria Airways (historical/connecting)
  OU: "Star Alliance",  // Croatia Airlines
  // Star Alliance Connecting Partners
  EN: "Star Alliance",  // Air Dolomiti
  WK: "Star Alliance",  // Edelweiss Air
  CL: "Star Alliance",  // Lufthansa CityLine
  EW: "Star Alliance",  // Eurowings (Lufthansa group)
  "4U": "Star Alliance", // Germanwings / Eurowings

  // ═══════════════════════════════════════════════════════════════════════
  // ONEWORLD (14 members)
  // ═══════════════════════════════════════════════════════════════════════
  AA: "Oneworld",  // American Airlines
  BA: "Oneworld",  // British Airways
  CX: "Oneworld",  // Cathay Pacific
  AY: "Oneworld",  // Finnair
  IB: "Oneworld",  // Iberia
  JL: "Oneworld",  // Japan Airlines
  MH: "Oneworld",  // Malaysia Airlines
  QF: "Oneworld",  // Qantas
  QR: "Oneworld",  // Qatar Airways
  AT: "Oneworld",  // Royal Air Maroc
  RJ: "Oneworld",  // Royal Jordanian
  UL: "Oneworld",  // SriLankan Airlines
  AS: "Oneworld",  // Alaska Airlines
  FJ: "Oneworld",  // Fiji Airways (Oneworld connect)
  // Oneworld affiliates / connect partners
  LA: "Oneworld",  // LATAM Airlines (Chile)
  "4M": "Oneworld", // LATAM Argentina
  XL: "Oneworld",  // LATAM Ecuador
  PZ: "Oneworld",  // LATAM Paraguay (TAM Mercosur)
  S4: "Oneworld",  // SATA Azores Airlines (affiliate)

  // ═══════════════════════════════════════════════════════════════════════
  // SKYTEAM (19 members)
  // ═══════════════════════════════════════════════════════════════════════
  AF: "SkyTeam",   // Air France
  KL: "SkyTeam",   // KLM
  DL: "SkyTeam",   // Delta Air Lines
  KE: "SkyTeam",   // Korean Air
  AM: "SkyTeam",   // Aeromexico
  AR: "SkyTeam",   // Aerolineas Argentinas
  SU: "SkyTeam",   // Aeroflot (suspended in many markets, still technically member)
  CI: "SkyTeam",   // China Airlines
  MU: "SkyTeam",   // China Eastern
  CZ: "SkyTeam",   // China Southern
  GA: "SkyTeam",   // Garuda Indonesia
  KQ: "SkyTeam",   // Kenya Airways
  ME: "SkyTeam",   // Middle East Airlines
  SV: "SkyTeam",   // Saudia
  RO: "SkyTeam",   // TAROM (Romania)
  VN: "SkyTeam",   // Vietnam Airlines
  OK: "SkyTeam",   // Czech Airlines
  UX: "SkyTeam",   // Air Europa
  XN: "SkyTeam",   // XiamenAir
  WS: "SkyTeam",   // WestJet (joined 2024)

  // ═══════════════════════════════════════════════════════════════════════
  // INDEPENDENT — major carriers not in any alliance
  // ═══════════════════════════════════════════════════════════════════════

  // Gulf carriers
  EK: "Independent",  // Emirates
  EY: "Independent",  // Etihad Airways
  WY: "Independent",  // Oman Air
  GF: "Independent",  // Gulf Air
  G9: "Independent",  // Air Arabia

  // European independents & low-cost
  VS: "Independent",  // Virgin Atlantic
  FR: "Independent",  // Ryanair
  U2: "Independent",  // easyJet
  W6: "Independent",  // Wizz Air
  PC: "Independent",  // Pegasus Airlines
  DY: "Independent",  // Norwegian Air Shuttle
  BT: "Independent",  // airBaltic
  "0B": "Independent", // Blue Air
  VY: "Independent",  // Vueling

  // North American independents
  B6: "Independent",  // JetBlue
  WN: "Independent",  // Southwest Airlines
  NK: "Independent",  // Spirit Airlines
  F9: "Independent",  // Frontier Airlines
  G4: "Independent",  // Allegiant Air
  HA: "Independent",  // Hawaiian Airlines
  WO: "Independent",  // Swoop (now WestJet subsidiary)

  // Asian independents
  "6E": "Independent",  // IndiGo
  SG: "Independent",  // SpiceJet
  AK: "Independent",  // AirAsia (Malaysia)
  FD: "Independent",  // Thai AirAsia
  QZ: "Independent",  // AirAsia Indonesia
  D7: "Independent",  // AirAsia X
  TR: "Independent",  // Scoot (Singapore Airlines subsidiary, but own program)
  "3K": "Independent",  // Jetstar Asia
  JQ: "Independent",  // Jetstar Airways
  PR: "Independent",  // Philippine Airlines
  "5J": "Independent",  // Cebu Pacific
  HU: "Independent",  // Hainan Airlines
  "3U": "Independent",  // Sichuan Airlines
  HO: "Independent",  // Juneyao Airlines
  MF: "Independent",  // Xiamen Airlines (codeshare SkyTeam but not full member)
  BX: "Independent",  // Air Busan
  LJ: "Independent",  // Jin Air
  TW: "Independent",  // T'way Air
  "7C": "Independent",  // Jeju Air
  PG: "Independent",  // Bangkok Airways
  BI: "Independent",  // Royal Brunei Airlines
  MJ: "Independent",  // Myway Airlines
  IT: "Independent",  // Tigerair Taiwan
  MM: "Independent",  // Peach Aviation

  // African independents
  WB: "Independent",  // RwandAir
  TC: "Independent",  // Air Tanzania
  P0: "Independent",  // Proflight Zambia
  HF: "Independent",  // Air Cote d'Ivoire
  "5Z": "Independent",  // CemAir
  FA: "Independent",  // FlySafair
  KP: "Independent",  // ASKY Airlines

  // Latin American independents
  JA: "Independent",  // JetSMART (Chile)
  G3: "Independent",  // GOL Linhas Aereas
  AD: "Independent",  // Azul Brazilian Airlines

  // Oceania
  VA: "Independent",  // Virgin Australia
  SB: "Independent",  // Aircalin
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the alliance for an airline by IATA code.
 * Returns "Independent" for unknown airlines (safe default).
 */
export function getAlliance(iataCode: string): Alliance {
  return AIRLINE_ALLIANCES[iataCode] ?? "Independent";
}

/**
 * Get all airlines in a specific alliance.
 * @returns Array of IATA codes.
 */
export function airlinesInAlliance(alliance: Alliance): string[] {
  return Object.entries(AIRLINE_ALLIANCES)
    .filter(([, a]) => a === alliance)
    .map(([code]) => code);
}

/**
 * Total count of airlines by alliance.
 */
export function allianceCounts(): Record<Alliance, number> {
  const counts: Record<Alliance, number> = {
    "Star Alliance": 0,
    "Oneworld": 0,
    "SkyTeam": 0,
    "Independent": 0,
  };
  for (const alliance of Object.values(AIRLINE_ALLIANCES)) {
    counts[alliance]++;
  }
  return counts;
}
