# KEZA — Cost Engine V2 Design Spec

**Date:** 2026-04-14  
**Branch:** dev  
**Status:** Approved for implementation

---

## Problem Statement

The current engine computes an abstract `valuePerMile` ratio and recommends based on a threshold (>2¢ = USE MILES). It does not answer the real question:

> **"For this flight, is it cheaper to pay cash — or to use/buy miles?"**

The new engine computes the **actual total dollar cost** of every possible option (cash, direct miles, alliance miles, transfer chain) and ranks them. The user sees concrete savings in dollars, not an abstract ratio.

---

## Goal

For every flight result, KEZA tells the user:

1. What the flight costs in cash
2. What it would cost using miles — across every program, alliance, and transfer path
3. Whether savings exist if miles are already owned (taxes only)
4. Whether savings exist even if miles need to be purchased (acquisition + taxes)
5. The best option overall

---

## Architecture Overview

```
Travelpayouts API
       ↓
lib/engine.ts          (orchestrator — unchanged structure)
       ↓
applyPromos()          (existing — flight price discounts)
       ↓
enrichWithCostEngine() (NEW — replaces enrichWithMiles())
       ↓
lib/costEngine.ts      (NEW — full cost comparison)
    ├── lib/zones.ts               (NEW — airport → geographic zone)
    ├── data/awardCharts.ts        (NEW — miles required per program/zone/cabin)
    ├── data/awardTaxes.ts         (NEW — award taxes per operating airline)
    ├── data/milesPrices.ts        (NEW — base purchase price per program)
    └── data/transferBonuses.ts   (NEW — transfer ratios + active bonuses)
       ↓
Redis cache            (effective prices: miles:price:{program}, miles:bonus:{from}:{to})
       ↓
FlightResult[]         (extended with milesOptions, recommendation, cashTotal)
```

---

## Data Layer

### `lib/zones.ts` — Geographic Zones

Airports mapped to 8 zones:

| Zone | Key airports |
|---|---|
| `AFRICA_WEST` | DSS, DKR, ABJ, ACC, LOS, CMN, OUA, CKY, BKO, TUN, ALG |
| `AFRICA_EAST` | NBO, ADD, DAR, EBB, KGL, MGQ |
| `AFRICA_SOUTH` | JNB, CPT, LUN, HRE, WDH |
| `EUROPE` | CDG, LHR, AMS, FRA, MAD, LIS, FCO, BCN, IST, ZRH, BRU |
| `NORTH_AMERICA` | JFK, LAX, MIA, ORD, SFO, BOS, YYZ, YUL |
| `MIDDLE_EAST` | DXB, DOH, CAI, AMM, RUH, AUH, BEY |
| `ASIA` | SIN, HKG, NRT, ICN, BKK, KUL, PVG, DEL |
| `SOUTH_AMERICA` | GRU, EZE, BOG, LIM, SCL, GIG |

Function: `getZone(airportCode: string): Zone | null`

### `data/awardCharts.ts` — Award Charts

Real zone-based charts for 8 programs. Fallback to `distance × 10` for uncovered programs.

**Programs with real charts:**
- Flying Blue (Air France/KLM)
- Turkish Miles&Smiles
- Emirates Skywards
- Qatar Privilege Club
- British Airways Avios (distance-based natively)
- Ethiopian ShebaMiles
- Air Canada Aeroplan
- United MileagePlus

**Structure:**
```typescript
type AwardChart = Record<Zone, Record<Zone, Record<Cabin, number>>>

AWARD_CHARTS: Record<string, AwardChart> = {
  "Flying Blue": {
    AFRICA_WEST: {
      EUROPE:        { economy: 25_000, premium: 35_000, business: 70_000 },
      NORTH_AMERICA: { economy: 40_000, premium: 60_000, business: 100_000 },
      MIDDLE_EAST:   { economy: 20_000, premium: 30_000, business: 55_000 },
      // ...
    }
  },
  "Turkish Miles&Smiles": {
    AFRICA_WEST: {
      EUROPE:        { economy: 12_500, premium: 20_000, business: 45_000 },
      NORTH_AMERICA: { economy: 30_000, premium: 45_000, business: 75_000 },
      // ...
    }
  },
  // ...
}
```

**Roundtrip rule:** `miles = one_way_miles × 2` for all programs.  
Exception field `roundtripDiscount?: number` for programs with R/T pricing (Flying Blue occasional specials).

**Fallback:** if program not in charts → `estimateMiles(distance)` from existing `milesEngine.ts`, `chartSource = "ESTIMATE"`.

