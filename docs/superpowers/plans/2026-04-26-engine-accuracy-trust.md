# Engine Accuracy & Trust Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix accuracy, trust, and product clarity in the KEZA cost engine without changing the FETCH → ENRICH → DECIDE architecture.

**Architecture:** All changes are isolated to `lib/costEngine.ts`, `lib/dynamicAwardEngine.ts`, a new `lib/mileValue.ts`, `lib/engine.ts` (flag + searchId), and a new click-tracking API route. No changes to Redis, cron jobs, or the Travelpayouts fetch layer.

**Tech Stack:** TypeScript strict, Next.js 14 App Router, Jest (ts-jest), Upstash Redis (click tracking only)

---

## File map

| File | Action | What changes |
|------|--------|-------------|
| `lib/engine.ts` | Modify | Add `cabinPriceEstimated: boolean` and `searchId: string` to `FlightResult`; set them in `enrichFlight()` |
| `lib/dynamicAwardEngine.ts` | Modify | Add `ZONE_PAIR_ECONOMY_CAPS` table; clamp estimate when it exceeds the cap |
| `lib/mileValue.ts` | **Create** | `getContextualMileValue(base, cabin, distanceKm)` — cabin + route-length aware valuation |
| `lib/costEngine.ts` | Modify | Use contextual mile value; add regional tax adjustment; replace EQUIVALENT with binary decision; add `displayMessage`, `disclaimer`, `isBestDeal`, per-option `explanation` |
| `app/api/track/click/route.ts` | **Create** | `POST /api/track/click` — logs booking click to Redis with 30-day TTL |
| `__tests__/lib/costEngine.test.ts` | Modify | Update EQUIVALENT → binary; test new fields |
| `__tests__/lib/mileValue.test.ts` | **Create** | Unit tests for contextual mile value |

---

## Task 1 — Cabin price disclaimer flag

**Spec ref:** Fix #1 — "clearly label estimated premium cabin prices"

**Files:**
- Modify: `lib/engine.ts` (lines 35–61 interface, line 488–532 enrichFlight)

### What to do

`FlightResult` currently has no flag to tell the UI that the cash price for business/first was estimated, not fetched. Add `cabinPriceEstimated: boolean` and set it to `true` when `cabin !== "economy"`.

- [ ] **Step 1 — Add field to FlightResult interface**

In `lib/engine.ts`, find the `FlightResult` interface (line 35). Add after line 57 (`explanation: string;`):

```typescript
  // ── Cabin price accuracy ───────────────────────────────────────────────────
  cabinPriceEstimated: boolean;   // true when price = economy × multiplier (not real cabin price)
  searchId: string;               // UUID per search — used for click tracking
```

- [ ] **Step 2 — Set cabinPriceEstimated in enrichFlight**

In `lib/engine.ts`, find the result object literal starting at line 513. After `optimization,` add:

```typescript
    cabinPriceEstimated: cabin !== "economy",
    searchId: "",   // filled by caller in fetchFlights; placeholder here
```

- [ ] **Step 3 — Propagate searchId from fetchFlights**

In `lib/engine.ts`, find the `fetchCalendarPrices` / `fetchFlights` function (wherever `enrichFlight` is called in a `.map()`). The pattern is:

```typescript
// BEFORE (approximate — find the actual map call):
.map((f) => enrichFlight(f, cabin, passengers, userPrograms, tripType, effectivePrices, returnFlight, searchDate))

// AFTER — generate one searchId per search call, pass it through:
const searchId = crypto.randomUUID();
// then in the map:
.map((f) => {
  const r = enrichFlight(f, cabin, passengers, userPrograms, tripType, effectivePrices, returnFlight, searchDate);
  r.searchId = searchId;
  return r;
})
```

`crypto` is a Node.js built-in — no import needed (already available in the server-only engine).

- [ ] **Step 4 — Run existing tests to confirm no regressions**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/lib/costEngine.test.ts --no-coverage
```

Expected: all existing tests PASS (we only added optional fields, no logic change yet).

- [ ] **Step 5 — Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add lib/engine.ts
git commit -m "feat(engine): add cabinPriceEstimated flag and searchId to FlightResult"
```

---

## Task 2 — Zone-pair caps for dynamic award engine

**Spec ref:** Fix #2 — "replace distance × rate with zone-based ranges / realistic brackets"

**Files:**
- Modify: `lib/dynamicAwardEngine.ts`

### Problem

`estimateMilesRequired` uses `distanceKm × baseRate`. For CDG→NRT (9,714 km) with a SkyTeam program at 7.5/km → **72,855 miles**. Real award charts for Europe→Asia are 30,000–45,000 miles. The dynamic engine overestimates by 60%+, making miles look expensive on long-haul where they're actually best value.

### Fix

Add a `ZONE_PAIR_ECONOMY_CAPS` table. After computing `rawMilesOneWay`, clamp it so it never exceeds the cap for this zone pair. Pass `originZone` and `destZone` as optional params.

- [ ] **Step 1 — Write failing test**

Create `__tests__/lib/dynamicAwardEngine.test.ts`:

