// data/awardTaxes.ts
// Award ticket taxes and fuel surcharges per operating airline (USD, per person, one-way).
// These are representative base figures for long-haul routes.
// Route-corridor caps are applied below to ensure realistic values on every corridor.

export interface AwardTaxRecord {
  economy: number;
  business: number;
  note: string;
}

// Base rates reflect full long-haul (e.g. transatlantic) typical surcharges.
// Corridor caps further bound them for specific route types.
export const AWARD_TAXES: Record<string, AwardTaxRecord> = {
  // SkyTeam
  "Air France":          { economy: 200, business: 400, note: "YQ fuel surcharges — capped by corridor" },
  "KLM":                 { economy: 180, business: 360, note: "YQ fuel surcharges — capped by corridor" },
  "Delta":               { economy:  50, business:  90, note: "Low surcharges (no YQ on Delta metal)" },
  "Korean Air":          { economy:  90, business: 170, note: "Moderate surcharges" },
  "Aeromexico":          { economy:  70, business: 130, note: "Moderate surcharges" },
  "Kenya Airways":       { economy:  60, business: 110, note: "Low surcharges" },
  "ITA Airways":         { economy: 120, business: 240, note: "Moderate YQ surcharges" },
  "ASKY Airlines":       { economy:  30, business:  60, note: "Minimal surcharges" },
  // Star Alliance
  "Lufthansa":           { economy: 200, business: 420, note: "High YQ — capped by corridor" },
  "Swiss":               { economy: 180, business: 360, note: "High YQ — capped by corridor" },
  "United":              { economy:  50, business:  90, note: "Low surcharges" },
  "Air Canada":          { economy:  70, business: 130, note: "Low surcharges" },
  "Singapore Airlines":  { economy:  80, business: 150, note: "Moderate surcharges" },
  "Turkish Airlines":    { economy:  80, business: 150, note: "Moderate surcharges" },
  "Ethiopian Airlines":  { economy:  40, business:  80, note: "Low surcharges" },
  "South African Airways": { economy: 60, business: 110, note: "Moderate surcharges" },
  "EgyptAir":            { economy:  50, business: 100, note: "Low surcharges" },
  "TAP Air Portugal":    { economy: 150, business: 300, note: "Moderate YQ on long-haul" },
  "All Nippon Airways":  { economy:  80, business: 150, note: "Moderate surcharges" },
  "Avianca":             { economy:  60, business: 110, note: "Low surcharges" },
  "Brussels Airlines":   { economy: 120, business: 240, note: "Moderate YQ" },
  "Austrian Airlines":   { economy: 150, business: 300, note: "Moderate YQ" },
  "LOT Polish Airlines": { economy: 130, business: 260, note: "Moderate YQ" },
  // Oneworld
  "British Airways":     { economy: 250, business: 500, note: "High YQ — UK APD adds $100–180; corridor-capped" },
  "American Airlines":   { economy:  60, business: 110, note: "Low surcharges (no YQ on AA metal)" },
  "Qatar Airways":       { economy:  60, business: 110, note: "Low surcharges" },
  "Finnair":             { economy: 130, business: 260, note: "Moderate YQ on long-haul" },
  "Iberia":              { economy: 120, business: 240, note: "Moderate YQ on long-haul" },
  "Royal Air Maroc":     { economy:  50, business: 100, note: "Moderate surcharges" },
  "Japan Airlines":      { economy:  80, business: 150, note: "Moderate surcharges" },
  // Independent
  "Emirates":            { economy:  50, business:  90, note: "Low surcharges" },
  "Etihad":              { economy:  60, business: 110, note: "Low surcharges" },
  "Air Senegal":         { economy:  30, business:  60, note: "Minimal surcharges" },
  "RwandAir":            { economy:  30, business:  60, note: "Minimal surcharges" },
};

// ---------------------------------------------------------------------------
// UK airports — trigger APD surcharge in the corridor-cap logic below.
// ---------------------------------------------------------------------------
const UK_AIRPORTS = new Set(["LHR", "LGW", "LCY", "MAN", "EDI", "BHX", "STN", "GLA"]);

// ---------------------------------------------------------------------------
// Corridor-based tax caps (one-way, per person, economy).
// Prevents long-haul base rates from applying to short/medium corridors.
//
// Priority: first matching rule wins (most-specific first).
// ---------------------------------------------------------------------------

interface CorridorCap {
  minEconomy: number;
  maxEconomy: number;
  maxBusiness: number; // business / first cap
}