### `data/awardTaxes.ts` — Award Taxes per Airline

Taxes and fuel surcharges on award tickets vary dramatically by airline. These are approximate but representative figures in USD.

```typescript
interface AwardTaxRecord {
  economy: number
  business: number
  note: string  // ex: "Air France imposes fuel surcharges"
}

AWARD_TAXES: Record<string, AwardTaxRecord> = {
  "Air France":         { economy: 180, business: 380, note: "High fuel surcharges" },
  "KLM":                { economy: 160, business: 350, note: "High fuel surcharges" },
  "Turkish Airlines":   { economy:  80, business: 150, note: "Moderate surcharges" },
  "Emirates":           { economy:  50, business:  90, note: "Low surcharges" },
  "Qatar Airways":      { economy:  60, business: 110, note: "Low surcharges" },
  "Ethiopian Airlines": { economy:  40, business:  80, note: "Low surcharges" },
  "Kenya Airways":      { economy:  40, business:  80, note: "Low surcharges" },
  "Air Senegal":        { economy:  30, business:  60, note: "Minimal surcharges" },
  "Royal Air Maroc":    { economy:  50, business: 100, note: "Moderate" },
  // default fallback
  "_default":           { economy: 100, business: 200, note: "Estimated" },
}
```

Per passenger multiplier applied at runtime.

### `data/milesPrices.ts` — Miles Purchase Prices

Base prices for buying miles directly from each program. Updated manually when programs change pricing; promos applied on top via Redis.

```typescript
interface MilesPriceRecord {
  program: string
  basePriceCents: number    // ex: 3.5 = 3.5¢ per mile
  minPurchase: number       // minimum purchasable miles
  maxPurchasePerYear: number
  currency: "USD"
  lastUpdated: string       // ISO date — flag if stale > 90 days
}

MILES_PRICES: MilesPriceRecord[] = [
  { program: "Flying Blue",        basePriceCents: 3.5,  minPurchase: 2_000,  maxPurchasePerYear: 100_000 },
  { program: "Turkish Miles&Smiles", basePriceCents: 1.8, minPurchase: 1_000, maxPurchasePerYear: 150_000 },
  { program: "Emirates Skywards",  basePriceCents: 3.5,  minPurchase: 1_000,  maxPurchasePerYear: 200_000 },
  { program: "Qatar Privilege Club", basePriceCents: 3.0, minPurchase: 1_000, maxPurchasePerYear: 150_000 },
  { program: "British Airways Avios", basePriceCents: 2.5, minPurchase: 1_000, maxPurchasePerYear: 100_000 },
  { program: "Amex MR",            basePriceCents: 2.0,  minPurchase: 1_000,  maxPurchasePerYear: 250_000 },
  { program: "Chase UR",           basePriceCents: 1.5,  minPurchase: 1_000,  maxPurchasePerYear: 250_000 },
  { program: "Citi ThankYou",      basePriceCents: 1.7,  minPurchase: 1_000,  maxPurchasePerYear: 200_000 },
  { program: "Capital One Miles",  basePriceCents: 1.8,  minPurchase: 1_000,  maxPurchasePerYear: 200_000 },
]
```

### `data/transferBonuses.ts` — Transfer Ratios & Active Bonuses

Transfer partnerships with current effective ratios. Base ratios are static; bonuses are updated when promotions run.

```typescript
interface TransferBonusRecord {
  from: string         // source currency  ex: "Amex MR"
  to: string           // destination program  ex: "Flying Blue"
  baseRatio: number    // 1.0 = 1:1, 1.25 = 25% bonus
  promoRatio?: number  // current promo if active
  promoValidUntil?: string
  transferTime: string // ex: "instant" | "1-2 days"
}

TRANSFER_BONUSES: TransferBonusRecord[] = [
  { from: "Amex MR",       to: "Flying Blue",          baseRatio: 1.0, transferTime: "instant" },
  { from: "Amex MR",       to: "Emirates Skywards",    baseRatio: 1.0, transferTime: "instant" },
  { from: "Amex MR",       to: "Air Canada Aeroplan",  baseRatio: 1.0, transferTime: "instant" },
  { from: "Chase UR",      to: "United MileagePlus",   baseRatio: 1.0, transferTime: "instant" },
  { from: "Chase UR",      to: "Air Canada Aeroplan",  baseRatio: 1.0, transferTime: "instant" },
  { from: "Citi TY",       to: "Turkish Miles&Smiles", baseRatio: 1.0, transferTime: "1-2 days" },
  { from: "Capital One",   to: "Flying Blue",          baseRatio: 1.0, transferTime: "instant" },
  { from: "Capital One",   to: "Turkish Miles&Smiles", baseRatio: 1.0, transferTime: "instant" },
]
```

