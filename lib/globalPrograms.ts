/**
 * Global Loyalty Programs — comprehensive catalogue of major frequent-flyer
 * programs worldwide with acquisition costs, market values, and transfer
 * partner mappings.
 *
 * Data reflects 2025-2026 published rates and typical sale pricing.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Alliance = "Star Alliance" | "Oneworld" | "SkyTeam" | "Independent";
export type TaxProfile = "low" | "medium" | "high";

export interface LoyaltyProgram {
  /** Canonical display name */
  name: string;
  /** IATA code of the operating airline */
  airlineCode: string;
  /** Operating airline full name */
  airline: string;
  alliance: Alliance;
  /**
   * Cost to purchase 1 000 miles directly from the airline, in USD.
   * Reflects typical sale pricing (not rack rate). null = not purchasable.
   */
  purchaseMileCostPer1000: number | null;
  /**
   * Market value of 1 mile/point in US cents.
   * Used for "what are my existing miles worth?" calculations.
   */
  marketValueCents: number;
  /**
   * Simplified tax profile for award redemptions.
   * - "low"    → minimal carrier surcharges (<$50 one-way economy)
   * - "medium" → moderate surcharges ($50-$200)
   * - "high"   → heavy fuel surcharges ($200+, e.g. BA long-haul)
   */
  taxProfile: TaxProfile;
  /**
   * Bank/credit-card currencies that can transfer INTO this program.
   * Uses canonical currency names.
   */
  transferPartnersFrom: string[];
}

// ---------------------------------------------------------------------------
// Bank point values (cost per point in USD cents) — for acquisition math
// ---------------------------------------------------------------------------

export const BANK_POINT_VALUES: Record<string, number> = {
  "Chase Ultimate Rewards":       2.0,   // ~2c per point via Pay Yourself Back / portal
  "Amex Membership Rewards":      2.0,
  "Citi ThankYou":                1.7,
  "Capital One Miles":            1.85,
  "Bilt Rewards":                 1.8,
  "Marriott Bonvoy":              0.7,   // 3:1 transfer ratio already baked in below
  "Wells Fargo Rewards":          1.5,
  "Brex Rewards":                 1.5,
};

// ---------------------------------------------------------------------------
// Programs
// ---------------------------------------------------------------------------

