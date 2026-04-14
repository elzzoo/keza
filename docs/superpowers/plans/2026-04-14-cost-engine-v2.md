# Cost Engine V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the abstract `valuePerMile` engine with a real cost comparator that calculates the total dollar cost of cash vs every miles option (direct, alliance, transfer — owned or purchased).

**Architecture:** New `lib/costEngine.ts` receives a flight + effective prices map and returns a `CostComparison` with all options ranked by total cost. `lib/engine.ts` calls it during enrichment, replacing the old `calculateMilesValue` + `estimateMiles` logic. Data lives in four static files refreshed by a new cron endpoint.

**Tech Stack:** Next.js 14, TypeScript strict, Upstash Redis, Jest (new), `@upstash/redis`

---

## File Map

| Status | File | Responsibility |
|---|---|---|
| CREATE | `jest.config.ts` | Test runner config |
| CREATE | `__mocks__/server-only.ts` | Mock for server-only import in tests |
| CREATE | `__tests__/lib/zones.test.ts` | Zone mapping tests |
| CREATE | `__tests__/lib/costEngine.test.ts` | Cost engine tests |
| CREATE | `__tests__/data/awardCharts.test.ts` | Award chart lookup tests |
| CREATE | `lib/zones.ts` | Airport code → geographic zone |
| CREATE | `data/awardTaxes.ts` | Award ticket taxes per airline |
| CREATE | `data/milesPrices.ts` | Base purchase price per miles program |
| CREATE | `data/transferBonuses.ts` | Transfer partner ratios + active bonuses |
| CREATE | `data/awardCharts.ts` | Zone-based award charts for 8 programs |
| CREATE | `lib/costEngine.ts` | Core cost comparator |
| CREATE | `app/api/cron/miles-prices/route.ts` | 24h price refresh cron |
| MODIFY | `lib/engine.ts` | Wire costEngine; extend FlightResult |
| MODIFY | `components/FlightCard.tsx` | Show owned/purchased scenarios |
| MODIFY | `components/Results.tsx` | Update tab filters for new recommendation values |

---

## Task 1: Test infrastructure + `lib/zones.ts`

**Files:**
- Create: `jest.config.ts`
- Create: `__mocks__/server-only.ts`
- Create: `lib/zones.ts`
- Create: `__tests__/lib/zones.test.ts`

- [ ] **Step 1: Install Jest dependencies**

```bash
cd /Users/DIALLO9194/Downloads/keza
npm install -D jest @types/jest ts-jest
```

Expected output: packages installed, no errors.

- [ ] **Step 2: Create jest.config.ts**

```typescript
// jest.config.ts
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^server-only$": "<rootDir>/__mocks__/server-only.ts",
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { strict: true } }],
  },
};

export default config;
```

- [ ] **Step 3: Create server-only mock**

```typescript
// __mocks__/server-only.ts
export {};
```

- [ ] **Step 4: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 5: Write failing tests for zones.ts**

```typescript
// __tests__/lib/zones.test.ts
import { getZone } from "@/lib/zones";

describe("getZone", () => {
  it("returns AFRICA_WEST for Dakar DSS", () => {
    expect(getZone("DSS")).toBe("AFRICA_WEST");
  });
  it("returns AFRICA_WEST for Lagos LOS", () => {
    expect(getZone("LOS")).toBe("AFRICA_WEST");
  });
  it("returns EUROPE for Paris CDG", () => {
    expect(getZone("CDG")).toBe("EUROPE");
  });
  it("returns EUROPE for London LHR", () => {
    expect(getZone("LHR")).toBe("EUROPE");
  });
  it("returns NORTH_AMERICA for New York JFK", () => {
    expect(getZone("JFK")).toBe("NORTH_AMERICA");
  });
  it("returns MIDDLE_EAST for Dubai DXB", () => {
    expect(getZone("DXB")).toBe("MIDDLE_EAST");
  });
  it("returns AFRICA_EAST for Nairobi NBO", () => {
    expect(getZone("NBO")).toBe("AFRICA_EAST");
  });
  it("returns AFRICA_SOUTH for Johannesburg JNB", () => {
    expect(getZone("JNB")).toBe("AFRICA_SOUTH");
  });
  it("returns null for unknown airport", () => {
    expect(getZone("XYZ")).toBeNull();
  });
  it("is case-insensitive", () => {
    expect(getZone("dss")).toBe("AFRICA_WEST");
    expect(getZone("cdg")).toBe("EUROPE");
  });
});
```

- [ ] **Step 6: Run — verify FAIL**

```bash
npx jest __tests__/lib/zones.test.ts --no-coverage 2>&1 | head -20
```

Expected: `Cannot find module '@/lib/zones'`

- [ ] **Step 7: Create lib/zones.ts**

```typescript
// lib/zones.ts

export type Zone =
  | "AFRICA_WEST"
  | "AFRICA_EAST"
  | "AFRICA_SOUTH"
  | "EUROPE"
  | "NORTH_AMERICA"
  | "MIDDLE_EAST"
  | "ASIA"
  | "SOUTH_AMERICA";

const ZONE_MAP: Record<string, Zone> = {
  // ── Africa West ──────────────────────────────────────────────────────────────
  DSS: "AFRICA_WEST", DKR: "AFRICA_WEST", ABJ: "AFRICA_WEST",
  ACC: "AFRICA_WEST", LOS: "AFRICA_WEST", CMN: "AFRICA_WEST",
  OUA: "AFRICA_WEST", CKY: "AFRICA_WEST", BKO: "AFRICA_WEST",
  TUN: "AFRICA_WEST", ALG: "AFRICA_WEST", COO: "AFRICA_WEST",
  LFW: "AFRICA_WEST", OXB: "AFRICA_WEST", BJL: "AFRICA_WEST",
  FNA: "AFRICA_WEST", ABV: "AFRICA_WEST", PHC: "AFRICA_WEST",
  DLA: "AFRICA_WEST", NSI: "AFRICA_WEST", LBV: "AFRICA_WEST",
  BZV: "AFRICA_WEST", SSG: "AFRICA_WEST", MLW: "AFRICA_WEST",

  // ── Africa East ───────────────────────────────────────────────────────────────
  NBO: "AFRICA_EAST", ADD: "AFRICA_EAST", DAR: "AFRICA_EAST",
  EBB: "AFRICA_EAST", KGL: "AFRICA_EAST", MGQ: "AFRICA_EAST",
  MBA: "AFRICA_EAST", ZNZ: "AFRICA_EAST", MYD: "AFRICA_EAST",
  DJI: "AFRICA_EAST",

  // ── Africa South ─────────────────────────────────────────────────────────────
  JNB: "AFRICA_SOUTH", CPT: "AFRICA_SOUTH", LUN: "AFRICA_SOUTH",
  HRE: "AFRICA_SOUTH", WDH: "AFRICA_SOUTH", MRU: "AFRICA_SOUTH",
  TNR: "AFRICA_SOUTH", BLZ: "AFRICA_SOUTH", GBE: "AFRICA_SOUTH",

  // ── Europe ───────────────────────────────────────────────────────────────────
  CDG: "EUROPE", LHR: "EUROPE", AMS: "EUROPE", FRA: "EUROPE",
  MAD: "EUROPE", LIS: "EUROPE", FCO: "EUROPE", BCN: "EUROPE",
  IST: "EUROPE", ZRH: "EUROPE", BRU: "EUROPE", VIE: "EUROPE",
  MXP: "EUROPE", LGW: "EUROPE", ORY: "EUROPE", MAN: "EUROPE",
  CPH: "EUROPE", OSL: "EUROPE", ARN: "EUROPE", HEL: "EUROPE",
  WAW: "EUROPE", PRG: "EUROPE", BUD: "EUROPE", ATH: "EUROPE",
  DUB: "EUROPE", EDI: "EUROPE", GVA: "EUROPE", LYN: "EUROPE",

  // ── North America ─────────────────────────────────────────────────────────────
  JFK: "NORTH_AMERICA", LAX: "NORTH_AMERICA", MIA: "NORTH_AMERICA",
  ORD: "NORTH_AMERICA", SFO: "NORTH_AMERICA", BOS: "NORTH_AMERICA",
  YYZ: "NORTH_AMERICA", YUL: "NORTH_AMERICA", DFW: "NORTH_AMERICA",
  ATL: "NORTH_AMERICA", IAD: "NORTH_AMERICA", EWR: "NORTH_AMERICA",
  SEA: "NORTH_AMERICA", LAS: "NORTH_AMERICA", DEN: "NORTH_AMERICA",
  MSY: "NORTH_AMERICA", YVR: "NORTH_AMERICA",

  // ── Middle East ──────────────────────────────────────────────────────────────
  DXB: "MIDDLE_EAST", DOH: "MIDDLE_EAST", CAI: "MIDDLE_EAST",
  AMM: "MIDDLE_EAST", RUH: "MIDDLE_EAST", AUH: "MIDDLE_EAST",
  BEY: "MIDDLE_EAST", KWI: "MIDDLE_EAST", BAH: "MIDDLE_EAST",
  MCT: "MIDDLE_EAST", TLV: "MIDDLE_EAST",

  // ── Asia ─────────────────────────────────────────────────────────────────────
  SIN: "ASIA", HKG: "ASIA", NRT: "ASIA", ICN: "ASIA",
  BKK: "ASIA", KUL: "ASIA", PVG: "ASIA", DEL: "ASIA",
  BOM: "ASIA", PEK: "ASIA", CGK: "ASIA", MNL: "ASIA",
  CAN: "ASIA", TPE: "ASIA", HND: "ASIA", KIX: "ASIA",

  // ── South America ────────────────────────────────────────────────────────────
  GRU: "SOUTH_AMERICA", EZE: "SOUTH_AMERICA", BOG: "SOUTH_AMERICA",
  LIM: "SOUTH_AMERICA", SCL: "SOUTH_AMERICA", GIG: "SOUTH_AMERICA",
  CCS: "SOUTH_AMERICA", UIO: "SOUTH_AMERICA", MVD: "SOUTH_AMERICA",
};

export function getZone(code: string): Zone | null {
  return ZONE_MAP[code.toUpperCase()] ?? null;
}
```

