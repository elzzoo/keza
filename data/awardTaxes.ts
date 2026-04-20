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
  "Air France":          { economy: 180, business: 380, note: "High YQ fuel surcharges" },
  "KLM":                 { economy: 160, business: 350, note: "High YQ fuel surcharges" },
  "Delta":               { economy:  50, business:  90, note: "Low surcharges (no YQ on Delta metal)" },
  "Korean Air":          { economy:  90, business: 170, note: "Moderate surcharges" },
  "Aeromexico":          { economy:  70, business: 130, note: "Moderate surcharges" },
  // Star Alliance
  "Lufthansa":           { economy: 200, business: 450, note: "Very high YQ surcharges" },
  "Swiss":               { economy: 180, business: 400, note: "High YQ surcharges" },
  "United":              { economy:  50, business:  90, note: "Low surcharges" },
  "Air Canada":          { economy:  70, business: 130, note: "Low surcharges" },
  "Singapore Airlines":  { economy:  80, business: 150, note: "Moderate surcharges" },
  "Turkish Airlines":    { economy:  80, business: 150, note: "Moderate surcharges" },
  "Ethiopian Airlines":  { economy:  40, business:  80, note: "Low surcharges" },
  "South African Airways": { economy: 60, business: 110, note: "Moderate surcharges" },
  // Oneworld
  "British Airways":     { economy: 190, business: 420, note: "High YQ surcharges" },
  "American Airlines":   { economy:  60, business: 110, note: "Low surcharges (no YQ on AA metal)" },
  "Qatar Airways":       { economy:  60, business: 110, note: "Low surcharges" },
  "Finnair":             { economy: 130, business: 280, note: "Moderate YQ on long-haul" },
  "Iberia":              { economy: 150, business: 320, note: "High YQ on long-haul" },
  "Royal Air Maroc":     { economy:  50, business: 100, note: "Moderate surcharges" },
  // Independent
  "Emirates":            { economy:  50, business:  90, note: "Low surcharges" },
  "Etihad":              { economy:  60, business: 110, note: "Low surcharges" },
  "Kenya Airways":       { economy:  40, business:  80, note: "Low surcharges" },
  "Air Senegal":         { economy:  30, business:  60, note: "Minimal surcharges" },
  "RwandAir":            { economy:  30, business:  60, note: "Minimal surcharges" },
  // Default fallback for unknown airlines
  _default:              { economy: 100, business: 200, note: "Estimated" },
};

export function getAwardTaxes(
  airline: string,
  cabin: "economy" | "premium" | "business" | "first",
  passengers: number
): number {
  if (passengers < 0 || !Number.isInteger(passengers)) {
    throw new Error(`Invalid passenger count: ${passengers}`);
  }
  const record = AWARD_TAXES[airline] ?? AWARD_TAXES["_default"]!;
  // premium treated as business for taxes; first = business × 1.2
  const base =
    cabin === "economy" || cabin === "premium"
      ? record.economy
      : cabin === "first"
      ? Math.round(record.business * 1.2)
      : record.business;
  return base * passengers;
}
