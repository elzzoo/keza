// data/milesPrices.ts
// Base purchase price per mile per program (cents USD).
// Update basePriceCents when airline changes standard pricing.
// Promos override via cron → Redis.

export interface MilesPriceRecord {
  program: string;
  basePriceCents: number;    // e.g. 3.5 = 3.5¢ per mile
  minPurchase: number;       // minimum miles per transaction
  maxPurchasePerYear: number;
  lastUpdated: string;       // ISO date — flag if stale > 90 days
}

export const MILES_PRICES: MilesPriceRecord[] = [
  {
    program: "Flying Blue",
    basePriceCents: 3.5,
    minPurchase: 2_000,
    maxPurchasePerYear: 100_000,
    lastUpdated: "2026-04-01",
  },
  {
    program: "Turkish Miles&Smiles",
    basePriceCents: 1.8,
    minPurchase: 1_000,
    maxPurchasePerYear: 150_000,
    lastUpdated: "2026-04-01",
  },
  {
    program: "Emirates Skywards",
    basePriceCents: 3.5,
    minPurchase: 1_000,
    maxPurchasePerYear: 200_000,
    lastUpdated: "2026-04-01",
  },
  {
    program: "Qatar Privilege Club",
    basePriceCents: 3.0,
    minPurchase: 1_000,
    maxPurchasePerYear: 150_000,
    lastUpdated: "2026-04-01",
  },
  {
    program: "British Airways Avios",
    basePriceCents: 2.5,
    minPurchase: 1_000,
    maxPurchasePerYear: 100_000,
    lastUpdated: "2026-04-01",
  },
  {
    program: "Ethiopian ShebaMiles",
    basePriceCents: 2.8,
    minPurchase: 1_000,
    maxPurchasePerYear: 100_000,
    lastUpdated: "2026-04-01",
  },
  {
    program: "Air Canada Aeroplan",
    basePriceCents: 3.0,
    minPurchase: 1_000,
    maxPurchasePerYear: 150_000,
    lastUpdated: "2026-04-01",
  },
  {
    program: "United MileagePlus",
    basePriceCents: 3.5,
    minPurchase: 1_000,
    maxPurchasePerYear: 150_000,
    lastUpdated: "2026-04-01",
  },
  // Transferable currencies
  {
    program: "Amex MR",
    basePriceCents: 2.0,
    minPurchase: 1_000,
    maxPurchasePerYear: 250_000,
    lastUpdated: "2026-04-01",
  },
  {
    program: "Chase UR",
    basePriceCents: 1.5,
    minPurchase: 1_000,
    maxPurchasePerYear: 250_000,
    lastUpdated: "2026-04-01",
  },
  {
    program: "Citi ThankYou",
    basePriceCents: 1.7,
    minPurchase: 1_000,
    maxPurchasePerYear: 200_000,
    lastUpdated: "2026-04-01",
  },
  {
    program: "Capital One Miles",
    basePriceCents: 1.8,
    minPurchase: 1_000,
    maxPurchasePerYear: 200_000,
    lastUpdated: "2026-04-01",
  },
];

// Fast lookup map: program name → base price in cents
export const MILES_PRICE_MAP: Map<string, number> = new Map(
  MILES_PRICES.map((r) => [r.program, r.basePriceCents])
);