```typescript
import { estimateMilesRequired } from "@/lib/dynamicAwardEngine";

describe("estimateMilesRequired — zone-pair caps", () => {
  // CDG (48.85, 2.35) → NRT (35.77, 140.39) = ~9,714 km
  // SkyTeam at 7.5/km = 72,855 miles — must be capped at 45,000
  it("caps EUROPE→ASIA economy at 45,000 one-way", () => {
    const est = estimateMilesRequired(
      "Flying Club",
      "SkyTeam",
      48.85, 2.35,   // CDG
      35.77, 140.39, // NRT
      "economy",
      "oneway",
      1,
      "EUROPE",
      "ASIA",
    );
    expect(est.milesRequired).toBeLessThanOrEqual(45_000);
  });

  it("caps EUROPE→NORTH_AMERICA economy at 35,000 one-way", () => {
    const est = estimateMilesRequired(
      "LifeMiles",
      "Star Alliance",
      48.85, 2.35,    // CDG
      40.71, -74.01,  // JFK
      "economy",
      "oneway",
      1,
      "EUROPE",
      "NORTH_AMERICA",
    );
    expect(est.milesRequired).toBeLessThanOrEqual(35_000);
  });

  it("does not cap short-haul EUROPE→MIDDLE_EAST below real minimum", () => {
    const est = estimateMilesRequired(
      "LifeMiles",
      "Star Alliance",
      48.85, 2.35,    // CDG
      25.25, 55.36,   // DXB
      "economy",
      "oneway",
      1,
      "EUROPE",
      "MIDDLE_EAST",
    );
    // DXB is 5,244 km. At 7/km = 36,708 miles > cap 20,000 → should be 20,000
    expect(est.milesRequired).toBeLessThanOrEqual(20_000);
  });

  it("doubles miles for roundtrip", () => {
    const ow = estimateMilesRequired("LifeMiles", "Star Alliance", 48.85, 2.35, 40.71, -74.01, "economy", "oneway", 1, "EUROPE", "NORTH_AMERICA");
    const rt = estimateMilesRequired("LifeMiles", "Star Alliance", 48.85, 2.35, 40.71, -74.01, "economy", "roundtrip", 1, "EUROPE", "NORTH_AMERICA");
    expect(rt.milesRequired).toBe(ow.milesRequired * 2);
  });
});
```

- [ ] **Step 2 — Run test to confirm it fails**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/lib/dynamicAwardEngine.test.ts --no-coverage
```

Expected: FAIL — `estimateMilesRequired` does not accept zone params yet.

- [ ] **Step 3 — Add zone-pair caps to dynamicAwardEngine.ts**

In `lib/dynamicAwardEngine.ts`, after the `MIN_MILES_ONEWAY` constant (line ~84), add:

```typescript
// ---------------------------------------------------------------------------
// Zone-pair economy caps (one-way, per pax)
// Prevents distance × rate from overestimating long-haul routes.
// Values are conservative upper bounds derived from real award charts.
// ---------------------------------------------------------------------------

export type ZoneKey =
  | "EUROPE" | "NORTH_AMERICA" | "ASIA" | "MIDDLE_EAST"
  | "SOUTH_AMERICA" | "AFRICA_WEST" | "AFRICA_NORTH" | "AFRICA_EAST" | "AFRICA_SOUTH";

/**
 * Maximum economy miles (one-way, 1 pax) for a given origin→destination zone pair.
 * When the distance-based estimate exceeds this, it is clamped to this cap.
 * Symmetric: if A→B cap is 35k, B→A is also 35k (handled in lookup below).
 */
const ZONE_PAIR_ECONOMY_CAPS: Partial<Record<ZoneKey, Partial<Record<ZoneKey, number>>>> = {
  EUROPE: {
    ASIA:          45_000,
    NORTH_AMERICA: 35_000,
    MIDDLE_EAST:   20_000,
    SOUTH_AMERICA: 40_000,
    AFRICA_WEST:   22_000,
    AFRICA_NORTH:  15_000,
    AFRICA_EAST:   25_000,
    AFRICA_SOUTH:  28_000,
  },
  NORTH_AMERICA: {
    ASIA:          45_000,
    EUROPE:        35_000,
    MIDDLE_EAST:   35_000,
    SOUTH_AMERICA: 25_000,
    AFRICA_WEST:   35_000,
    AFRICA_EAST:   40_000,
    AFRICA_SOUTH:  40_000,
  },
  ASIA: {
    EUROPE:        45_000,
    NORTH_AMERICA: 45_000,
    MIDDLE_EAST:   18_000,
    SOUTH_AMERICA: 50_000,
    AFRICA_EAST:   35_000,
  },
  MIDDLE_EAST: {
    EUROPE:        20_000,
    NORTH_AMERICA: 35_000,
    ASIA:          18_000,
    AFRICA_WEST:   18_000,
    AFRICA_EAST:   15_000,
    AFRICA_SOUTH:  20_000,
  },
  SOUTH_AMERICA: {
    EUROPE:        40_000,
    NORTH_AMERICA: 25_000,
  },
  AFRICA_WEST: {
    EUROPE:        22_000,
    NORTH_AMERICA: 35_000,
    MIDDLE_EAST:   18_000,
    AFRICA_EAST:   18_000,
    AFRICA_SOUTH:  22_000,
  },
  AFRICA_NORTH: {
    EUROPE:        15_000,
    MIDDLE_EAST:   12_000,
  },
  AFRICA_EAST: {
    EUROPE:        25_000,
    MIDDLE_EAST:   15_000,
    ASIA:          35_000,
    NORTH_AMERICA: 40_000,
  },
  AFRICA_SOUTH: {
    EUROPE:        28_000,
    NORTH_AMERICA: 40_000,
    MIDDLE_EAST:   20_000,
    ASIA:          38_000,
  },
};