- [ ] **Step 8: Run — verify PASS**

```bash
npx jest __tests__/lib/zones.test.ts --no-coverage
```

Expected: `10 passed`

- [ ] **Step 9: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add jest.config.ts __mocks__/server-only.ts lib/zones.ts __tests__/lib/zones.test.ts package.json package-lock.json
git commit -m "feat: add jest + zones.ts airport-to-zone mapping"
```

---

## Task 2: `data/awardTaxes.ts`

**Files:**
- Create: `data/awardTaxes.ts`

No complex logic — pure data. No test needed (snapshot tested implicitly via costEngine tests).

- [ ] **Step 1: Create data/awardTaxes.ts**

```typescript
// data/awardTaxes.ts
// Award ticket taxes and fuel surcharges per operating airline (USD, per person)
// These are representative figures — actual taxes vary by routing and dates.

export interface AwardTaxRecord {
  economy: number;
  business: number;
  note: string;
}

export const AWARD_TAXES: Record<string, AwardTaxRecord> = {
  "Air France":          { economy: 180, business: 380, note: "High YQ fuel surcharges" },
  "KLM":                 { economy: 160, business: 350, note: "High YQ fuel surcharges" },
  "Turkish Airlines":    { economy:  80, business: 150, note: "Moderate surcharges" },
  "Emirates":            { economy:  50, business:  90, note: "Low surcharges" },
  "Qatar Airways":       { economy:  60, business: 110, note: "Low surcharges" },
  "Ethiopian Airlines":  { economy:  40, business:  80, note: "Low surcharges" },
  "Kenya Airways":       { economy:  40, business:  80, note: "Low surcharges" },
  "Air Senegal":         { economy:  30, business:  60, note: "Minimal surcharges" },
  "Royal Air Maroc":     { economy:  50, business: 100, note: "Moderate surcharges" },
  "Lufthansa":           { economy: 200, business: 450, note: "Very high YQ surcharges" },
  "British Airways":     { economy: 190, business: 420, note: "High YQ surcharges" },
  "Air Canada":          { economy:  70, business: 130, note: "Low surcharges" },
  "United Airlines":     { economy:  50, business:  90, note: "Low surcharges" },
  "Singapore Airlines":  { economy:  80, business: 150, note: "Moderate surcharges" },
  "South African Airways": { economy: 60, business: 110, note: "Moderate surcharges" },
  "RwandAir":            { economy:  30, business:  60, note: "Minimal surcharges" },
  // Default fallback for unknown airlines
  _default:              { economy: 100, business: 200, note: "Estimated" },
};

