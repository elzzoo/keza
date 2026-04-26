// data/awardTaxes.ts
// Award ticket taxes and fuel surcharges per operating airline (USD, per person)
// These are representative figures — actual taxes vary by routing and dates.

export interface AwardTaxRecord {
  economy: number;
  business: number;
  note: string;
}

export const AWARD_TAXES: Record<string, AwardTaxRecord> = {
  // SkyTeam
  "Air France":          { economy: 300, business: 550, note: "High YQ fuel surcharges on long-haul" },
  "KLM":                 { economy: 280, business: 500, note: "High YQ fuel surcharges on long-haul" },
  "Delta":               { economy:  50, business:  90, note: "Low surcharges (no YQ on Delta metal)" },
  "Korean Air":          { economy:  90, business: 170, note: "Moderate surcharges" },
  "Aeromexico":          { economy:  70, business: 130, note: "Moderate surcharges" },
  "Kenya Airways":       { economy:  60, business: 110, note: "Low surcharges" },
  "ITA Airways":         { economy: 150, business: 300, note: "Moderate YQ surcharges" },
  "ASKY Airlines":       { economy:  30, business:  60, note: "Minimal surcharges" },
  // Star Alliance
  "Lufthansa":           { economy: 320, business: 600, note: "Very high YQ surcharges" },
  "Swiss":               { economy: 280, business: 520, note: "High YQ surcharges" },
  "United":              { economy:  50, business:  90, note: "Low surcharges" },
  "Air Canada":          { economy:  70, business: 130, note: "Low surcharges" },
  "Singapore Airlines":  { economy:  80, business: 150, note: "Moderate surcharges" },
  "Turkish Airlines":    { economy:  80, business: 150, note: "Moderate surcharges" },
  "Ethiopian Airlines":  { economy:  40, business:  80, note: "Low surcharges" },
  "South African Airways": { economy: 60, business: 110, note: "Moderate surcharges" },
  "EgyptAir":            { economy:  50, business: 100, note: "Low surcharges" },
  "TAP Air Portugal":    { economy: 200, business: 400, note: "High YQ on long-haul" },
  // Oneworld
  "British Airways":     { economy: 400, business: 700, note: "Very high YQ surcharges (worst in industry)" },
  "American Airlines":   { economy:  60, business: 110, note: "Low surcharges (no YQ on AA metal)" },
  "Qatar Airways":       { economy:  60, business: 110, note: "Low surcharges" },
  "Finnair":             { economy: 130, business: 280, note: "Moderate YQ on long-haul" },
  "Iberia":              { economy: 150, business: 320, note: "High YQ on long-haul" },
  "Royal Air Maroc":     { economy:  50, business: 100, note: "Moderate surcharges" },
  // Independent
  "Emirates":            { economy:  50, business:  90, note: "Low surcharges" },
  "Etihad":              { economy:  60, business: 110, note: "Low surcharges" },
  "Air Senegal":         { economy:  30, business:  60, note: "Minimal surcharges" },
  "RwandAir":            { economy:  30, business:  60, note: "Minimal surcharges" },
};

// ---------------------------------------------------------------------------
// UK airports — trigger higher default taxes even for unknown carriers.
// Used only in the regional default fallback below.
// ---------------------------------------------------------------------------
const UK_AIRPORTS = new Set(["LHR", "LGW", "LCY", "MAN", "EDI", "BHX", "STN", "GLA"]);

/**
 * Regional default taxes for airlines not in AWARD_TAXES.
 * Priority rules checked top-to-bottom; first match wins.
 * All values are per-person, one-way.
 */
function getRegionalDefaultTaxes(
  from: string | undefined,
  to: string | undefined,
  originZone: string | undefined,
  destZone: string | undefined,
  cabin: "economy" | "premium" | "business" | "first",
  passengers: number,
): number {
  const isUK      = (from != null && UK_AIRPORTS.has(from)) || (to != null && UK_AIRPORTS.has(to));
  const isNAdom   = originZone === "NORTH_AMERICA" && destZone === "NORTH_AMERICA";
  const isAfrica  = originZone?.startsWith("AFRICA_") === true || destZone?.startsWith("AFRICA_") === true;
  const isME      = originZone === "MIDDLE_EAST" || destZone === "MIDDLE_EAST";
  const isEurope  = originZone === "EUROPE" || destZone === "EUROPE";

  let economyBase: number;
  let businessBase: number;
  if      (isUK)     { economyBase = 250; businessBase = 500; }
  else if (isNAdom)  { economyBase = 30;  businessBase = 60;  }
  else if (isAfrica) { economyBase = 50;  businessBase = 100; }
  // Europe outranks ME: European leg typically dominates surcharge on mixed routes
  else if (isEurope) { economyBase = 150; businessBase = 350; }
  else if (isME)     { economyBase = 40;  businessBase = 80;  }
  else               { economyBase = 100; businessBase = 200; }

  const base =
    cabin === "economy" || cabin === "premium"
      ? economyBase
      : cabin === "first"
      ? Math.round(businessBase * 1.2)
      : businessBase;

  return base * passengers;
}

export function getAwardTaxes(
  airline: string,
  cabin: "economy" | "premium" | "business" | "first",
  passengers: number,
  from?: string,
  to?: string,
  originZone?: string,
  destZone?: string,
): number {
  if (passengers < 0 || !Number.isInteger(passengers)) {
    throw new Error(`Invalid passenger count: ${passengers}`);
  }
  const record = AWARD_TAXES[airline];
  if (!record) {
    return getRegionalDefaultTaxes(from, to, originZone, destZone, cabin, passengers);
  }
  // premium treated as economy for taxes; first = business × 1.2
  const base =
    cabin === "economy" || cabin === "premium"
      ? record.economy
      : cabin === "first"
      ? Math.round(record.business * 1.2)
      : record.business;
  return base * passengers;
}
