// data/milesPrices.ts
// Market value per mile per program (cents USD).
//
// IMPORTANT: These are MARKET VALUES (economic value of a mile from user perspective),
// NOT airline purchase prices. This ensures fair cash vs miles comparison.
//
// Confidence levels:
//   HIGH   → well-established program with stable valuations
//   MEDIUM → program with variable value depending on redemption
//   LOW    → fallback estimate, less data available

export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export interface MilesPriceRecord {
  program: string;
  valueCents: number;         // market value in cents (e.g. 1.5 = $0.015/mile)
  confidence: Confidence;
  lastUpdated: string;        // ISO date — flag if stale > 90 days
}

// Default fallback: $0.014 per mile (1.4 cents)
export const DEFAULT_MILE_VALUE_CENTS = 1.4;

export const MILES_PRICES: MilesPriceRecord[] = [
  // ─── Airline loyalty programs ─────────────────────────────────────────────
  {
    program: "Flying Blue",
    valueCents: 1.5,          // Air France/KLM — good sweet spots on promo rewards
    confidence: "HIGH",
    lastUpdated: "2026-04-20",
  },
  {
    program: "Turkish Miles&Smiles",
    valueCents: 1.4,          // Post-2023 devaluation, average value on Star Alliance
    confidence: "HIGH",
    lastUpdated: "2026-04-20",
  },
  {
    program: "Emirates Skywards",
    valueCents: 1.3,          // Good for Emirates metal, lower elsewhere
    confidence: "HIGH",
    lastUpdated: "2026-04-20",
  },
  {
    program: "Qatar Privilege Club",
    valueCents: 1.4,          // Solid value on Oneworld awards
    confidence: "HIGH",
    lastUpdated: "2026-04-20",
  },
  {
    program: "British Airways Avios",
    valueCents: 1.5,          // Great for short-haul, decent long-haul
    confidence: "HIGH",
    lastUpdated: "2026-04-20",
  },
  {
    program: "Ethiopian ShebaMiles",
    valueCents: 1.2,          // Limited availability, lower liquidity
    confidence: "MEDIUM",
    lastUpdated: "2026-04-20",
  },
  {
    program: "Air Canada Aeroplan",
    valueCents: 1.5,          // Strong program with good partner availability
    confidence: "HIGH",
    lastUpdated: "2026-04-20",
  },
  {
    program: "United MileagePlus",
    valueCents: 1.3,          // Dynamic pricing, average value declining
    confidence: "HIGH",
    lastUpdated: "2026-04-20",
  },

  // ─── Transferable currencies ──────────────────────────────────────────────
  // These reflect the "effective" value when transferred to a partner program.
  {
    program: "Amex MR",
    valueCents: 1.6,          // Premium points — many 1:1 transfer partners
    confidence: "HIGH",
    lastUpdated: "2026-04-20",
  },
  {
    program: "Chase UR",
    valueCents: 1.5,          // Flexible — strong transfer partners
    confidence: "HIGH",
    lastUpdated: "2026-04-20",
  },
  {
    program: "Citi ThankYou",
    valueCents: 1.4,          // Fewer partners but still good
    confidence: "MEDIUM",
    lastUpdated: "2026-04-20",
  },
  {
    program: "Capital One Miles",
    valueCents: 1.4,          // Growing partner list
    confidence: "MEDIUM",
    lastUpdated: "2026-04-20",
  },

  // ─── Additional airline loyalty programs ──────────────────────────────────
  // ─── Niche/regional programs (score-3, no transfer partners) ────────────────
  // Values reflect true accessibility-adjusted cost. These appear for users who
  // already hold these miles, not as headline recommendations.
  { program: "South African Voyager",       valueCents: 1.1, confidence: "LOW",    lastUpdated: "2026-04-28" },
  { program: "Air China PhoenixMiles",      valueCents: 1.0, confidence: "LOW",    lastUpdated: "2026-04-28" },
  { program: "China Eastern Eastern Miles", valueCents: 1.0, confidence: "LOW",    lastUpdated: "2026-04-28" },
  { program: "EgyptAir Plus",               valueCents: 1.0, confidence: "LOW",    lastUpdated: "2026-04-28" },
  { program: "SriLankan FlySmiLes",         valueCents: 1.0, confidence: "LOW",    lastUpdated: "2026-04-28" },
  { program: "COPA ConnectMiles",           valueCents: 1.0, confidence: "LOW",    lastUpdated: "2026-04-28" },
  { program: "Royal Jordanian Royal Plus",  valueCents: 1.0, confidence: "LOW",    lastUpdated: "2026-04-28" },
  { program: "Garuda GarudaMiles",          valueCents: 1.0, confidence: "LOW",    lastUpdated: "2026-04-28" },

  { program: "Delta SkyMiles",              valueCents: 1.2, confidence: "HIGH",   lastUpdated: "2026-04-27" },
  { program: "BA Avios",                    valueCents: 1.5, confidence: "HIGH",   lastUpdated: "2026-04-27" },
  { program: "Aeroplan",                    valueCents: 1.6, confidence: "HIGH",   lastUpdated: "2026-04-27" },
  { program: "AAdvantage",                  valueCents: 1.3, confidence: "HIGH",   lastUpdated: "2026-04-27" },
  { program: "LifeMiles",                   valueCents: 1.3, confidence: "MEDIUM", lastUpdated: "2026-04-27" },
  { program: "ANA Mileage Club",            valueCents: 1.6, confidence: "HIGH",   lastUpdated: "2026-04-27" },
  { program: "Singapore KrisFlyer",         valueCents: 1.4, confidence: "HIGH",   lastUpdated: "2026-04-27" },
  { program: "Etihad Guest",                valueCents: 1.3, confidence: "MEDIUM", lastUpdated: "2026-04-27" },
  { program: "Iberia Avios Plus",           valueCents: 1.4, confidence: "MEDIUM", lastUpdated: "2026-04-27" },
  {
    program: "LATAM Pass",
    valueCents: 1.3,
    confidence: "MEDIUM",
    lastUpdated: "2026-04-28",
  },
  { program: "Lufthansa Miles & More",      valueCents: 1.3, confidence: "HIGH",   lastUpdated: "2026-04-27" },
  { program: "Korean Air SKYPASS",          valueCents: 1.4, confidence: "MEDIUM", lastUpdated: "2026-04-27" },
  { program: "Virgin Atlantic Flying Club", valueCents: 1.5, confidence: "HIGH",   lastUpdated: "2026-04-27" },
];

// Fast lookup map: program name → market value in cents
export const MILES_PRICE_MAP: Map<string, number> = new Map(
  MILES_PRICES.map((r) => [r.program, r.valueCents])
);

// Confidence lookup
export const MILES_CONFIDENCE_MAP: Map<string, Confidence> = new Map(
  MILES_PRICES.map((r) => [r.program, r.confidence])
);