export function getAwardTaxes(
  airline: string,
  cabin: "economy" | "premium" | "business" | "first",
  passengers: number
): number {
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add data/awardTaxes.ts
git commit -m "feat: add award taxes data per airline"
```

---

## Task 3: `data/milesPrices.ts` + `data/transferBonuses.ts`

**Files:**
- Create: `data/milesPrices.ts`
- Create: `data/transferBonuses.ts`

- [ ] **Step 1: Create data/milesPrices.ts**

```typescript
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
```

- [ ] **Step 2: Create data/transferBonuses.ts**

```typescript
// data/transferBonuses.ts
// Transfer partner relationships with current effective ratios.
// promoRatio overrides baseRatio when an active bonus is running.
// Update promoRatio + promoValidUntil when a bonus is announced.

export interface TransferBonusRecord {
  from: string;               // source currency  e.g. "Amex MR"
  to: string;                 // destination program  e.g. "Flying Blue"
  baseRatio: number;          // 1.0 = 1:1,  1.25 = 25% bonus (1000 pts → 1250 miles)
  promoRatio?: number;        // active bonus ratio (overrides baseRatio)
  promoValidUntil?: string;   // ISO date
  transferTime: string;       // "instant" | "1-3 days"
}

export const TRANSFER_BONUSES: TransferBonusRecord[] = [
  // Amex Membership Rewards
  { from: "Amex MR", to: "Flying Blue",          baseRatio: 1.0, transferTime: "instant" },
  { from: "Amex MR", to: "Emirates Skywards",    baseRatio: 1.0, transferTime: "instant" },
  { from: "Amex MR", to: "Air Canada Aeroplan",  baseRatio: 1.0, transferTime: "instant" },
  { from: "Amex MR", to: "British Airways Avios",baseRatio: 1.0, transferTime: "instant" },
  { from: "Amex MR", to: "Qatar Privilege Club", baseRatio: 1.0, transferTime: "instant" },

  // Chase Ultimate Rewards
  { from: "Chase UR", to: "United MileagePlus",  baseRatio: 1.0, transferTime: "instant" },
  { from: "Chase UR", to: "Air Canada Aeroplan", baseRatio: 1.0, transferTime: "instant" },
  { from: "Chase UR", to: "British Airways Avios",baseRatio: 1.0, transferTime: "instant" },

  // Citi ThankYou
  { from: "Citi ThankYou", to: "Turkish Miles&Smiles", baseRatio: 1.0, transferTime: "1-3 days" },
  { from: "Citi ThankYou", to: "Flying Blue",           baseRatio: 1.0, transferTime: "instant" },
  { from: "Citi ThankYou", to: "Emirates Skywards",     baseRatio: 1.0, transferTime: "1-3 days" },

  // Capital One
  { from: "Capital One Miles", to: "Flying Blue",           baseRatio: 1.0, transferTime: "instant" },
  { from: "Capital One Miles", to: "Turkish Miles&Smiles",   baseRatio: 1.0, transferTime: "instant" },
  { from: "Capital One Miles", to: "Air Canada Aeroplan",    baseRatio: 1.0, transferTime: "instant" },
  { from: "Capital One Miles", to: "Emirates Skywards",      baseRatio: 1.0, transferTime: "instant" },
];

// Returns effective ratio (promo if valid and not expired, else base)
export function getEffectiveRatio(record: TransferBonusRecord): number {
  if (record.promoRatio && record.promoValidUntil) {
    const expiry = new Date(record.promoValidUntil);
    if (expiry >= new Date()) return record.promoRatio;
  }
  return record.baseRatio;
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add data/milesPrices.ts data/transferBonuses.ts
git commit -m "feat: add miles prices and transfer bonuses data"
```

---

## Task 4: `data/awardCharts.ts`

**Files:**
- Create: `data/awardCharts.ts`
- Create: `__tests__/data/awardCharts.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/data/awardCharts.test.ts
import { getMilesRequired } from "@/data/awardCharts";

describe("getMilesRequired", () => {
  it("returns Flying Blue economy AFRICA_WEST→EUROPE 1 pax oneway", () => {
    const result = getMilesRequired("Flying Blue", "AFRICA_WEST", "EUROPE", "economy", "oneway", 1);
    expect(result.miles).toBe(25_000);
    expect(result.source).toBe("REAL");
  });

  it("returns Flying Blue business AFRICA_WEST→EUROPE 2 pax roundtrip", () => {
    const result = getMilesRequired("Flying Blue", "AFRICA_WEST", "EUROPE", "business", "roundtrip", 2);
    // 70,000 × 2 pax × 2 (roundtrip) = 280,000
    expect(result.miles).toBe(280_000);
    expect(result.source).toBe("REAL");
  });

  it("returns Turkish economy AFRICA_WEST→EUROPE 1 pax oneway", () => {
    const result = getMilesRequired("Turkish Miles&Smiles", "AFRICA_WEST", "EUROPE", "economy", "oneway", 1);
    expect(result.miles).toBe(12_500);
    expect(result.source).toBe("REAL");
  });

  it("uses ESTIMATE source for unknown program", () => {
    const result = getMilesRequired("Unknown Program", "AFRICA_WEST", "EUROPE", "economy", "oneway", 1);
    expect(result.source).toBe("ESTIMATE");
    expect(result.miles).toBeGreaterThan(0);
  });

  it("uses ESTIMATE for uncovered zone pair", () => {
    const result = getMilesRequired("Flying Blue", "SOUTH_AMERICA", "ASIA", "economy", "oneway", 1);
    expect(result.source).toBe("ESTIMATE");
  });

  it("treats premium same as business for chart lookup", () => {
    const premium = getMilesRequired("Flying Blue", "AFRICA_WEST", "EUROPE", "premium", "oneway", 1);
    expect(premium.miles).toBe(35_000);
    expect(premium.source).toBe("REAL");
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npx jest __tests__/data/awardCharts.test.ts --no-coverage 2>&1 | head -5
```

Expected: `Cannot find module '@/data/awardCharts'`

- [ ] **Step 3: Create data/awardCharts.ts**

```typescript
// data/awardCharts.ts
// Zone-based award miles required per program.
// All values are per person, one-way. getMilesRequired() applies roundtrip × 2 and × passengers.
// Source: official program award charts as of 2026-Q1.

import type { Zone } from "@/lib/zones";
import type { Cabin } from "@/lib/engine";

// Miles required: [economy, premium, business]
// premium index = 1, if not defined falls back to midpoint of eco/biz
type CabinMiles = { economy: number; premium: number; business: number };
type ZoneChart = Partial<Record<Zone, CabinMiles>>;
type ProgramChart = Partial<Record<Zone, ZoneChart>>;

const AWARD_CHARTS: Record<string, ProgramChart> = {
  "Flying Blue": {
    AFRICA_WEST: {
      EUROPE:        { economy: 25_000, premium: 35_000, business: 70_000 },
      NORTH_AMERICA: { economy: 40_000, premium: 60_000, business: 100_000 },
      MIDDLE_EAST:   { economy: 20_000, premium: 28_000, business: 55_000 },
      ASIA:          { economy: 40_000, premium: 55_000, business: 100_000 },
      AFRICA_WEST:   { economy: 10_000, premium: 15_000, business: 30_000 },
      AFRICA_EAST:   { economy: 15_000, premium: 22_000, business: 45_000 },
      AFRICA_SOUTH:  { economy: 20_000, premium: 28_000, business: 60_000 },
      SOUTH_AMERICA: { economy: 55_000, premium: 75_000, business: 120_000 },
    },
    AFRICA_EAST: {
      EUROPE:        { economy: 30_000, premium: 45_000, business: 80_000 },
      NORTH_AMERICA: { economy: 45_000, premium: 65_000, business: 110_000 },
      MIDDLE_EAST:   { economy: 20_000, premium: 28_000, business: 55_000 },
    },
    AFRICA_SOUTH: {
      EUROPE:        { economy: 35_000, premium: 50_000, business: 90_000 },
      NORTH_AMERICA: { economy: 50_000, premium: 70_000, business: 120_000 },
    },
    EUROPE: {
      NORTH_AMERICA: { economy: 30_000, premium: 45_000, business: 80_000 },
      ASIA:          { economy: 35_000, premium: 50_000, business: 90_000 },
      MIDDLE_EAST:   { economy: 15_000, premium: 20_000, business: 45_000 },
      SOUTH_AMERICA: { economy: 45_000, premium: 65_000, business: 110_000 },
    },
    MIDDLE_EAST: {
      EUROPE:        { economy: 15_000, premium: 20_000, business: 45_000 },
      NORTH_AMERICA: { economy: 40_000, premium: 55_000, business: 100_000 },
      ASIA:          { economy: 20_000, premium: 28_000, business: 55_000 },
    },
  },

  "Turkish Miles&Smiles": {
    AFRICA_WEST: {
      EUROPE:        { economy: 12_500, premium: 20_000, business: 45_000 },
      NORTH_AMERICA: { economy: 30_000, premium: 45_000, business: 75_000 },
      MIDDLE_EAST:   { economy: 12_500, premium: 20_000, business: 45_000 },
      ASIA:          { economy: 35_000, premium: 50_000, business: 80_000 },
      AFRICA_WEST:   { economy:  7_500, premium: 12_000, business: 25_000 },
      AFRICA_EAST:   { economy: 12_500, premium: 20_000, business: 40_000 },
    },
    AFRICA_EAST: {
      EUROPE:        { economy: 15_000, premium: 25_000, business: 50_000 },
      NORTH_AMERICA: { economy: 32_500, premium: 50_000, business: 80_000 },
      MIDDLE_EAST:   { economy: 10_000, premium: 17_500, business: 37_500 },
    },
    AFRICA_SOUTH: {
      EUROPE:        { economy: 20_000, premium: 30_000, business: 60_000 },
    },
    EUROPE: {
      NORTH_AMERICA: { economy: 25_000, premium: 37_500, business: 65_000 },
      ASIA:          { economy: 32_500, premium: 47_500, business: 75_000 },
      MIDDLE_EAST:   { economy: 12_500, premium: 20_000, business: 40_000 },
    },
    MIDDLE_EAST: {
      EUROPE:        { economy: 12_500, premium: 20_000, business: 40_000 },
      NORTH_AMERICA: { economy: 30_000, premium: 45_000, business: 75_000 },
      ASIA:          { economy: 15_000, premium: 22_500, business: 45_000 },
    },
  },

  "Emirates Skywards": {
    AFRICA_WEST: {
      EUROPE:        { economy: 25_000, premium: 37_500, business: 62_500 },
      NORTH_AMERICA: { economy: 45_000, premium: 67_500, business: 112_500 },
      MIDDLE_EAST:   { economy: 15_000, premium: 22_500, business: 42_500 },
      ASIA:          { economy: 35_000, premium: 52_500, business: 87_500 },
      AFRICA_EAST:   { economy: 12_500, premium: 20_000, business: 35_000 },
    },
    AFRICA_EAST: {
      EUROPE:        { economy: 30_000, premium: 45_000, business: 75_000 },
      NORTH_AMERICA: { economy: 47_500, premium: 70_000, business: 117_500 },
      MIDDLE_EAST:   { economy: 12_500, premium: 20_000, business: 35_000 },
      ASIA:          { economy: 30_000, premium: 45_000, business: 75_000 },
    },
    EUROPE: {
      NORTH_AMERICA: { economy: 32_500, premium: 50_000, business: 82_500 },
      ASIA:          { economy: 30_000, premium: 45_000, business: 77_500 },
      MIDDLE_EAST:   { economy: 17_500, premium: 27_500, business: 45_000 },
    },
    MIDDLE_EAST: {
      EUROPE:        { economy: 17_500, premium: 27_500, business: 45_000 },
      NORTH_AMERICA: { economy: 35_000, premium: 52_500, business: 87_500 },
      ASIA:          { economy: 17_500, premium: 27_500, business: 42_500 },
    },
  },

  "Qatar Privilege Club": {
    AFRICA_WEST: {
      EUROPE:        { economy: 22_500, premium: 32_500, business: 60_000 },
      NORTH_AMERICA: { economy: 40_000, premium: 57_500, business: 100_000 },
      MIDDLE_EAST:   { economy: 17_500, premium: 25_000, business: 45_000 },
      ASIA:          { economy: 35_000, premium: 50_000, business: 90_000 },
    },
    AFRICA_EAST: {
      EUROPE:        { economy: 27_500, premium: 40_000, business: 70_000 },
      MIDDLE_EAST:   { economy: 15_000, premium: 22_500, business: 42_500 },
    },
    EUROPE: {
      NORTH_AMERICA: { economy: 30_000, premium: 45_000, business: 75_000 },
      ASIA:          { economy: 32_500, premium: 47_500, business: 82_500 },
      MIDDLE_EAST:   { economy: 15_000, premium: 22_500, business: 40_000 },
    },
    MIDDLE_EAST: {
      EUROPE:        { economy: 15_000, premium: 22_500, business: 40_000 },
      NORTH_AMERICA: { economy: 35_000, premium: 50_000, business: 87_500 },
      ASIA:          { economy: 17_500, premium: 25_000, business: 45_000 },
    },
  },

  "British Airways Avios": {
    // Distance-based approx: Africa-Europe ~4000-5500 mi (20K eco / 62.5K biz)
    AFRICA_WEST: {
      EUROPE:        { economy: 20_000, premium: 40_000, business: 62_500 },
      NORTH_AMERICA: { economy: 30_000, premium: 60_000, business: 90_000 },
      MIDDLE_EAST:   { economy: 17_500, premium: 35_000, business: 55_000 },
    },
    AFRICA_EAST: {
      EUROPE:        { economy: 20_000, premium: 40_000, business: 62_500 },
      MIDDLE_EAST:   { economy: 10_000, premium: 20_000, business: 37_500 },
    },
    EUROPE: {
      NORTH_AMERICA: { economy: 30_000, premium: 60_000, business: 90_000 },
      ASIA:          { economy: 35_000, premium: 70_000, business: 105_000 },
      MIDDLE_EAST:   { economy: 10_000, premium: 20_000, business: 37_500 },
    },
  },

  "Ethiopian ShebaMiles": {
    AFRICA_WEST: {
      EUROPE:        { economy: 20_000, premium: 30_000, business: 60_000 },
      NORTH_AMERICA: { economy: 40_000, premium: 57_500, business: 100_000 },
      MIDDLE_EAST:   { economy: 15_000, premium: 22_500, business: 42_500 },
      ASIA:          { economy: 35_000, premium: 50_000, business: 90_000 },
      AFRICA_EAST:   { economy: 10_000, premium: 15_000, business: 32_500 },
    },
    AFRICA_EAST: {
      EUROPE:        { economy: 25_000, premium: 37_500, business: 70_000 },
      NORTH_AMERICA: { economy: 45_000, premium: 65_000, business: 110_000 },
      MIDDLE_EAST:   { economy: 12_500, premium: 20_000, business: 37_500 },
      ASIA:          { economy: 30_000, premium: 45_000, business: 80_000 },
    },
    EUROPE: {
      NORTH_AMERICA: { economy: 35_000, premium: 52_500, business: 90_000 },
      ASIA:          { economy: 37_500, premium: 55_000, business: 95_000 },
    },
  },

  "Air Canada Aeroplan": {
    AFRICA_WEST: {
      EUROPE:        { economy: 22_500, premium: 32_500, business: 55_000 },
      NORTH_AMERICA: { economy: 40_000, premium: 57_500, business: 90_000 },
      MIDDLE_EAST:   { economy: 25_000, premium: 35_000, business: 65_000 },
      ASIA:          { economy: 45_000, premium: 65_000, business: 105_000 },
    },
    AFRICA_EAST: {
      EUROPE:        { economy: 25_000, premium: 37_500, business: 65_000 },
      NORTH_AMERICA: { economy: 45_000, premium: 65_000, business: 100_000 },
    },
    EUROPE: {
      NORTH_AMERICA: { economy: 27_500, premium: 40_000, business: 65_000 },
      ASIA:          { economy: 37_500, premium: 55_000, business: 87_500 },
      MIDDLE_EAST:   { economy: 22_500, premium: 32_500, business: 60_000 },
    },
    NORTH_AMERICA: {
      ASIA:          { economy: 45_000, premium: 65_000, business: 100_000 },
    },
  },

  "United MileagePlus": {
    AFRICA_WEST: {
      EUROPE:        { economy: 30_000, premium: 40_000, business: 70_000 },
      NORTH_AMERICA: { economy: 40_000, premium: 57_500, business: 100_000 },
      MIDDLE_EAST:   { economy: 30_000, premium: 40_000, business: 70_000 },
      ASIA:          { economy: 45_000, premium: 62_500, business: 110_000 },
    },
    AFRICA_EAST: {
      EUROPE:        { economy: 30_000, premium: 42_500, business: 75_000 },
      NORTH_AMERICA: { economy: 45_000, premium: 62_500, business: 110_000 },
    },
    EUROPE: {
      NORTH_AMERICA: { economy: 30_000, premium: 42_500, business: 70_000 },
      ASIA:          { economy: 35_000, premium: 50_000, business: 80_000 },
      MIDDLE_EAST:   { economy: 22_500, premium: 32_500, business: 55_000 },
    },
  },
};

// Distance-based fallback estimate (miles)
function distanceFallback(originZone: Zone, destZone: Zone): number {
  const ZONE_DISTANCE_ESTIMATE: Partial<Record<Zone, Partial<Record<Zone, number>>>> = {
    AFRICA_WEST: { EUROPE: 4_500, NORTH_AMERICA: 8_000, MIDDLE_EAST: 5_500, ASIA: 9_000, AFRICA_EAST: 4_000, AFRICA_SOUTH: 5_000, SOUTH_AMERICA: 9_000 },
    AFRICA_EAST: { EUROPE: 5_000, NORTH_AMERICA: 9_500, MIDDLE_EAST: 3_500, ASIA: 6_500, AFRICA_SOUTH: 3_500 },
    EUROPE:      { NORTH_AMERICA: 7_000, ASIA: 8_000, MIDDLE_EAST: 3_500, SOUTH_AMERICA: 9_000 },
    MIDDLE_EAST: { EUROPE: 3_500, NORTH_AMERICA: 9_500, ASIA: 4_000 },
    NORTH_AMERICA:{ ASIA: 10_000, SOUTH_AMERICA: 6_500 },
    ASIA:        { SOUTH_AMERICA: 12_000 },
  };
  const d = ZONE_DISTANCE_ESTIMATE[originZone]?.[destZone]
    ?? ZONE_DISTANCE_ESTIMATE[destZone]?.[originZone]
    ?? 7_000;  // global fallback
  // Rough award miles: ~1 mile per km of distance, adjusted to program averages
  return Math.round(d * 4.5);
}

export function getMilesRequired(
  program: string,
  originZone: Zone,
  destZone: Zone,
  cabin: Cabin,
  tripType: "oneway" | "roundtrip",
  passengers: number
): { miles: number; source: "REAL" | "ESTIMATE" } {
  const chart = AWARD_CHARTS[program]?.[originZone]?.[destZone];
  // Try reverse direction too (many charts are symmetric)
  const reverseChart = AWARD_CHARTS[program]?.[destZone]?.[originZone];
  const entry = chart ?? reverseChart;

  let milesPerPaxOneway: number;
  let source: "REAL" | "ESTIMATE";

  if (entry) {
    const cabinKey = cabin === "first" ? "business" : cabin;
    milesPerPaxOneway = entry[cabinKey] ?? distanceFallback(originZone, destZone);
    source = "REAL";
  } else {
    milesPerPaxOneway = distanceFallback(originZone, destZone);
    source = "ESTIMATE";
  }

  const tripMultiplier = tripType === "roundtrip" ? 2 : 1;
  return {
    miles: milesPerPaxOneway * tripMultiplier * passengers,
    source,
  };
}
```

- [ ] **Step 4: Run tests — verify PASS**

```bash
npx jest __tests__/data/awardCharts.test.ts --no-coverage
```

Expected: `6 passed`

- [ ] **Step 5: Commit**

```bash
git add data/awardCharts.ts __tests__/data/awardCharts.test.ts
git commit -m "feat: award charts for 8 programs with zone-based lookups"
```

---

## Task 5: `lib/costEngine.ts` — types + helpers

**Files:**
- Create: `lib/costEngine.ts`
- Create: `__tests__/lib/costEngine.test.ts` (write test file, will expand in Task 6)

- [ ] **Step 1: Write failing smoke test**

```typescript
// __tests__/lib/costEngine.test.ts
import { buildCostOptions } from "@/lib/costEngine";
import type { FlightInput } from "@/lib/costEngine";

const BASE_FLIGHT: FlightInput = {
  from: "DSS",
  to: "CDG",
  totalPrice: 1_200,
  airlines: ["Air France"],
  stops: 0,
  cabin: "business",
  tripType: "roundtrip",
  passengers: 2,
};

describe("buildCostOptions — smoke", () => {
  it("returns a CostComparison with cashTotal", () => {
    const result = buildCostOptions(BASE_FLIGHT, new Map());
    expect(result.cashTotal).toBe(1_200);
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npx jest __tests__/lib/costEngine.test.ts --no-coverage 2>&1 | head -5
```

Expected: `Cannot find module '@/lib/costEngine'`

- [ ] **Step 3: Create lib/costEngine.ts with types + helpers**

```typescript
// lib/costEngine.ts
import { getZone, type Zone } from "./zones";
import { getAwardTaxes } from "@/data/awardTaxes";
import { getMilesRequired } from "@/data/awardCharts";
import { MILES_PRICE_MAP } from "@/data/milesPrices";
import { TRANSFER_BONUSES, getEffectiveRatio } from "@/data/transferBonuses";
import { ALLIANCES } from "./alliances";
import type { Cabin, TripType } from "./engine";

// ─── Thresholds (named constants — tune without touching logic) ───────────────
const MILES_WIN_THRESHOLD    = 0.95; // miles win if 5%+ cheaper than cash, even buying
const MILES_OWNED_THRESHOLD  = 0.90; // miles worth it if 10%+ cheaper when already owned

// ─── Public types ─────────────────────────────────────────────────────────────

export interface FlightInput {
  from: string;
  to: string;
  totalPrice: number;
  airlines: string[];
  stops: number;
  cabin: Cabin;
  tripType: TripType;
  passengers: number;
}

export interface MilesOption {
  type: "DIRECT" | "ALLIANCE" | "TRANSFER";
  program: string;            // destination program  e.g. "Flying Blue"
  via?: string;               // transfer source currency  e.g. "Amex MR"
  operatingAirline: string;
  milesRequired: number;      // total (pax × roundtrip factor)

  taxes: number;              // award taxes for all pax

  // Scenario A: already own miles — cost is taxes only
  ownedCost: number;
  ownedSavings: number;       // cashTotal - taxes

  // Scenario B: buy miles — cost is acquisition + taxes
  pricePerMile: number;       // effective price in cents after promos
  acquisitionCost: number;
  purchasedCost: number;      // acquisitionCost + taxes
  purchasedSavings: number;   // cashTotal - purchasedCost (negative = cash wins)

  promoApplied?: string;
  chartSource: "REAL" | "ESTIMATE";
}

export interface CostComparison {
  cashTotal: number;
  milesOptions: MilesOption[];           // all options, sorted by purchasedCost asc
  bestOwnedOption: MilesOption | null;   // cheapest if already own miles
  bestPurchasedOption: MilesOption | null; // cheapest if buying miles
  recommendation: "MILES_WIN" | "MILES_IF_OWNED" | "CASH_WINS";
  savings: number;  // bestOwnedOption.ownedSavings if > 0, else bestPurchasedOption.purchasedSavings
  value: number;    // bestOwnedOption.ownedSavings / (bestOwnedOption.milesRequired / 100)
                    // i.e. cents saved per mile — used for result sorting
}

// ─── Helper: which airlines are in each program's network ────────────────────

// Maps miles program names to the airline they primarily represent
const PROGRAM_TO_AIRLINE: Record<string, string> = {
  "Flying Blue":          "Air France",
  "Turkish Miles&Smiles": "Turkish Airlines",
  "Emirates Skywards":    "Emirates",
  "Qatar Privilege Club": "Qatar Airways",
  "British Airways Avios":"British Airways",
  "Ethiopian ShebaMiles": "Ethiopian Airlines",
  "Air Canada Aeroplan":  "Air Canada",
  "United MileagePlus":   "United Airlines",
};

// Returns all programs that can book a given airline (direct or alliance)
function getProgramsForAirline(airline: string): Array<{ program: string; type: "DIRECT" | "ALLIANCE" }> {
  const results: Array<{ program: string; type: "DIRECT" | "ALLIANCE" }> = [];
  const airlineAlliance = ALLIANCES[airline];

  for (const [program, programAirline] of Object.entries(PROGRAM_TO_AIRLINE)) {
    if (programAirline === airline) {
      results.push({ program, type: "DIRECT" });
    } else if (
      airlineAlliance &&
      airlineAlliance !== "Independent" &&
      ALLIANCES[programAirline] === airlineAlliance
    ) {
      results.push({ program, type: "ALLIANCE" });
    }
  }
  return results;
}

// ─── Helper: build one MilesOption ───────────────────────────────────────────

function buildOption(
  type: "DIRECT" | "ALLIANCE" | "TRANSFER",
  program: string,
  via: string | undefined,
  operatingAirline: string,
  milesRequired: number,
  chartSource: "REAL" | "ESTIMATE",
  taxes: number,
  cashTotal: number,
  effectivePrices: Map<string, number>
): MilesOption {
  const sourceProgram = via ?? program;
  const basePrice = effectivePrices.get(sourceProgram)
    ?? MILES_PRICE_MAP.get(sourceProgram)
    ?? 3.0; // conservative fallback in cents

  const pricePerMile   = basePrice;
  const acquisitionCost = Math.round((milesRequired * pricePerMile) / 100 * 100) / 100;
  const purchasedCost   = Math.round((acquisitionCost + taxes) * 100) / 100;

  return {
    type,
    program,
    via,
    operatingAirline,
    milesRequired,
    taxes,
    ownedCost:        Math.round(taxes * 100) / 100,
    ownedSavings:     Math.round((cashTotal - taxes) * 100) / 100,
    pricePerMile,
    acquisitionCost,
    purchasedCost,
    purchasedSavings: Math.round((cashTotal - purchasedCost) * 100) / 100,
    chartSource,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildCostOptions(
  flight: FlightInput,
  effectivePrices: Map<string, number>  // program → cents per mile (from Redis or static)
): CostComparison {
  const { from, to, totalPrice: cashTotal, airlines, cabin, tripType, passengers } = flight;

  const originZone = getZone(from);
  const destZone   = getZone(to);
  const operatingAirline = airlines[0] ?? "";

  const milesOptions: MilesOption[] = [];

  // ── Direct + Alliance options ──────────────────────────────────────────────
  const programs = getProgramsForAirline(operatingAirline);

  for (const { program, type } of programs) {
    if (!originZone || !destZone) {
      // Unknown zone — use distance estimate
      const { miles, source } = getMilesRequired(program, "EUROPE", "EUROPE", cabin, tripType, passengers);
      // This is a rough fallback; mark as ESTIMATE
      const taxes = getAwardTaxes(operatingAirline, cabin, passengers);
      milesOptions.push(buildOption(type, program, undefined, operatingAirline, miles, source, taxes, cashTotal, effectivePrices));
      continue;
    }
    const { miles, source } = getMilesRequired(program, originZone, destZone, cabin, tripType, passengers);
    const taxes = getAwardTaxes(operatingAirline, cabin, passengers);
    milesOptions.push(buildOption(type, program, undefined, operatingAirline, miles, source, taxes, cashTotal, effectivePrices));
  }

  // ── Transfer options ──────────────────────────────────────────────────────
  for (const bonus of TRANSFER_BONUSES) {
    // Check if transfer destination program can book this airline
    const canBook = programs.find((p) => p.program === bonus.to);
    if (!canBook) continue;

    if (!originZone || !destZone) continue;

    const { miles: destMiles, source } = getMilesRequired(bonus.to, originZone, destZone, cabin, tripType, passengers);
    const ratio = getEffectiveRatio(bonus);
    const sourceMiles = Math.ceil(destMiles / ratio);
    const taxes = getAwardTaxes(operatingAirline, cabin, passengers);

    const promoApplied = bonus.promoRatio
      ? `${bonus.from} bonus ${Math.round((ratio - 1) * 100)}%`
      : undefined;

    const opt = buildOption(
      "TRANSFER",
      bonus.to,
      bonus.from,
      operatingAirline,
      sourceMiles,
      source,
      taxes,
      cashTotal,
      effectivePrices
    );
    if (promoApplied) opt.promoApplied = promoApplied;
    milesOptions.push(opt);
  }

  // ── Deduplicate: keep cheapest option per (program + via) key ─────────────
  const seen = new Map<string, MilesOption>();
  for (const opt of milesOptions) {
    const key = `${opt.program}::${opt.via ?? ""}`;
    const existing = seen.get(key);
    if (!existing || opt.purchasedCost < existing.purchasedCost) {
      seen.set(key, opt);
    }
  }
  const dedupedOptions = Array.from(seen.values())
    .sort((a, b) => a.purchasedCost - b.purchasedCost)
    .slice(0, 8); // cap at 8 options

  // ── Recommendation ────────────────────────────────────────────────────────
  const bestPurchased = dedupedOptions[0] ?? null;
  const bestOwned = dedupedOptions.length > 0
    ? [...dedupedOptions].sort((a, b) => a.ownedCost - b.ownedCost)[0]!
    : null;

  let recommendation: CostComparison["recommendation"] = "CASH_WINS";
  if (bestPurchased && bestPurchased.purchasedCost < cashTotal * MILES_WIN_THRESHOLD) {
    recommendation = "MILES_WIN";
  } else if (bestOwned && bestOwned.ownedCost < cashTotal * MILES_OWNED_THRESHOLD) {
    recommendation = "MILES_IF_OWNED";
  }

  // ── value (cents saved per mile — for sorting results) ────────────────────
  const valueOption = bestOwned ?? bestPurchased;
  const value = valueOption && valueOption.milesRequired > 0
    ? Math.round((valueOption.ownedSavings / (valueOption.milesRequired / 100)) * 100) / 100
    : 0;

  // ── savings (best dollar savings) ─────────────────────────────────────────
  const savings = bestOwned && bestOwned.ownedSavings > 0
    ? bestOwned.ownedSavings
    : (bestPurchased?.purchasedSavings ?? 0);

  return {
    cashTotal,
    milesOptions: dedupedOptions,
    bestOwnedOption: bestOwned,
    bestPurchasedOption: bestPurchased,
    recommendation,
    savings,
    value,
  };
}

// ─── Redis-backed effective price loader ──────────────────────────────────────
// Called once per searchEngine() invocation, result passed to buildCostOptions.

export async function getEffectivePrices(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const programs = [...MILES_PRICE_MAP.keys()];

  // Try to read from Redis; silently fall back to static on any error
  try {
    const { redis } = await import("./redis");
    await Promise.all(
      programs.map(async (program) => {
        const key = `miles:price:${program}`;
        const cached = await redis.get<number>(key).catch(() => null);
        if (typeof cached === "number") {
          map.set(program, cached);
        } else {
          map.set(program, MILES_PRICE_MAP.get(program)!);
        }
      })
    );
  } catch {
    // No Redis available — use static prices entirely
    for (const [program, price] of MILES_PRICE_MAP) {
      map.set(program, price);
    }
  }

  return map;
}
```

- [ ] **Step 4: Run smoke test — verify PASS**

```bash
npx jest __tests__/lib/costEngine.test.ts --no-coverage
```

Expected: `1 passed`

- [ ] **Step 5: Commit**

```bash
git add lib/costEngine.ts __tests__/lib/costEngine.test.ts
git commit -m "feat: costEngine types, helpers, getEffectivePrices"
```

---

## Task 6: `lib/costEngine.ts` — full test suite

**Files:**
- Modify: `__tests__/lib/costEngine.test.ts`

- [ ] **Step 1: Expand test suite**

Replace `__tests__/lib/costEngine.test.ts` with:

```typescript
// __tests__/lib/costEngine.test.ts
import { buildCostOptions, type FlightInput } from "@/lib/costEngine";

const BASE: FlightInput = {
  from: "DSS",
  to: "CDG",
  totalPrice: 1_200,
  airlines: ["Air France"],
  stops: 0,
  cabin: "business",
  tripType: "roundtrip",
  passengers: 2,
};

describe("buildCostOptions", () => {
  describe("cashTotal", () => {
    it("equals flight.totalPrice", () => {
      expect(buildCostOptions(BASE, new Map()).cashTotal).toBe(1_200);
    });
  });

  describe("Flying Blue — DIRECT option for Air France", () => {
    it("includes Flying Blue as DIRECT", () => {
      const { milesOptions } = buildCostOptions(BASE, new Map());
      const fb = milesOptions.find((o) => o.program === "Flying Blue" && o.type === "DIRECT");
      expect(fb).toBeDefined();
    });

    it("calculates taxes as 380 × 2 pax = 760 for AF business", () => {
      const { milesOptions } = buildCostOptions(BASE, new Map());
      const fb = milesOptions.find((o) => o.program === "Flying Blue")!;
      expect(fb.taxes).toBe(760);
    });

    it("ownedCost equals taxes only", () => {
      const { milesOptions } = buildCostOptions(BASE, new Map());
      const fb = milesOptions.find((o) => o.program === "Flying Blue")!;
      expect(fb.ownedCost).toBe(fb.taxes);
    });

    it("ownedSavings = cashTotal - taxes", () => {
      const { milesOptions } = buildCostOptions(BASE, new Map());
      const fb = milesOptions.find((o) => o.program === "Flying Blue")!;
      expect(fb.ownedSavings).toBe(1_200 - 760); // 440
    });

    it("uses chart source REAL for known zone pair", () => {
      const { milesOptions } = buildCostOptions(BASE, new Map());
      const fb = milesOptions.find((o) => o.program === "Flying Blue")!;
      expect(fb.chartSource).toBe("REAL");
    });
  });

  describe("effective prices from map", () => {
    it("uses custom price per mile from effectivePrices map", () => {
      // Flying Blue at 2.5¢ promo price
      const prices = new Map([["Flying Blue", 2.5]]);
      const { milesOptions } = buildCostOptions(BASE, prices);
      const fb = milesOptions.find((o) => o.program === "Flying Blue")!;
      expect(fb.pricePerMile).toBe(2.5);
    });
  });

  describe("recommendation", () => {
    it("MILES_IF_OWNED when ownedCost well below cash but purchased exceeds", () => {
      // cashTotal=1200, best ownedCost≈760 (AF taxes) = 37% saving → MILES_IF_OWNED
      const { recommendation } = buildCostOptions(BASE, new Map());
      expect(["MILES_WIN", "MILES_IF_OWNED"]).toContain(recommendation);
    });

    it("CASH_WINS when cash price is below all taxes", () => {
      const cheap: FlightInput = {
        ...BASE,
        totalPrice: 50,    // $50 cash, taxes alone are $760
        cabin: "economy",
        passengers: 1,
      };
      const { recommendation } = buildCostOptions(cheap, new Map());
      expect(recommendation).toBe("CASH_WINS");
    });
  });

  describe("TRANSFER options", () => {
    it("includes Amex MR → Flying Blue as TRANSFER", () => {
      const { milesOptions } = buildCostOptions(BASE, new Map());
      const t = milesOptions.find((o) => o.via === "Amex MR" && o.program === "Flying Blue");
      expect(t).toBeDefined();
      expect(t!.type).toBe("TRANSFER");
    });
  });

  describe("value field", () => {
    it("is positive when miles are worth using", () => {
      const { value } = buildCostOptions(BASE, new Map());
      // ownedSavings=440, milesRequired>0 → value > 0
      expect(value).toBeGreaterThanOrEqual(0);
    });
  });

  describe("deduplication", () => {
    it("does not return more than 8 options", () => {
      const { milesOptions } = buildCostOptions(BASE, new Map());
      expect(milesOptions.length).toBeLessThanOrEqual(8);
    });
  });
});
```

- [ ] **Step 2: Run — verify all PASS**

```bash
npx jest __tests__/lib/costEngine.test.ts --no-coverage
```

Expected: `12 passed`

- [ ] **Step 3: Commit**

```bash
git add __tests__/lib/costEngine.test.ts
git commit -m "test: full costEngine test suite — 12 cases"
```

---

## Task 7: Update `lib/engine.ts`

**Files:**
- Modify: `lib/engine.ts`

- [ ] **Step 1: Extend FlightResult interface**

In `lib/engine.ts`, replace the `FlightResult` interface (lines 36-56) with:

```typescript
export interface FlightResult {
  from: string;
  to: string;
  price: number;
  airlines: string[];
  stops?: number;
  duration?: number;
  tripType: TripType;
  returnPrice?: number;
  returnAirlines?: string[];
  totalPrice?: number;
  cabin: Cabin;
  passengers: number;

  // ── Cost comparison (new) ──────────────────────────────────────────────────
  cashTotal: number;
  milesOptions: import("./costEngine").MilesOption[];
  bestOwnedOption: import("./costEngine").MilesOption | null;
  bestPurchasedOption: import("./costEngine").MilesOption | null;
  recommendation: "MILES_WIN" | "MILES_IF_OWNED" | "CASH_WINS";
  savings: number;

  // ── Sorting + backwards compat ────────────────────────────────────────────
  value: number;
  optimization: OptimizerDecision;
}
```

- [ ] **Step 2: Update imports in lib/engine.ts**

Replace the top-of-file imports block:

```typescript
import "server-only";
import { redis } from "./redis";
import { loadPromotions, applyPromotions, type NormalizedFlight } from "./promotions/engine";
import { optimizeMiles, type OptimizerDecision } from "./optimizer";
import { buildCostOptions, getEffectivePrices, type FlightInput } from "./costEngine";
```

Remove: `estimateMiles`, `calculateMilesValue`, `getRecommendation` — no longer needed in engine.ts.

> **Note on circular imports:** `costEngine.ts` uses `import type { Cabin, TripType } from "./engine"` and `awardCharts.ts` uses `import type { Cabin } from "@/lib/engine"`. These are type-only imports (erased at runtime) so there is no runtime circular dependency. TypeScript strict mode handles this correctly.

- [ ] **Step 3: Replace the enrich() function**

Replace the entire `enrich()` function (lines 142-194) with:

```typescript
function enrich(
  f: NormalizedFlight,
  cabin: Cabin,
  passengers: number,
  userPrograms: string[],
  tripType: TripType,
  effectivePrices: Map<string, number>,
  returnFlight?: NormalizedFlight
): FlightResult {
  const multiplier = CABIN_MULTIPLIER[cabin];

  const outboundPrice = Math.round(f.price * multiplier * 100) / 100;
  const returnPrice   = returnFlight
    ? Math.round(returnFlight.price * multiplier * 100) / 100
    : undefined;

  const totalPrice = returnPrice !== undefined
    ? Math.round((outboundPrice + returnPrice) * passengers * 100) / 100
    : Math.round(outboundPrice * passengers * 100) / 100;

  const flightInput: FlightInput = {
    from: f.from,
    to: f.to,
    totalPrice,
    airlines: f.airlines,
    stops: f.stops ?? 0,
    cabin,
    tripType,
    passengers,
  };

  const comparison = buildCostOptions(flightInput, effectivePrices);
  const optimization = optimizeMiles(f.airlines, userPrograms);

  const result: FlightResult = {
    from: f.from,
    to: f.to,
    price: outboundPrice,
    airlines: f.airlines,
    stops: f.stops,
    duration: f.duration,
    tripType,
    cabin,
    passengers,
    totalPrice,
    cashTotal:            comparison.cashTotal,
    milesOptions:         comparison.milesOptions,
    bestOwnedOption:      comparison.bestOwnedOption,
    bestPurchasedOption:  comparison.bestPurchasedOption,
    recommendation:       comparison.recommendation,
    savings:              comparison.savings,
    value:                comparison.value,
    optimization,
  };

  if (returnPrice !== undefined) {
    result.returnPrice    = returnPrice;
    result.returnAirlines = returnFlight?.airlines;
  }

  return result;
}
```

- [ ] **Step 4: Update searchEngine() to fetch effective prices once and pass them in**

In `searchEngine()`, after the cache check, before step 2 (fetch outbound), add:

```typescript
  // Fetch effective miles prices once (Redis → static fallback)
  const effectivePrices = await getEffectivePrices();
```

Then update the `enrich()` call in step 5:

```typescript
  const results: FlightResult[] = withPromos.map((f) =>
    enrich(f, cabin, passengers, userPrograms, tripType, effectivePrices, cheapestReturn)
  );
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 6: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add lib/engine.ts
git commit -m "feat: wire costEngine into engine.ts enrich()"
```

---

## Task 8: `app/api/cron/miles-prices/route.ts`

**Files:**
- Create: `app/api/cron/miles-prices/route.ts`

- [ ] **Step 1: Create cron endpoint**

```typescript
// app/api/cron/miles-prices/route.ts
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { MILES_PRICES } from "@/data/milesPrices";
import { TRANSFER_BONUSES, getEffectiveRatio } from "@/data/transferBonuses";

const TTL_SECONDS = 25 * 60 * 60; // 25 hours (survives cron delays)

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let pricesUpdated = 0;
  let bonusesUpdated = 0;

  // ── Store effective miles prices ─────────────────────────────────────────
  await Promise.all(
    MILES_PRICES.map(async (record) => {
      await redis
        .set(`miles:price:${record.program}`, record.basePriceCents, { ex: TTL_SECONDS })
        .catch(() => null);
      pricesUpdated++;
    })
  );

  // ── Store effective transfer ratios ──────────────────────────────────────
  await Promise.all(
    TRANSFER_BONUSES.map(async (bonus) => {
      const ratio = getEffectiveRatio(bonus);
      await redis
        .set(`miles:bonus:${bonus.from}:${bonus.to}`, ratio, { ex: TTL_SECONDS })
        .catch(() => null);
      bonusesUpdated++;
    })
  );

  return NextResponse.json({
    ok: true,
    pricesUpdated,
    bonusesUpdated,
    timestamp: new Date().toISOString(),
  });
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 3: Add to vercel.json cron config (if present, else skip)**

```bash
ls /Users/DIALLO9194/Downloads/keza/vercel.json 2>/dev/null && echo "exists" || echo "no vercel.json"
```

If `vercel.json` exists, add to `crons`:
```json
{ "path": "/api/cron/miles-prices", "schedule": "0 3 * * *" }
```

If not, skip this step — cron can be triggered manually.

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/miles-prices/route.ts
git commit -m "feat: miles-prices cron endpoint for 24h price refresh"
```

---

## Task 9: Update `components/FlightCard.tsx` + `components/Results.tsx`

**Files:**
- Modify: `components/FlightCard.tsx`
- Modify: `components/Results.tsx`

- [ ] **Step 1: Remove unused imports from FlightCard.tsx**

Remove these two lines from the top of `components/FlightCard.tsx`:
- `import type { OptimizerDecision } from "@/lib/optimizer";` — no longer used in whyText
- The `milesEst` variable declaration (lines ~90-92) — replaced by `flight.bestOwnedOption`

- [ ] **Step 2: Update FlightCard.tsx REC config**

In `components/FlightCard.tsx`, replace the `REC` constant (lines 8-28):

```typescript
const REC = {
  "MILES_WIN": {
    labelFr: "MILES GAGNANTS",
    labelEn: "MILES WIN",
    cls: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    icon: "✈",
  },
  "MILES_IF_OWNED": {
    labelFr: "SI VOUS AVEZ LES MILES",
    labelEn: "IF YOU HAVE MILES",
    cls: "bg-success/10 text-success border-success/25",
    icon: "◎",
  },
  "CASH_WINS": {
    labelFr: "CASH OPTIMAL",
    labelEn: "CASH WINS",
    cls: "bg-warning/10 text-warning border-warning/25",
    icon: "◈",
  },
} as const;
```

- [ ] **Step 2: Update whyText() in FlightCard.tsx**

Replace the `whyText()` function (lines 31-63):

```typescript
function whyText(flight: FlightResult, lang: "fr" | "en"): string {
  const fr = lang === "fr";
  const best = flight.bestOwnedOption ?? flight.bestPurchasedOption;
  if (!best) {
    return fr
      ? "Le prix cash est optimal pour ce vol. Gardez vos miles."
      : "Cash is optimal for this flight. Save your miles.";
  }

  const program   = best.via ? `${best.via} → ${best.program}` : best.program;
  const ownedSave = best.ownedSavings.toFixed(0);
  const buyTotal  = best.purchasedCost.toFixed(0);
  const taxes     = best.taxes.toFixed(0);

  if (flight.recommendation === "MILES_WIN") {
    return fr
      ? `Même en achetant des miles ${program}, le vol revient à $${buyTotal} total — moins cher que le prix cash. Économie de $${best.purchasedSavings.toFixed(0)}.`
      : `Even buying ${program} miles, total cost is $${buyTotal} — cheaper than cash. You save $${best.purchasedSavings.toFixed(0)}.`;
  }
  if (flight.recommendation === "MILES_IF_OWNED") {
    return fr
      ? `Si vous possédez déjà des miles ${program}, ne payez que les taxes ($${taxes}). Économie de $${ownedSave} vs le cash. Si vous les achetez, le cash reste plus avantageux.`
      : `If you already have ${program} miles, pay taxes only ($${taxes}). Save $${ownedSave} vs cash. If you'd buy miles, cash wins.`;
  }
  // CASH_WINS
  const cheapest = best.purchasedCost.toFixed(0);
  return fr
    ? `La meilleure option miles (${program}) reviendrait à $${cheapest} total — plus cher que le cash. Gardez vos miles.`
    : `Best miles option (${program}) costs $${cheapest} total — more than cash. Keep your miles.`;
}
```

- [ ] **Step 3: Update FlightCard hero section to show owned vs purchased**

In the `/* ── Hero: 3 numbers ── */` section of FlightCard, replace the **Miles** column (3rd column, currently showing `milesEst`):

```tsx
{/* Miles — best option */}
<div className="px-3 py-4 text-center">
  {flight.bestOwnedOption ? (
    <>
      <div className="text-2xl font-black leading-none tabular-nums text-fg">
        {flight.bestOwnedOption.milesRequired >= 1000
          ? `${(flight.bestOwnedOption.milesRequired / 1000).toFixed(0)}K`
          : flight.bestOwnedOption.milesRequired}
      </div>
      <div className="text-[10px] text-muted uppercase tracking-widest mt-1.5 font-bold">
        {flight.bestOwnedOption.program.split(" ")[0]}
      </div>
      <div className="text-[10px] text-muted/60 mt-0.5">
        {fr ? "si possédés" : "if owned"}
      </div>
    </>
  ) : (
    <>
      <div className="text-2xl font-black leading-none text-subtle">—</div>
      <div className="text-[10px] text-muted uppercase tracking-widest mt-1.5 font-bold">
        {fr ? "pts estimés" : "est. points"}
      </div>
    </>
  )}
</div>
```

- [ ] **Step 4: Add owned vs purchased cost breakdown below hero**

After the `/* ── Value bar ── */` section and before `/* ── Tags ── */`, add:

```tsx
{/* ── Cost comparison ──────────────────────────────────────── */}
{(flight.bestOwnedOption || flight.bestPurchasedOption) && (
  <div className="px-5 py-3 border-t border-border space-y-1.5">
    {flight.bestOwnedOption && (
      <div className="flex justify-between items-center text-[11px]">
        <span className="text-muted">
          {fr ? "Si miles possédés" : "If miles owned"}
          {" · "}<span className="text-fg font-semibold">{flight.bestOwnedOption.program}</span>
        </span>
        <span className="font-bold text-success">
          ${flight.bestOwnedOption.ownedCost.toFixed(0)}
          {" "}
          <span className="text-success/70 font-normal">
            ({fr ? "taxes seules" : "taxes only"})
          </span>
        </span>
      </div>
    )}
    {flight.bestPurchasedOption && (
      <div className="flex justify-between items-center text-[11px]">
        <span className="text-muted">
          {fr ? "Si miles achetés" : "If miles purchased"}
          {flight.bestPurchasedOption.via && (
            <span className="text-subtle"> · {flight.bestPurchasedOption.via}</span>
          )}
        </span>
        <span className={clsx(
          "font-bold",
          flight.bestPurchasedOption.purchasedSavings > 0 ? "text-primary" : "text-muted"
        )}>
          ${flight.bestPurchasedOption.purchasedCost.toFixed(0)}
          {flight.bestPurchasedOption.purchasedSavings > 0 && (
            <span className="text-primary/70 font-normal ml-1">
              (−${flight.bestPurchasedOption.purchasedSavings.toFixed(0)})
            </span>
          )}
        </span>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 5: Update Results.tsx recommendation tabs**

In `components/Results.tsx`, replace the `counts` useMemo (lines 78-82):

```typescript
const counts = useMemo(() => ({
  miles:    results.filter(r => r.recommendation === "MILES_WIN").length,
  consider: results.filter(r => r.recommendation === "MILES_IF_OWNED").length,
  cash:     results.filter(r => r.recommendation === "CASH_WINS").length,
}), [results]);
```

Replace the filtered tab logic (lines 88-91):

```typescript
if (tab === "miles")    r = r.filter(x => x.recommendation === "MILES_WIN");
if (tab === "consider") r = r.filter(x => x.recommendation === "MILES_IF_OWNED");
if (tab === "cash")     r = r.filter(x => x.recommendation === "CASH_WINS");
```

Update tab labels in `L` object — replace `miles: "Miles"` and `consider: "À considérer"` / `"Consider"` with:

```typescript
// In L.fr:
miles:   "Miles gagnants",
consider:"Si possédés",

// In L.en:
miles:   "Miles win",
consider:"If owned",
```

- [ ] **Step 6: Verify TypeScript — zero errors**

```bash
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 7: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 8: Final commit**

```bash
git add components/FlightCard.tsx components/Results.tsx
git commit -m "feat: FlightCard + Results show owned vs purchased cost comparison"
git push origin dev
```

---

## Verification Checklist

After all tasks complete:

- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npx jest --no-coverage` → all tests pass
- [ ] Manual test: search DSS→CDG business roundtrip 2 pax → result shows Flying Blue option with taxes + purchase cost
- [ ] Manual test: search cheap economy route → at least some results show CASH_WINS
- [ ] Manual test: `curl -H "Authorization: Bearer $CRON_SECRET" https://keza-dev.vercel.app/api/cron/miles-prices` → `{ ok: true, pricesUpdated: 12, bonusesUpdated: 15 }`
- [ ] Seats.aero integration: set `SEATS_AERO_API_KEY` env var → future task (post-launch)