Effective ratio = `promoRatio ?? baseRatio`. A promoRatio of 1.3 means 1,000 points → 1,300 miles.

---

## Cost Engine — `lib/costEngine.ts`

### Core function

```typescript
function buildCostOptions(
  flight: RawFlight,
  effectivePrices: Map<string, number>  // from Redis
): CostComparison
```

### Algorithm

```
1. cashTotal = flight.totalPrice (already includes cabin × promo × passengers)

2. originZone = getZone(flight.from)
   destZone   = getZone(flight.to)

3. For each program in ALL_PROGRAMS:

   a) Check if operable (DIRECT, ALLIANCE, or skip)
      - DIRECT:   program's airline operates the flight
      - ALLIANCE: program's airline is in same alliance as operating airline

   b) milesRequired = getMilesRequired(program, originZone, destZone, cabin)
                      × passengers
                      × (2 if roundtrip)

   c) taxes = getAwardTaxes(operatingAirline, cabin) × passengers

   d) Scénario A — owned:
      ownedCost    = taxes
      ownedSavings = cashTotal - taxes

   e) Scénario B — purchased:
      pricePerMile    = effectivePrices.get(program) ?? MILES_PRICES[program].basePriceCents / 100
      acquisitionCost = milesRequired × pricePerMile
      purchasedCost   = acquisitionCost + taxes
      purchasedSavings = cashTotal - purchasedCost

   f) Push MilesOption to list

4. For each TRANSFER path (from transfers.ts × transferBonuses.ts):
   - sourceMiles = ceil(awardMiles / effectiveRatio)
   - Same tax + owned/purchased calculation with source currency price

5. Sort milesOptions by purchasedCost ascending

6. Determine recommendation:
   - bestPurchased = milesOptions[0].purchasedCost
   - bestOwned     = milesOptions[0].ownedCost
   - if bestPurchased < cashTotal × 0.95  → MILES_WIN       (>5% cheaper even buying)
   - else if bestOwned < cashTotal × 0.90 → MILES_IF_OWNED  (>10% cheaper if owned)
   - else                                 → CASH_WINS
   // Thresholds (0.95, 0.90) are named constants in costEngine.ts — tunable without logic changes.

7. Return CostComparison
```

### Output types

```typescript
interface MilesOption {
  type: "DIRECT" | "ALLIANCE" | "TRANSFER"
  program: string           // destination program
  via?: string              // transfer source currency if TRANSFER
  operatingAirline: string
  milesRequired: number     // total (pax × roundtrip factor)

  taxes: number

  // Scenario A: already own miles
  ownedCost: number
  ownedSavings: number

  // Scenario B: buy miles
  pricePerMile: number
  acquisitionCost: number
  purchasedCost: number
  purchasedSavings: number  // negative = cash wins

  promoApplied?: string     // ex: "Air France -30% miles purchase"
  chartSource: "REAL" | "ESTIMATE"
}

interface CostComparison {
  cashTotal: number
  milesOptions: MilesOption[]          // all options, sorted by purchasedCost
  bestOwnedOption: MilesOption | null
  bestPurchasedOption: MilesOption | null
  recommendation: "MILES_WIN" | "MILES_IF_OWNED" | "CASH_WINS"
  savings: number  // = bestOwnedOption.ownedSavings if > 0, else bestPurchasedOption.purchasedSavings. Negative = cash wins.
}
```

---

## Award Availability — Seats.aero Integration (optional)

Award availability cannot be guaranteed without a live API. Integration is optional and non-blocking.