export const GLOBAL_PROGRAMS: LoyaltyProgram[] = [
  // ── SkyTeam ──────────────────────────────────────────────────────────
  {
    name: "Flying Blue",
    airlineCode: "AF",
    airline: "Air France / KLM",
    alliance: "SkyTeam",
    purchaseMileCostPer1000: 30,
    marketValueCents: 1.2,
    taxProfile: "medium",
    transferPartnersFrom: [
      "Amex Membership Rewards",
      "Chase Ultimate Rewards",
      "Citi ThankYou",
      "Capital One Miles",
      "Bilt Rewards",
    ],
  },
  {
    name: "Delta SkyMiles",
    airlineCode: "DL",
    airline: "Delta Air Lines",
    alliance: "SkyTeam",
    purchaseMileCostPer1000: 35,
    marketValueCents: 1.1,
    taxProfile: "low",
    transferPartnersFrom: [
      "Amex Membership Rewards",
      "Marriott Bonvoy",
    ],
  },
  {
    name: "Korean Air SKYPASS",
    airlineCode: "KE",
    airline: "Korean Air",
    alliance: "SkyTeam",
    purchaseMileCostPer1000: 33,
    marketValueCents: 1.5,
    taxProfile: "low",
    transferPartnersFrom: [
      "Chase Ultimate Rewards",
      "Marriott Bonvoy",
    ],
  },
  {
    name: "Aeromexico Club Premier",
    airlineCode: "AM",
    airline: "Aeromexico",
    alliance: "SkyTeam",
    purchaseMileCostPer1000: 25,
    marketValueCents: 1.0,
    taxProfile: "low",
    transferPartnersFrom: [
      "Amex Membership Rewards",
      "Capital One Miles",
      "Marriott Bonvoy",
    ],
  },
  {
    name: "Garuda GarudaMiles",
    airlineCode: "GA",
    airline: "Garuda Indonesia",
    alliance: "SkyTeam",
    purchaseMileCostPer1000: null,
    marketValueCents: 0.8,
    taxProfile: "low",
    transferPartnersFrom: [],
  },
  {
    name: "Vietnam Airlines Lotusmiles",
    airlineCode: "VN",
    airline: "Vietnam Airlines",
    alliance: "SkyTeam",
    purchaseMileCostPer1000: null,
    marketValueCents: 0.9,
    taxProfile: "low",
    transferPartnersFrom: [],
  },
  {
    name: "Saudia Alfursan",
    airlineCode: "SV",
    airline: "Saudia",
    alliance: "SkyTeam",
    purchaseMileCostPer1000: null,
    marketValueCents: 0.8,
    taxProfile: "low",
    transferPartnersFrom: [],
  },

  // ── Star Alliance ────────────────────────────────────────────────────
  {
    name: "Turkish Miles&Smiles",
    airlineCode: "TK",
    airline: "Turkish Airlines",
    alliance: "Star Alliance",
    purchaseMileCostPer1000: null,  // not directly purchasable
    marketValueCents: 1.5,
    taxProfile: "low",
    transferPartnersFrom: [
      "Citi ThankYou",
      "Capital One Miles",
      "Bilt Rewards",
      "Marriott Bonvoy",
    ],
  },
  {
    name: "Aeroplan",
    airlineCode: "AC",
    airline: "Air Canada",
    alliance: "Star Alliance",
    purchaseMileCostPer1000: 25,
    marketValueCents: 1.5,
    taxProfile: "low",
    transferPartnersFrom: [
      "Amex Membership Rewards",
      "Chase Ultimate Rewards",
      "Capital One Miles",
      "Bilt Rewards",
      "Marriott Bonvoy",
    ],
  },
  {
    name: "United MileagePlus",
    airlineCode: "UA",
    airline: "United Airlines",
    alliance: "Star Alliance",
    purchaseMileCostPer1000: 22,
    marketValueCents: 1.2,
    taxProfile: "low",
    transferPartnersFrom: [
      "Chase Ultimate Rewards",
      "Bilt Rewards",
      "Marriott Bonvoy",
    ],
  },
  {
    name: "ANA Mileage Club",
    airlineCode: "NH",
    airline: "All Nippon Airways",
    alliance: "Star Alliance",
    purchaseMileCostPer1000: null,  // only via transfer partners
    marketValueCents: 1.5,
    taxProfile: "low",
    transferPartnersFrom: [
      "Amex Membership Rewards",
      "Marriott Bonvoy",
    ],
  },
  {
    name: "Singapore KrisFlyer",
    airlineCode: "SQ",
    airline: "Singapore Airlines",
    alliance: "Star Alliance",
    purchaseMileCostPer1000: 35,
    marketValueCents: 1.5,
    taxProfile: "low",
    transferPartnersFrom: [
      "Amex Membership Rewards",
      "Chase Ultimate Rewards",
      "Citi ThankYou",
      "Capital One Miles",
      "Bilt Rewards",
      "Marriott Bonvoy",
    ],
  },
  {
    name: "LifeMiles",
    airlineCode: "AV",
    airline: "Avianca",
    alliance: "Star Alliance",
    purchaseMileCostPer1000: 15,   // frequent sales, best value
    marketValueCents: 1.3,
    taxProfile: "low",
    transferPartnersFrom: [
      "Amex Membership Rewards",
      "Capital One Miles",
      "Citi ThankYou",
      "Bilt Rewards",
      "Marriott Bonvoy",
      "Brex Rewards",
    ],
  },
  {
    name: "Ethiopian ShebaMiles",
    airlineCode: "ET",
    airline: "Ethiopian Airlines",
    alliance: "Star Alliance",
    purchaseMileCostPer1000: 30,
    marketValueCents: 1.0,
    taxProfile: "low",
    transferPartnersFrom: [
      "Marriott Bonvoy",
    ],
  },
  {
    name: "Lufthansa Miles & More",
    airlineCode: "LH",
    airline: "Lufthansa",
    alliance: "Star Alliance",
    purchaseMileCostPer1000: 35,
    marketValueCents: 1.0,
    taxProfile: "high",
    transferPartnersFrom: [
      "Marriott Bonvoy",
    ],
  },
  {
    name: "Thai Royal Orchid Plus",
    airlineCode: "TG",
    airline: "Thai Airways",
    alliance: "Star Alliance",
    purchaseMileCostPer1000: 30,
    marketValueCents: 1.1,
    taxProfile: "medium",
    transferPartnersFrom: [
      "Amex Membership Rewards",
      "Marriott Bonvoy",
    ],
  },
  {
    name: "COPA ConnectMiles",
    airlineCode: "CM",
    airline: "Copa Airlines",
    alliance: "Star Alliance",
    purchaseMileCostPer1000: 25,
    marketValueCents: 1.0,
    taxProfile: "low",
    transferPartnersFrom: [
      "Marriott Bonvoy",
    ],
  },
  {
    name: "Asiana Club",
    airlineCode: "OZ",
    airline: "Asiana Airlines",
    alliance: "Star Alliance",
    purchaseMileCostPer1000: null,
    marketValueCents: 1.2,
    taxProfile: "low",
    transferPartnersFrom: [
      "Marriott Bonvoy",
    ],
  },
  {
    name: "EgyptAir Plus",
    airlineCode: "MS",
    airline: "EgyptAir",
    alliance: "Star Alliance",
    purchaseMileCostPer1000: null,
    marketValueCents: 0.8,
    taxProfile: "low",
    transferPartnersFrom: [],
  },
  {
    name: "South African Voyager",
    airlineCode: "SA",
    airline: "South African Airways",
    alliance: "Star Alliance",
    purchaseMileCostPer1000: null,
    marketValueCents: 0.7,
    taxProfile: "medium",
    transferPartnersFrom: [],
  },
  {
    name: "EVA Infinity MileageLands",
    airlineCode: "BR",
    airline: "EVA Air",
    alliance: "Star Alliance",
    purchaseMileCostPer1000: null,
    marketValueCents: 1.2,
    taxProfile: "low",
    transferPartnersFrom: [
      "Marriott Bonvoy",
    ],
  },

  // ── Oneworld ─────────────────────────────────────────────────────────
  {
    name: "BA Avios",
    airlineCode: "BA",
    airline: "British Airways",
    alliance: "Oneworld",
    purchaseMileCostPer1000: 25,
    marketValueCents: 1.3,
    taxProfile: "high",   // notorious fuel surcharges on BA metal
    transferPartnersFrom: [
      "Amex Membership Rewards",
      "Chase Ultimate Rewards",
      "Capital One Miles",
      "Bilt Rewards",
      "Marriott Bonvoy",
    ],
  },
  {
    name: "Qatar Privilege Club",
    airlineCode: "QR",
    airline: "Qatar Airways",
    alliance: "Oneworld",
    purchaseMileCostPer1000: 30,
    marketValueCents: 1.4,
    taxProfile: "medium",
    transferPartnersFrom: [
      "Citi ThankYou",
      "Bilt Rewards",
      "Marriott Bonvoy",
    ],
  },
  {
    name: "Cathay Pacific Asia Miles",
    airlineCode: "CX",
    airline: "Cathay Pacific",
    alliance: "Oneworld",
    purchaseMileCostPer1000: 30,
    marketValueCents: 1.3,
    taxProfile: "medium",
    transferPartnersFrom: [
      "Amex Membership Rewards",
      "Citi ThankYou",
      "Capital One Miles",
      "Bilt Rewards",
      "Marriott Bonvoy",
    ],
  },
  {
    name: "AAdvantage",
    airlineCode: "AA",
    airline: "American Airlines",
    alliance: "Oneworld",
    purchaseMileCostPer1000: 30,
    marketValueCents: 1.3,
    taxProfile: "low",
    transferPartnersFrom: [
      "Marriott Bonvoy",
    ],
  },
  {
    name: "Iberia Avios Plus",
    airlineCode: "IB",
    airline: "Iberia",
    alliance: "Oneworld",
    purchaseMileCostPer1000: 22,
    marketValueCents: 1.3,
    taxProfile: "low",   // much lower surcharges than BA
    transferPartnersFrom: [
      "Amex Membership Rewards",
      "Chase Ultimate Rewards",
      "Capital One Miles",
      "Bilt Rewards",
      "Marriott Bonvoy",
    ],
  },
  {
    name: "Alaska Mileage Plan",
    airlineCode: "AS",
    airline: "Alaska Airlines",
    alliance: "Oneworld",
    purchaseMileCostPer1000: 25,
    marketValueCents: 1.5,
    taxProfile: "low",
    transferPartnersFrom: [
      "Marriott Bonvoy",
      "Bilt Rewards",
    ],
  },
  {
    name: "Qantas Frequent Flyer",
    airlineCode: "QF",
    airline: "Qantas",
    alliance: "Oneworld",
    purchaseMileCostPer1000: 28,
    marketValueCents: 1.2,
    taxProfile: "high",
    transferPartnersFrom: [
      "Amex Membership Rewards",
      "Marriott Bonvoy",
    ],
  },
  {
    name: "Japan Airlines Mileage Bank",
    airlineCode: "JL",
    airline: "Japan Airlines",
    alliance: "Oneworld",
    purchaseMileCostPer1000: null,
    marketValueCents: 1.3,
    taxProfile: "low",
    transferPartnersFrom: [
      "Marriott Bonvoy",
    ],
  },
  {
    name: "Malaysia Airlines Enrich",
    airlineCode: "MH",
    airline: "Malaysia Airlines",
    alliance: "Oneworld",
    purchaseMileCostPer1000: 28,
    marketValueCents: 1.0,
    taxProfile: "medium",
    transferPartnersFrom: [
      "Marriott Bonvoy",
    ],
  },
  {
    name: "Royal Jordanian Royal Plus",
    airlineCode: "RJ",
    airline: "Royal Jordanian",
    alliance: "Oneworld",
    purchaseMileCostPer1000: null,
    marketValueCents: 0.8,
    taxProfile: "low",
    transferPartnersFrom: [],
  },
  {
    name: "SriLankan FlySmiLes",
    airlineCode: "UL",
    airline: "SriLankan Airlines",
    alliance: "Oneworld",
    purchaseMileCostPer1000: null,
    marketValueCents: 0.7,
    taxProfile: "low",
    transferPartnersFrom: [],
  },
  {
    name: "Finnair Plus",
    airlineCode: "AY",
    airline: "Finnair",
    alliance: "Oneworld",
    purchaseMileCostPer1000: null,
    marketValueCents: 1.0,
    taxProfile: "medium",
    transferPartnersFrom: [
      "Marriott Bonvoy",
    ],
  },

  // ── Independent ──────────────────────────────────────────────────────
  {
    name: "Emirates Skywards",
    airlineCode: "EK",
    airline: "Emirates",
    alliance: "Independent",
    purchaseMileCostPer1000: 30,
    marketValueCents: 1.0,
    taxProfile: "medium",
    transferPartnersFrom: [
      "Amex Membership Rewards",
      "Chase Ultimate Rewards",
      "Capital One Miles",
      "Citi ThankYou",
      "Bilt Rewards",
      "Marriott Bonvoy",
    ],
  },
  {
    name: "Etihad Guest",
    airlineCode: "EY",
    airline: "Etihad Airways",
    alliance: "Independent",
    purchaseMileCostPer1000: 28,
    marketValueCents: 1.2,
    taxProfile: "medium",
    transferPartnersFrom: [
      "Amex Membership Rewards",
      "Citi ThankYou",
      "Capital One Miles",
      "Marriott Bonvoy",
    ],
  },
  {
    name: "Virgin Atlantic Flying Club",
    airlineCode: "VS",
    airline: "Virgin Atlantic",
    alliance: "Independent",
    purchaseMileCostPer1000: 25,
    marketValueCents: 1.4,
    taxProfile: "medium",
    transferPartnersFrom: [
      "Amex Membership Rewards",
      "Chase Ultimate Rewards",
      "Capital One Miles",
      "Citi ThankYou",
      "Bilt Rewards",
      "Marriott Bonvoy",
    ],
  },
  {
    name: "JetBlue TrueBlue",
    airlineCode: "B6",
    airline: "JetBlue Airways",
    alliance: "Independent",
    purchaseMileCostPer1000: 19,
    marketValueCents: 1.3,
    taxProfile: "low",
    transferPartnersFrom: [
      "Chase Ultimate Rewards",
      "Amex Membership Rewards",
    ],
  },
  {
    name: "Southwest Rapid Rewards",
    airlineCode: "WN",
    airline: "Southwest Airlines",
    alliance: "Independent",
    purchaseMileCostPer1000: 25,
    marketValueCents: 1.4,
    taxProfile: "low",
    transferPartnersFrom: [
      "Chase Ultimate Rewards",
      "Marriott Bonvoy",
    ],
  },
  {
    name: "Hawaiian Airlines HawaiianMiles",
    airlineCode: "HA",
    airline: "Hawaiian Airlines",
    alliance: "Independent",
    purchaseMileCostPer1000: 25,
    marketValueCents: 1.0,
    taxProfile: "low",
    transferPartnersFrom: [
      "Amex Membership Rewards",
      "Marriott Bonvoy",
    ],
  },
  {
    name: "Aeroflot Bonus",
    airlineCode: "SU",
    airline: "Aeroflot",
    alliance: "Independent",
    purchaseMileCostPer1000: null,
    marketValueCents: 0.5,
    taxProfile: "low",
    transferPartnersFrom: [],
  },
  {
    name: "China Southern Sky Pearl Club",
    airlineCode: "CZ",
    airline: "China Southern Airlines",
    alliance: "Independent",
    purchaseMileCostPer1000: null,
    marketValueCents: 0.8,
    taxProfile: "low",
    transferPartnersFrom: [],
  },
  {
    name: "China Eastern Eastern Miles",
    airlineCode: "MU",
    airline: "China Eastern Airlines",
    alliance: "Independent",
    purchaseMileCostPer1000: null,
    marketValueCents: 0.7,
    taxProfile: "low",
    transferPartnersFrom: [],
  },
  {
    name: "Air China PhoenixMiles",
    airlineCode: "CA",
    airline: "Air China",
    alliance: "Star Alliance",
    purchaseMileCostPer1000: null,
    marketValueCents: 0.7,
    taxProfile: "low",
    transferPartnersFrom: [],
  },
  {
    name: "Hainan Fortune Wings Club",
    airlineCode: "HU",
    airline: "Hainan Airlines",
    alliance: "Independent",
    purchaseMileCostPer1000: null,
    marketValueCents: 0.6,
    taxProfile: "low",
    transferPartnersFrom: [],
  },
  {
    name: "IndiGo 6E Rewards",
    airlineCode: "6E",
    airline: "IndiGo",
    alliance: "Independent",
    purchaseMileCostPer1000: null,
    marketValueCents: 0.5,
    taxProfile: "low",
    transferPartnersFrom: [],
  },
  {
    name: "Air India Flying Returns",
    airlineCode: "AI",
    airline: "Air India",
    alliance: "Star Alliance",
    purchaseMileCostPer1000: null,
    marketValueCents: 0.6,
    taxProfile: "low",
    transferPartnersFrom: [],
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

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