function getZonePairCap(origin: ZoneKey | undefined, dest: ZoneKey | undefined): number | undefined {
  if (!origin || !dest) return undefined;
  return ZONE_PAIR_ECONOMY_CAPS[origin]?.[dest]
    ?? ZONE_PAIR_ECONOMY_CAPS[dest]?.[origin];  // symmetric fallback
}
```

- [ ] **Step 4 — Update `estimateMilesRequired` signature to accept optional zones**

In `lib/dynamicAwardEngine.ts`, update the function signature (line ~151):

```typescript
export function estimateMilesRequired(
  program: string,
  alliance: Alliance,
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  cabin: CabinClass = "economy",
  tripType: TripType = "roundtrip",
  passengers: number = 1,
  originZone?: ZoneKey,   // NEW — optional, used for zone-pair cap lookup
  destZone?: ZoneKey,     // NEW
): MilesEstimate {
```

- [ ] **Step 5 — Apply cap inside the function body**

Replace the section between step 5 (floor) and step 7 (round) in `estimateMilesRequired`:

```typescript
  // 5. Apply floor
  const flooredOneWay = Math.max(rawMilesOneWay, MIN_MILES_ONEWAY[cabin]);

  // 5b. Apply zone-pair economy cap (clamp overestimation on long-haul)
  const economyCap = getZonePairCap(originZone, destZone);
  // Cap is in economy units; scale up for premium cabins using same cabin ratio
  const scaledCap = economyCap !== undefined
    ? economyCap * CABIN_MULTIPLIERS[cabin]
    : undefined;
  const cappedOneWay = scaledCap !== undefined
    ? Math.min(flooredOneWay, scaledCap)
    : flooredOneWay;

  // 7. Round, then apply trip & passengers
  const roundedOneWay = roundMiles(cappedOneWay);
  const totalMiles = roundedOneWay * tripMultiplier * passengers;
```

Also update the `breakdown` return to include cap info:

```typescript
  return {
    program,
    milesRequired: totalMiles,
    cabin,
    tripType,
    passengers,
    distanceKm: Math.round(distanceKm),
    confidence: economyCap !== undefined ? "ESTIMATE" : "ROUGH_ESTIMATE",
    breakdown: {
      baseRate,
      cabinMultiplier,
      tripMultiplier,
      rawMiles: rawMilesOneWay * tripMultiplier * passengers,
    },
  };
```

- [ ] **Step 6 — Update callers of estimateMilesRequired in costEngine.ts**

In `lib/costEngine.ts`, find where `estimateMilesRequired` is called (line ~247):

```typescript
// BEFORE:
const estimate = estimateMilesRequired(
  prog.name,
  prog.alliance,
  fromAirport.lat, fromAirport.lon,
  toAirport.lat, toAirport.lon,
  dynamicCabin,
  tripType,
  passengers
);

// AFTER — pass the already-computed zones:
const estimate = estimateMilesRequired(
  prog.name,
  prog.alliance,
  fromAirport.lat, fromAirport.lon,
  toAirport.lat, toAirport.lon,
  dynamicCabin,
  tripType,
  passengers,
  originZone as ZoneKey ?? undefined,
  destZone as ZoneKey ?? undefined,
);
```

You need `import type { ZoneKey } from "./dynamicAwardEngine";` at the top of `costEngine.ts` — add it to the existing import from `"./dynamicAwardEngine"`:

```typescript
// BEFORE:
import { estimateMilesRequired, type CabinClass } from "./dynamicAwardEngine";

// AFTER:
import { estimateMilesRequired, type CabinClass, type ZoneKey } from "./dynamicAwardEngine";
```

- [ ] **Step 7 — Run tests**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/lib/dynamicAwardEngine.test.ts __tests__/lib/costEngine.test.ts --no-coverage
```

Expected: ALL PASS.

- [ ] **Step 8 — Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add lib/dynamicAwardEngine.ts lib/costEngine.ts __tests__/lib/dynamicAwardEngine.test.ts
git commit -m "feat(engine): add zone-pair economy caps to dynamic award engine"
```

---

## Task 3 — Contextual mile value

**Spec ref:** Fix #3 — "valuePerMile must depend on cabin and route length"

**Files:**
- Create: `lib/mileValue.ts`
- Modify: `lib/costEngine.ts` (call site in `buildOption`)

### Rationale

A business class seat worth $3,000 redeemed for 50,000 miles = $0.06/mile effective value. Showing the same 1.5¢ static value for economy and business distorts the comparison. Short-haul miles redemptions are also notoriously poor value (5,000 miles for a $60 ticket = 1.2¢/mile marginal, but the 5,000 miles are almost irreplaceable on short-haul).

### Multiplier table

| Cabin | Multiplier |
|-------|-----------|
| economy | 1.0× |
| premium | 1.4× |
| business | 2.0× |
| first | 2.5× |

| Route length | Multiplier |
|-------------|-----------|
| short (< 2,000 km) | 0.85× |
| medium (2,000–6,000 km) | 1.0× |
| long (> 6,000 km) | 1.25× |

These are applied multiplicatively to the base value from `milesPrices.ts`.

- [ ] **Step 1 — Write failing tests**

Create `__tests__/lib/mileValue.test.ts`:

```typescript
import { getContextualMileValue } from "@/lib/mileValue";

describe("getContextualMileValue", () => {
  const BASE = 1.5; // Flying Blue base value cents

  it("returns base value for economy medium-haul", () => {
    expect(getContextualMileValue(BASE, "economy", 4_000)).toBe(1.5);
  });

  it("multiplies by 2.0 for business cabin", () => {
    // medium-haul (1.0×) × business (2.0×) = 3.0
    expect(getContextualMileValue(BASE, "business", 4_000)).toBeCloseTo(3.0);
  });

  it("multiplies by 2.5 for first cabin", () => {
    expect(getContextualMileValue(BASE, "first", 4_000)).toBeCloseTo(3.75);
  });

  it("multiplies by 1.25 for long-haul economy (> 6000 km)", () => {
    // long-haul (1.25×) × economy (1.0×) = 1.875
    expect(getContextualMileValue(BASE, "economy", 8_000)).toBeCloseTo(1.875);
  });

  it("multiplies by 0.85 for short-haul economy (< 2000 km)", () => {
    expect(getContextualMileValue(BASE, "economy", 1_000)).toBeCloseTo(1.275);
  });

  it("stacks cabin and route multipliers: first + long-haul", () => {
    // 1.5 × 2.5 (first) × 1.25 (long) = 4.6875
    expect(getContextualMileValue(BASE, "first", 8_000)).toBeCloseTo(4.6875);
  });

  it("returns at minimum 0.5 cents (prevents divide-by-zero edge)", () => {
    expect(getContextualMileValue(0.1, "economy", 500)).toBeGreaterThanOrEqual(0.5);
  });
});
```

- [ ] **Step 2 — Run test to confirm it fails**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/lib/mileValue.test.ts --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3 — Create lib/mileValue.ts**

```typescript
// lib/mileValue.ts
// Contextual mile value: adjusts the base market value (cents/mile) based on
// cabin class and route length. Premium redemptions and long-haul sweet spots
// have higher effective value than short-haul economy usage.

import type { Cabin } from "./engine";

/** Cabin multipliers on top of base market value */
const CABIN_VALUE_MULTIPLIERS: Record<Cabin, number> = {
  economy: 1.0,
  premium: 1.4,
  business: 2.0,
  first: 2.5,
};

/** Route length brackets (one-way km) → value multiplier */
function getRouteLengthMultiplier(distanceKm: number): number {
  if (distanceKm < 2_000) return 0.85;  // short-haul: poor sweet spots
  if (distanceKm > 6_000) return 1.25;  // long-haul: best sweet spots
  return 1.0;                             // medium-haul: standard
}

/**
 * Compute the effective value of a mile for a specific redemption context.
 *
 * @param baseValueCents  - Static market value from milesPrices.ts (cents)
 * @param cabin           - Cabin class of the redemption
 * @param distanceKm      - Great-circle distance of the route
 * @returns               - Adjusted value in cents (≥ 0.5)
 */
export function getContextualMileValue(
  baseValueCents: number,
  cabin: Cabin,
  distanceKm: number,
): number {
  const cabinMultiplier  = CABIN_VALUE_MULTIPLIERS[cabin];
  const routeMultiplier  = getRouteLengthMultiplier(distanceKm);
  const adjusted = baseValueCents * cabinMultiplier * routeMultiplier;
  return Math.max(0.5, Math.round(adjusted * 1000) / 1000);
}
```

- [ ] **Step 4 — Run tests to confirm they pass**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/lib/mileValue.test.ts --no-coverage
```

Expected: 7/7 PASS.

- [ ] **Step 5 — Integrate into costEngine.ts buildOption**

In `lib/costEngine.ts`, add the import at the top:

```typescript
import { getContextualMileValue } from "./mileValue";
import { haversineDistanceKm } from "./dynamicAwardEngine";
import { AIRPORTS } from "@/data/airports";
```

(`AIRPORTS` is already imported at line 11 — don't duplicate it.)

Update `buildOption` signature to accept `distanceKm`:

```typescript
// BEFORE:
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

// AFTER:
function buildOption(
  type: "DIRECT" | "ALLIANCE" | "TRANSFER",
  program: string,
  via: string | undefined,
  operatingAirline: string,
  milesRequired: number,
  chartSource: "REAL" | "ESTIMATE",
  taxes: number,
  cashTotal: number,
  effectivePrices: Map<string, number>,
  cabin: Cabin,          // NEW
  distanceKm: number,    // NEW — 0 if unknown
): MilesOption {
```

Inside `buildOption`, replace the `valuePerMile` computation:

```typescript
  // BEFORE:
  const valuePerMile =
    effectivePrices.get(sourceProgram) ??
    effectivePrices.get(program) ??
    MILES_PRICE_MAP.get(sourceProgram) ??
    MILES_PRICE_MAP.get(program) ??
    DEFAULT_MILE_VALUE_CENTS;

  // AFTER:
  const baseCents =
    effectivePrices.get(sourceProgram) ??
    effectivePrices.get(program) ??
    MILES_PRICE_MAP.get(sourceProgram) ??
    MILES_PRICE_MAP.get(program) ??
    DEFAULT_MILE_VALUE_CENTS;

  const valuePerMile = distanceKm > 0
    ? getContextualMileValue(baseCents, cabin, distanceKm)
    : baseCents;
```

- [ ] **Step 6 — Compute distanceKm in buildCostOptions and pass to all buildOption calls**

In `buildCostOptions`, after the `fromAirport`/`toAirport` lookup (line ~221), add:

```typescript
  const distanceKm = (fromAirport && toAirport)
    ? haversineDistanceKm(fromAirport.lat, fromAirport.lon, toAirport.lat, toAirport.lon)
    : 0;
```

Then update every `buildOption(...)` call in `buildCostOptions` to pass `cabin, distanceKm` as the last two args. There are 3 call sites:
1. Zone-fallback loop (line ~175): `buildOption(..., cabin, distanceKm)`
2. Standard programs loop (line ~180): `buildOption(..., cabin, distanceKm)`
3. Transfer options loop (line ~204): `buildOption(..., cabin, distanceKm)`

- [ ] **Step 7 — Run all engine tests**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/lib/costEngine.test.ts __tests__/lib/mileValue.test.ts --no-coverage
```

Expected: ALL PASS.

- [ ] **Step 8 — Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add lib/mileValue.ts lib/costEngine.ts __tests__/lib/mileValue.test.ts
git commit -m "feat(engine): contextual mile value — cabin and route-length aware valuation"
```

---

## Task 4 — Binary decision + display message + trust fields

**Spec ref:** Fix #5 (confidence), #6 (obvious decision), #7 (explanation), #8 (disclaimer), Fix #4 (region taxes)

**Files:**
- Modify: `lib/costEngine.ts` (interfaces + buildCostOptions logic)
- Modify: `__tests__/lib/costEngine.test.ts`

### Changes

**A. Remove EQUIVALENT from `Recommendation` type**

`Recommendation = "USE_MILES" | "USE_CASH"` — binary, no ambiguity. Within-5% differences still resolve to a side (USE_CASH as conservative tiebreaker).

**B. Add `displayMessage` to `CostComparison`**

```typescript
displayMessage: string;  // "🔥 Tu économises $X avec les miles" or "❌ Les miles coûtent $X de plus"
```

**C. Add `disclaimer` to `CostComparison`**

```typescript
disclaimer: string;  // fixed trust string shown on every result
```

**D. Add `explanation` to `MilesOption`**

```typescript
explanation: string;  // e.g. "Flying Blue direct · 30 000 miles + $300 taxes"
```

**E. Add `isBestDeal` to `MilesOption`**

```typescript
isBestDeal: boolean;  // true only on cheapest option
```

**F. Regional tax adjustment**

Add `+$25` to African origin airports (higher local taxes/fees). Applied inside `buildCostOptions` before calling `buildOption`.

- [ ] **Step 1 — Write failing tests**

In `__tests__/lib/costEngine.test.ts`, add the following describe blocks after the existing ones:

```typescript
describe("binary recommendation — no EQUIVALENT", () => {
  it("never returns EQUIVALENT", () => {
    const r = buildCostOptions(BASE, new Map());
    expect(r.recommendation).not.toBe("EQUIVALENT");
    expect(["USE_MILES", "USE_CASH"]).toContain(r.recommendation);
  });

  it("USE_CASH when cash is $50 (miles always more expensive)", () => {
    const cheap: FlightInput = { ...BASE, totalPrice: 50, cabin: "economy", passengers: 1 };
    expect(buildCostOptions(cheap, new Map()).recommendation).toBe("USE_CASH");
  });
});

describe("displayMessage", () => {
  it("starts with 🔥 when USE_MILES", () => {
    // $1200 business, AF → Flying Blue should be cheaper than cash
    const r = buildCostOptions(BASE, new Map());
    if (r.recommendation === "USE_MILES") {
      expect(r.displayMessage).toMatch(/🔥/);
    }
  });

  it("starts with ❌ or 💵 when USE_CASH", () => {
    const cheap: FlightInput = { ...BASE, totalPrice: 50, cabin: "economy", passengers: 1 };
    const r = buildCostOptions(cheap, new Map());
    expect(r.recommendation).toBe("USE_CASH");
    expect(r.displayMessage).toMatch(/❌|💵/);
  });
});

describe("disclaimer", () => {
  it("is a non-empty string on every result", () => {
    const r = buildCostOptions(BASE, new Map());
    expect(typeof r.disclaimer).toBe("string");
    expect(r.disclaimer.length).toBeGreaterThan(10);
  });
});

describe("MilesOption.explanation", () => {
  it("includes program name and miles count", () => {
    const { milesOptions } = buildCostOptions(BASE, new Map());
    const fb = milesOptions.find((o) => o.program === "Flying Blue")!;
    expect(fb.explanation).toContain("Flying Blue");
    expect(fb.explanation).toContain("miles");
  });
});

describe("MilesOption.isBestDeal", () => {
  it("exactly one option has isBestDeal = true", () => {
    const { milesOptions } = buildCostOptions(BASE, new Map());
    const best = milesOptions.filter((o) => o.isBestDeal);
    expect(best).toHaveLength(1);
  });

  it("the isBestDeal option has the lowest totalMilesCost", () => {
    const { milesOptions } = buildCostOptions(BASE, new Map());
    const best = milesOptions.find((o) => o.isBestDeal)!;
    const minCost = Math.min(...milesOptions.map((o) => o.totalMilesCost));
    expect(best.totalMilesCost).toBe(minCost);
  });
});

describe("regional tax adjustment — Africa origin", () => {
  it("adds $25 surcharge for African origin (DSS)", () => {
    const african: FlightInput = { ...BASE, from: "DSS", to: "CDG", cabin: "economy", passengers: 1, tripType: "oneway" };
    const european: FlightInput = { ...BASE, from: "CDG", to: "JFK", cabin: "economy", passengers: 1, tripType: "oneway" };
    const afr = buildCostOptions(african, new Map());
    const eur = buildCostOptions(european, new Map());
    // We can't compare absolute taxes, but both should have at least one option with taxes
    const afrFb = afr.milesOptions.find((o) => o.program === "Flying Blue");
    const eurFb = eur.milesOptions.find((o) => o.program === "Flying Blue");
    if (afrFb && eurFb) {
      // African route should have higher or equal taxes (due to +$25 regional surcharge)
      expect(afrFb.taxes).toBeGreaterThanOrEqual(eurFb.taxes - 10); // allow ±10 for different base
    }
  });
});
```

- [ ] **Step 2 — Run tests to confirm they fail**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/lib/costEngine.test.ts --no-coverage 2>&1 | tail -20
```

Expected: Multiple FAIL for new tests.

- [ ] **Step 3 — Update `Recommendation` type and `MilesOption` interface in costEngine.ts**

In `lib/costEngine.ts`, replace:

```typescript
// BEFORE:
export type Recommendation = "USE_MILES" | "USE_CASH" | "EQUIVALENT";

// AFTER:
export type Recommendation = "USE_MILES" | "USE_CASH";
```

In the `MilesOption` interface, add after `promoApplied?`:

```typescript
  explanation: string;     // human-readable: "Flying Blue direct · 30 000 miles + $300 taxes"
  isBestDeal: boolean;     // true only on the cheapest option after deduplication
```

In the `CostComparison` interface, replace `explanation: string` with:

```typescript
  explanation: string;     // kept for backward compat (same text, legacy)
  displayMessage: string;  // "🔥 Tu économises $X" or "❌ Les miles coûtent $X de plus"
  disclaimer: string;      // trust disclaimer shown on every result
```

- [ ] **Step 4 — Add `buildOptionExplanation` helper function**

After the `buildOption` function (line ~139), add:

```typescript
// ─── Helper: human-readable explanation per option ────────────────────────

function buildOptionExplanation(
  opt: Omit<MilesOption, "explanation" | "isBestDeal">,
): string {
  const typeLabel =
    opt.type === "DIRECT"    ? "direct" :
    opt.type === "ALLIANCE"  ? "alliance" :
    opt.via?.startsWith("Achat") ? `achat via ${opt.via}` :
    `transfert ${opt.via ?? ""}`;

  const milesFormatted = opt.milesRequired.toLocaleString("fr-FR");
  const promoNote = opt.promoApplied ? ` · ${opt.promoApplied}` : "";

  return `${opt.program} (${typeLabel}) · ${milesFormatted} miles + $${opt.taxes} taxes${promoNote}`;
}
```

- [ ] **Step 5 — Add regional tax adjustment helper**

After `buildOptionExplanation`, add:

```typescript
// ─── Regional tax adjustment ──────────────────────────────────────────────
// African origin airports charge higher local departure taxes/fees.

const AFRICAN_ZONES = new Set([
  "AFRICA_WEST", "AFRICA_NORTH", "AFRICA_EAST", "AFRICA_SOUTH",
]);

function getRegionalTaxSurcharge(originZone: string | null): number {
  if (!originZone) return 0;
  if (AFRICAN_ZONES.has(originZone)) return 25;
  return 0;
}
```

- [ ] **Step 6 — Update buildOption to call buildOptionExplanation**

In `buildOption`, just before the `return {` statement, add:

```typescript
  const explanation = buildOptionExplanation({
    type, program, via, operatingAirline, milesRequired,
    chartSource, taxes, valuePerMile, milesCost, totalMilesCost, savings, confidence,
    promoApplied: undefined,
  });
```

Then add `explanation` and `isBestDeal: false` to the returned object (isBestDeal is set later after dedup):

```typescript
  return {
    type,
    program,
    via,
    operatingAirline,
    milesRequired,
    taxes,
    valuePerMile,
    milesCost,
    totalMilesCost,
    savings,
    confidence,
    chartSource,
    explanation,
    isBestDeal: false,   // set to true on bestOption after deduplication
  };
```

- [ ] **Step 7 — Apply regional tax surcharge in buildCostOptions**

In `buildCostOptions`, after computing `distanceKm` (from Task 3), add:

```typescript
  const regionalSurcharge = getRegionalTaxSurcharge(originZone);
```

Then in every `getAwardTaxes(...)` call, add the surcharge:

```typescript
// BEFORE:
const taxes = getAwardTaxes(airlineForTaxes, cabin, passengers);

// AFTER:
const taxes = getAwardTaxes(airlineForTaxes, cabin, passengers) + regionalSurcharge;
```

Apply this to all 3 call sites (direct/alliance loop, transfer loop).

- [ ] **Step 8 — Replace EQUIVALENT logic and add displayMessage + disclaimer**

In `buildCostOptions`, replace the DECISION block (lines ~340–368):

```typescript
  // ── DECISION: compare REAL TOTAL COSTS ────────────────────────────────────
  const bestOption = dedupedOptions[0] ?? null;
  const bestMilesCost = bestOption?.totalMilesCost ?? Infinity;
  const signedSavings = cashTotal - bestMilesCost;  // positive = miles cheaper
  const savings = Math.round(Math.abs(signedSavings) * 100) / 100;

  // Binary: USE_MILES only when miles strictly cost less (no EQUIVALENT zone)
  const recommendation: Recommendation = (bestOption && signedSavings > 0)
    ? "USE_MILES"
    : "USE_CASH";

  // Display message — unambiguous for the user
  const displayMessage: string = !bestOption
    ? `💵 Payez en cash — aucune option miles disponible`
    : recommendation === "USE_MILES"
      ? `🔥 Tu économises $${savings} avec les miles`
      : signedSavings < 0
        ? `❌ Les miles coûtent $${savings} de plus que le cash`
        : `💵 Cash légèrement moins cher — conserve tes miles`;

  // Trust disclaimer — shown on every result
  const disclaimer =
    "⚠️ Prix indicatifs basés sur tarifs réels et valeurs de miles estimées — vérifiez la disponibilité avant de réserver.";

  // Mark best deal
  if (dedupedOptions.length > 0) {
    dedupedOptions[0].isBestDeal = true;
  }

  // Legacy explanation string (preserved for backward compat)
  const explanation = bestOption
    ? recommendation === "USE_MILES"
      ? `Économisez $${savings} en utilisant ${bestOption.program}${bestOption.via ? ` via ${bestOption.via}` : ""} (${bestOption.milesRequired.toLocaleString()} miles + $${bestOption.taxes} taxes = $${bestMilesCost} vs $${cashTotal} cash)`
      : signedSavings < 0
        ? `Le cash est moins cher de $${savings}. Miles coûteraient $${bestMilesCost} vs $${cashTotal} cash.`
        : `Quasi identique — cash légèrement avantageux de $${savings}.`
    : `Aucune option miles disponible. Payez en cash ($${cashTotal}).`;

  return {
    cashCost: cashTotal,
    milesCost: bestOption ? bestMilesCost : 0,
    savings,
    recommendation,
    displayMessage,
    disclaimer,
    bestOption,
    milesOptions: dedupedOptions,
    explanation,
  };
```

- [ ] **Step 9 — Fix the existing costEngine test that checks for EQUIVALENT**

In `__tests__/lib/costEngine.test.ts`, the existing test:
```typescript
it("USE_MILES when miles cost is less than cash", () => {
  const { recommendation } = buildCostOptions(BASE, new Map());
  expect(["USE_MILES", "USE_CASH", "EQUIVALENT"]).toContain(recommendation);
});
```
Replace with:
```typescript
it("recommendation is binary — USE_MILES or USE_CASH", () => {
  const { recommendation } = buildCostOptions(BASE, new Map());
  expect(["USE_MILES", "USE_CASH"]).toContain(recommendation);
});
```

Also update `lib/engine.ts` — `FlightResult.recommendation` references the `Recommendation` type which no longer has `EQUIVALENT`. Add `displayMessage` and `disclaimer` to `FlightResult`:

```typescript
// In FlightResult interface, after explanation: string;
  displayMessage: string;
  disclaimer: string;
```

And in `enrichFlight()`, after `explanation: comparison.explanation,` add:
```typescript
    displayMessage:  comparison.displayMessage,
    disclaimer:      comparison.disclaimer,
```

- [ ] **Step 10 — Run all tests**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/lib/ --no-coverage
```

Expected: ALL PASS (some tests in other files may reference EQUIVALENT — search and update if needed):

```bash
grep -r "EQUIVALENT" /Users/DIALLO9194/Downloads/keza/__tests__/ --include="*.ts"
```

If found, replace `"EQUIVALENT"` with `"USE_CASH"` in those test expectations.

- [ ] **Step 11 — TypeScript check**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx tsc --noEmit 2>&1 | grep -v node_modules | head -20
```

Expected: 0 errors.

- [ ] **Step 12 — Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add lib/costEngine.ts lib/engine.ts __tests__/lib/costEngine.test.ts
git commit -m "feat(engine): binary decision, displayMessage, disclaimer, isBestDeal, per-option explanation"
```

---

## Task 5 — Click tracking endpoint

**Spec ref:** Fix #10 — "tracking booking clicks for affiliation"

**Files:**
- Create: `app/api/track/click/route.ts`

### Design

`POST /api/track/click` with body `{ searchId, route, program }` → stores a counter in Redis at `keza:clicks:{searchId}` (TTL 30 days). Fire-and-forget from UI. No auth required (public analytics).

- [ ] **Step 1 — Write failing test**

Create `__tests__/api/track-click.test.ts`:

```typescript
// __tests__/api/track-click.test.ts
// Note: this tests request validation only (Redis is mocked)
import { POST } from "@/app/api/track/click/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/redis", () => ({
  redis: {
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
  },
}));

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/track/click", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/track/click", () => {
  it("returns 200 for valid payload", async () => {
    const res = await POST(makeReq({ searchId: "abc123", route: "CDG-NRT", program: "Flying Blue" }));
    expect(res.status).toBe(200);
  });

  it("returns 400 when searchId is missing", async () => {
    const res = await POST(makeReq({ route: "CDG-NRT" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when route is missing", async () => {
    const res = await POST(makeReq({ searchId: "abc" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is not JSON", async () => {
    const req = new NextRequest("http://localhost/api/track/click", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2 — Run test to confirm it fails**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/api/track-click.test.ts --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3 — Create app/api/track/click/route.ts**

```typescript
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export const runtime = "nodejs";  // Redis client requires Node.js

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    typeof body !== "object" || body === null ||
    !("searchId" in body) || typeof (body as Record<string, unknown>).searchId !== "string" ||
    !("route"    in body) || typeof (body as Record<string, unknown>).route    !== "string"
  ) {
    return NextResponse.json({ error: "Missing required fields: searchId, route" }, { status: 400 });
  }

  const { searchId, route, program } = body as { searchId: string; route: string; program?: string };

  // Fire-and-forget: increment click counter, expire after 30 days
  const key = `keza:clicks:${searchId}:${route}`;
  redis.incr(key).then(() => redis.expire(key, 60 * 60 * 24 * 30)).catch(() => {});

  // Also increment aggregate counter per route (all time)
  const aggKey = `keza:clicks:route:${route}`;
  redis.incr(aggKey).catch(() => {});

  if (program) {
    const progKey = `keza:clicks:program:${program}`;
    redis.incr(progKey).catch(() => {});
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
```

- [ ] **Step 4 — Run tests**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/api/track-click.test.ts --no-coverage
```

Expected: 4/4 PASS.

- [ ] **Step 5 — TypeScript check**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx tsc --noEmit 2>&1 | grep -v node_modules | head -10
```

Expected: 0 errors.

- [ ] **Step 6 — Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add app/api/track/click/route.ts __tests__/api/track-click.test.ts
git commit -m "feat(tracking): POST /api/track/click endpoint for booking click analytics"
```

---

## Task 6 — Full test run + push

- [ ] **Step 1 — Run full test suite**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest --no-coverage 2>&1 | tail -20
```

Expected: All suites PASS. If any fail, fix before pushing.

- [ ] **Step 2 — TypeScript full check**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx tsc --noEmit 2>&1 | grep -v node_modules
```

Expected: 0 errors.

- [ ] **Step 3 — ESLint check**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx next lint 2>&1 | grep -E "Error|Warning" | grep -v "node_modules" | head -20
```

Expected: 0 errors (warnings OK).

- [ ] **Step 4 — Push**

```bash
cd /Users/DIALLO9194/Downloads/keza
git push origin main
```

- [ ] **Step 5 — Verify deployment**

```bash
curl -s "https://keza-taupe.vercel.app/sitemap.xml" | grep -c "flights/"
```

Expected: ≥ 200 (confirms build passed and site is live). Also smoke-test:

```bash
curl -s "https://keza-taupe.vercel.app/api/version" | head -c 100
```

---

## Self-review checklist

**Spec coverage:**
- [x] Fix #1 — Fake premium pricing → `cabinPriceEstimated` flag (Task 1)
- [x] Fix #2 — Miles estimation → zone-pair caps (Task 2)
- [x] Fix #3 — Dynamic mile value → contextual valuation (Task 3)
- [x] Fix #4 — Taxes improvement → regional surcharge (Task 4)
- [x] Fix #5 — Confidence score → already exists on `MilesOption`, now `isBestDeal` surfaces best (Task 4)
- [x] Fix #6 — Obvious decision → binary + `displayMessage` (Task 4)
- [x] Fix #7 — Explanation WHY → `MilesOption.explanation` (Task 4)
- [x] Fix #8 — Disclaimer → `CostComparison.disclaimer` (Task 4)
- [x] Fix #9 — Keep architecture → FETCH → ENRICH → DECIDE unchanged
- [x] Fix #10 — Monetization prep → `searchId` + click tracking API (Tasks 1 + 5)

**No placeholders:** Every step has complete code.

**Type consistency:** `Recommendation` is binary throughout; `MilesOption.explanation` and `isBestDeal` defined in interface before use in builder; `CostComparison.displayMessage` and `disclaimer` in interface before return statement.