**API:** [Seats.aero](https://seats.aero) — free tier: 500 req/month.

**Integration pattern:**
```
if SEATS_AERO_API_KEY env var present:
  → check availability before including a MilesOption
  → unavailable options hidden (not shown to user)
  → available options get availability: true badge

if not present or quota exceeded:
  → all options shown with disclaimer:
    "Sous réserve de disponibilité award · Vérifier sur [programme]"
```

This keeps the product functional without the API while rewarding users who configure it.

---

## Refresh Cron — `app/api/cron/miles-prices/route.ts`

Same pattern as existing `app/api/cron/promotions/route.ts`.

**Schedule:** every 24 hours  
**Auth:** `CRON_SECRET` (existing env var)

**Logic:**
```
1. Read data/milesPrices.ts (base prices)
2. Read data/transferBonuses.ts (base ratios + active promos)
3. Store in Redis:
   - miles:price:{program}  → effective price in cents (TTL: 25h)
   - miles:bonus:{from}:{to} → effective ratio (TTL: 25h)
4. Return { updated: N, timestamp }
```

**costEngine reads from Redis first, falls back to static data** — so the product works even if cron hasn't run yet.

**Manual update workflow:** when Air France announces -30% miles purchase promo:
1. Update `data/milesPrices.ts` with `promoPrice` field
2. Commit to `dev`
3. Cron propagates within 24h (or trigger manually via the endpoint)

---

## Updated `FlightResult` Interface

```typescript
interface FlightResult {
  // ── Existing (unchanged) ──────────────────────────────────
  from: string; to: string
  price: number; returnPrice?: number; totalPrice?: number
  airlines: string[]; returnAirlines?: string[]
  duration?: number; stops: number
  cabin: Cabin; tripType: TripType; passengers: number
  date?: string; returnDate?: string

  // ── New: real cost comparison ─────────────────────────────
  cashTotal: number
  milesOptions: MilesOption[]
  bestOwnedOption: MilesOption | null
  bestPurchasedOption: MilesOption | null
  recommendation: "MILES_WIN" | "MILES_IF_OWNED" | "CASH_WINS"
  savings: number   // max savings in dollars (positive = miles win)

  // ── Kept for sorting & backwards compat ───────────────────
  // value = bestOwnedOption.ownedSavings / (bestOwnedOption.milesRequired / 100)
  // i.e. cents saved per mile spent — used to sort results by best deal
  // Falls back to 0 if no miles options exist
  value: number
  optimization: OptimizerDecision
}
```

---

## Files Changed

### Created
| File | Purpose |
|---|---|
| `lib/zones.ts` | Airport → zone mapping + `getZone()` |
| `lib/costEngine.ts` | Core cost comparator |
| `data/awardCharts.ts` | Zone-based award charts (8 programs) |
| `data/awardTaxes.ts` | Award taxes per operating airline |
| `data/milesPrices.ts` | Base purchase prices per program |
| `data/transferBonuses.ts` | Transfer ratios + active bonuses |
| `app/api/cron/miles-prices/route.ts` | Price refresh cron |

### Modified
| File | Change |
|---|---|
| `lib/engine.ts` | `enrichWithMiles()` → `enrichWithCostEngine()` |
| `lib/engine.ts` | `FlightResult` interface extended |
| `lib/optimizer.ts` | Simplified — routing logic absorbed by costEngine |
| `components/FlightCard.tsx` | Display new cost comparison (owned vs purchased scenarios) |

### Simplified
| File | Change |
|---|---|
| `lib/milesEngine.ts` | `calculateMilesValue()` removed; `estimateMiles()` kept as chart fallback |

---

## FlightCard UI — New Display Logic

The card shows the comparison in concrete terms:

```
┌─────────────────────────────────────────────────────┐
│ DSS → CDG · Business · 2 pax          MILES WIN ✈   │
├──────────────┬──────────────┬──────────────────────-─┤
│  +$920        │   $1 200     │    70K pts             │
│  Économie     │   Prix cash  │    Flying Blue         │
├─────────────────────────────────────────────────────┤
│ Si vous possédez ces miles → payez seulement $308 taxes
│ Si vous achetez ces miles  → coût total $665 (save $535)
├─────────────────────────────────────────────────────┤
│ Autres options : Turkish 45K miles · $458 total ↓   │
└─────────────────────────────────────────────────────┘
```

Recommendation badge:
- `MILES_WIN` → `bg-primary/15 text-blue-400` "MILES GAGNANTS"
- `MILES_IF_OWNED` → `bg-success/10 text-success` "SI VOUS AVEZ LES MILES"
- `CASH_WINS` → `bg-warning/10 text-warning` "CASH OPTIMAL"

---

## Constraints & Assumptions

1. **Award availability not guaranteed** — theoretical calculation. Seats.aero integration optional.
2. **Roundtrip = 2× one-way** — universal rule; exceptions added per-program in awardCharts if needed.
3. **Taxes are estimates** — real award taxes vary by routing and date. Figures in `awardTaxes.ts` are representative, not exact.
4. **Miles prices update via cron** — 24h max lag between a promo going live and KEZA reflecting it.
5. **8 programs with real charts** — others fall back to distance estimate. Flagged as `chartSource: "ESTIMATE"` in UI.
6. **No minimum miles balance validation** — engine assumes user can acquire any quantity.