function getCorridorCap(
  originZone: string | undefined,
  destZone:   string | undefined,
  from:       string | undefined,
  to:         string | undefined,
): CorridorCap {
  const isUK = (from != null && UK_AIRPORTS.has(from)) || (to != null && UK_AIRPORTS.has(to));

  // UK routes — UK APD is real, but cap economy at $150/leg and business at $300/leg.
  // This prevents BA's $500 flat rate from yielding $1000 RT even in economy.
  if (isUK) {
    return { minEconomy: 100, maxEconomy: 150, maxBusiness: 300 };
  }

  const oz = originZone ?? "";
  const dz = destZone   ?? "";
  const isEurope = oz === "EUROPE"          || dz === "EUROPE";
  const isAfrica = oz.startsWith("AFRICA_") || dz.startsWith("AFRICA_");
  const isNA     = oz === "NORTH_AMERICA"   || dz === "NORTH_AMERICA";
  const isAsia   = oz === "ASIA"            || dz === "ASIA";
  const isME     = oz === "MIDDLE_EAST"     || dz === "MIDDLE_EAST";
  const isSA     = oz === "SOUTH_AMERICA"   || dz === "SOUTH_AMERICA";

  // Europe ↔ Africa — primary KEZA corridor.
  // RT total target: $50–150. Per-leg max = $75.
  if (isEurope && isAfrica) return { minEconomy: 25, maxEconomy: 75,  maxBusiness: 160 };

  // Europe ↔ North America (transatlantic).
  // RT total target: $50–200. Per-leg max = $100.
  if (isEurope && isNA)     return { minEconomy: 25, maxEconomy: 100, maxBusiness: 220 };

  // Europe ↔ Asia (long-haul).
  // RT total target: $50–120. Per-leg max = $60.
  if (isEurope && isAsia)   return { minEconomy: 25, maxEconomy: 60,  maxBusiness: 140 };

  // Asia routes (intra or cross-hemisphere).
  // Per-leg max = $60.
  if (isAsia)               return { minEconomy: 20, maxEconomy: 60,  maxBusiness: 130 };

  // Middle East corridors (generally low carrier charges).
  if (isME)                 return { minEconomy: 20, maxEconomy: 60,  maxBusiness: 120 };

  // South America
  if (isSA)                 return { minEconomy: 30, maxEconomy: 100, maxBusiness: 200 };

  // Africa intra-regional
  if (isAfrica)             return { minEconomy: 20, maxEconomy: 60,  maxBusiness: 120 };

  // Intra-Europe
  if (isEurope)             return { minEconomy: 25, maxEconomy: 80,  maxBusiness: 160 };

  // Global hard ceiling — prevents any route exceeding $150 economy one-way.
  return { minEconomy: 25, maxEconomy: 150, maxBusiness: 300 };
}

/**
 * Regional default taxes for airlines not in AWARD_TAXES.
 * Priority rules checked top-to-bottom; first match wins.
 * All values are per-person, one-way (before corridor capping).
 */
function getRegionalDefaultBase(
  from:       string | undefined,
  to:         string | undefined,
  originZone: string | undefined,
  destZone:   string | undefined,
  cabin:      "economy" | "premium" | "business" | "first",
): number {
  const isUK    = (from != null && UK_AIRPORTS.has(from)) || (to != null && UK_AIRPORTS.has(to));
  const isNAdom = originZone === "NORTH_AMERICA" && destZone === "NORTH_AMERICA";
  const isAfr   = originZone?.startsWith("AFRICA_") === true || destZone?.startsWith("AFRICA_") === true;
  const isME    = originZone === "MIDDLE_EAST" || destZone === "MIDDLE_EAST";
  const isEU    = originZone === "EUROPE"       || destZone === "EUROPE";

  let eco: number;
  let biz: number;
  if      (isUK)    { eco = 220; biz = 440; }
  else if (isNAdom) { eco =  30; biz =  60; }
  else if (isAfr)   { eco =  50; biz = 100; }
  else if (isEU)    { eco = 120; biz = 260; }
  else if (isME)    { eco =  40; biz =  80; }
  else              { eco =  80; biz = 180; }

  return cabin === "economy" || cabin === "premium" ? eco
    : cabin === "first" ? Math.round(biz * 1.2)
    : biz;
}

export function getAwardTaxes(
  airline:    string,
  cabin:      "economy" | "premium" | "business" | "first",
  passengers: number,
  from?:      string,
  to?:        string,
  originZone?: string,
  destZone?:   string,
): number {
  if (passengers < 0 || !Number.isInteger(passengers)) {
    throw new Error(`Invalid passenger count: ${passengers}`);
  }

  // 1. Compute raw per-pax one-way base tax (airline-specific or regional default)
  const record = AWARD_TAXES[airline];
  let base: number;
  if (record) {
    base = cabin === "economy" || cabin === "premium"
      ? record.economy
      : cabin === "first"
      ? Math.round(record.business * 1.2)
      : record.business;
  } else {
    base = getRegionalDefaultBase(from, to, originZone, destZone, cabin);
  }

  // 2. Apply corridor cap — clamps base to realistic range for this route.
  const cap = getCorridorCap(originZone, destZone, from, to);
  const maxForCabin = cabin === "economy" || cabin === "premium"
    ? cap.maxEconomy
    : cap.maxBusiness;
  const minForCabin = cap.minEconomy; // minimum applies to all cabins

  const capped = Math.min(Math.max(base, minForCabin), maxForCabin);

  // 3. Multiply by passenger count
  return capped * passengers;
}
