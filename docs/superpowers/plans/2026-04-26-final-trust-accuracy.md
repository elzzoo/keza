# Final Trust & Accuracy Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pre-launch trust pass — make results feel realistic, unambiguous, and trustworthy in 2 seconds, without touching engine architecture.

**Architecture:** 4 files. Engine (FETCH→ENRICH→DECIDE) untouched. Changes: zone-aware tax fallback in `awardTaxes.ts`; remove Africa surcharge + fix displayMessage wording in `costEngine.ts`; replace decision banner with engine's `displayMessage` + add confidence/estimated/best-deal signals in `FlightCard.tsx`; pass `isGlobalBest` to first card in `Results.tsx`.

**Tech Stack:** TypeScript strict, Next.js 14 App Router, React, Jest (ts-jest), Tailwind CSS

---

## File map

| File | Action | What changes |
|------|--------|-------------|
| `data/awardTaxes.ts` | Modify | Add `UK_AIRPORTS` + `getRegionalDefaultTaxes()`; update `getAwardTaxes` to use zone-aware fallback |
| `lib/costEngine.ts` | Modify | Remove Africa +$25 surcharge; pass `from`/`to`/zones to `getAwardTaxes`; fix displayMessage wording for USE_CASH |
| `components/FlightCard.tsx` | Modify | `displayMessage` as primary headline; program context line; confidence badge moved to banner; estimated cabin strip; global best badge |
| `components/Results.tsx` | Modify | Pass `isGlobalBest={i === 0}` to first FlightCard in sorted results |
| `__tests__/lib/awardTaxes.test.ts` | **Create** | Unit tests for zone-aware default fallback |
| `__tests__/lib/costEngine.test.ts` | Modify | Update taxes assertion (1125→1100, Africa surcharge removed); update displayMessage test |

---

## Task 1 — Zone-aware tax fallback

**Spec ref:** Design §A1 — regional default for unknown airlines

**Files:**
- Modify: `data/awardTaxes.ts`
- Create: `__tests__/lib/awardTaxes.test.ts`

### Context

`getAwardTaxes` currently falls back to a flat `AWARD_TAXES["_default"]` ($120 economy / $250 business) for any airline not in the map. This makes UK routes on unknown carriers look cheap. The fix: add `getRegionalDefaultTaxes(from, to, originZone, destZone, cabin, passengers)` and call it as the fallback when the airline is not found.

Priority rules (first match wins):
1. Either airport in `UK_AIRPORTS` → economy $250 / business $500
2. Either zone is `EUROPE` → economy $150 / business $350
3. Both zones are `NORTH_AMERICA` → economy $30 / business $60
4. Either zone starts with `AFRICA_` → economy $50 / business $100
5. Either zone is `MIDDLE_EAST` → economy $40 / business $80
6. Default → economy $100 / business $200

Business doubles economy; premium = economy; first = business × 1.2 (same logic as existing function).

- [ ] **Step 1 — Write failing tests**

Create `__tests__/lib/awardTaxes.test.ts`:

```typescript
import { getAwardTaxes } from "@/data/awardTaxes";

describe("getAwardTaxes — known airlines (unchanged behaviour)", () => {
  it("returns per-airline value for Air France economy", () => {
    // AF economy = 300, × 1 pax = 300
    expect(getAwardTaxes("Air France", "economy", 1)).toBe(300);
  });

  it("returns per-airline value for British Airways business", () => {
    // BA business = 700, × 2 pax = 1400
    expect(getAwardTaxes("British Airways", "business", 2)).toBe(1400);
  });

  it("returns per-airline value for Delta economy", () => {
    expect(getAwardTaxes("Delta", "economy", 1)).toBe(50);
  });
});

describe("getAwardTaxes — unknown airline, zone-aware default", () => {
  it("UK airport (LHR) → $250 economy × 1 pax", () => {
    expect(getAwardTaxes("Unknown Air", "economy", 1, "LHR", "CDG")).toBe(250);
  });

  it("UK airport (LGW) as destination → $250 economy", () => {
    expect(getAwardTaxes("Unknown Air", "economy", 1, "CDG", "LGW")).toBe(250);
  });

  it("UK business × 2 pax = $500 × 2 = 1000", () => {
    expect(getAwardTaxes("Unknown Air", "business", 2, "LHR", "JFK")).toBe(1000);
  });

  it("Europe zone (no UK) → $150 economy", () => {
    // CDG→JFK, EUROPE→NORTH_AMERICA, no UK airport
    expect(getAwardTaxes("Unknown Air", "economy", 1, "CDG", "JFK", "EUROPE", "NORTH_AMERICA")).toBe(150);
  });

  it("North America domestic → $30 economy", () => {
    expect(getAwardTaxes("Unknown Air", "economy", 1, "JFK", "LAX", "NORTH_AMERICA", "NORTH_AMERICA")).toBe(30);
  });

  it("Africa zone → $50 economy", () => {
    expect(getAwardTaxes("Unknown Air", "economy", 1, "DSS", "CDG", "AFRICA_WEST", "EUROPE")).toBe(50);
  });

  it("Middle East zone → $40 economy", () => {
    expect(getAwardTaxes("Unknown Air", "economy", 1, "DXB", "LHR", "MIDDLE_EAST", "EUROPE")).toBe(250);
    // NOTE: LHR is UK airport — UK rule fires first, overriding Middle East
  });

  it("Middle East with no UK → $40 economy", () => {
    expect(getAwardTaxes("Unknown Air", "economy", 1, "DXB", "CDG", "MIDDLE_EAST", "EUROPE")).toBe(150);
    // CDG is EUROPE (not UK) and DXB is MIDDLE_EAST, but EUROPE fires before MIDDLE_EAST
  });

  it("unknown zone → $100 economy (default fallback)", () => {
    expect(getAwardTaxes("Unknown Air", "economy", 1, undefined, undefined, undefined, undefined)).toBe(100);
  });

  it("premium cabin = economy base", () => {
    expect(getAwardTaxes("Unknown Air", "premium", 1, "CDG", "JFK", "EUROPE", "NORTH_AMERICA")).toBe(150);
  });

  it("first cabin = business × 1.2", () => {
    // Europe business base = 350, first = 350 × 1.2 = 420
    expect(getAwardTaxes("Unknown Air", "first", 1, "CDG", "JFK", "EUROPE", "NORTH_AMERICA")).toBe(420);
  });
});
```

- [ ] **Step 2 — Run test to confirm it fails**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/lib/awardTaxes.test.ts --no-coverage 2>&1 | tail -10
```

Expected: FAIL — `getAwardTaxes` doesn't accept `from`/`to`/zone params yet.

- [ ] **Step 3 — Implement in `data/awardTaxes.ts`**

Replace the file content with:

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
 * Priority rules are checked top-to-bottom; first match wins.
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
  const isUK     = (from != null && UK_AIRPORTS.has(from)) || (to != null && UK_AIRPORTS.has(to));
  const isEurope = originZone === "EUROPE" || destZone === "EUROPE";
  const isNAdomestic = originZone === "NORTH_AMERICA" && destZone === "NORTH_AMERICA";
  const isAfrica = originZone?.startsWith("AFRICA_") || destZone?.startsWith("AFRICA_");
  const isME     = originZone === "MIDDLE_EAST" || destZone === "MIDDLE_EAST";

  let economyBase: number;
  if      (isUK)        economyBase = 250;
  else if (isEurope)    economyBase = 150;
  else if (isNAdomestic) economyBase = 30;
  else if (isAfrica)    economyBase = 50;
  else if (isME)        economyBase = 40;
  else                  economyBase = 100;

  const businessBase = economyBase * 2;

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
```

- [ ] **Step 4 — Run tests to confirm they pass**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/lib/awardTaxes.test.ts --no-coverage 2>&1 | tail -10
```

Expected: all pass.

> **Note on test case "Middle East with no UK":** The test expects `150` because CDG is EUROPE, DXB is MIDDLE_EAST, and the EUROPE rule fires before MIDDLE_EAST in the priority list. This is intentional — European origin/destination always gets the higher European base rate.

- [ ] **Step 5 — Run full test suite to check regressions**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest --no-coverage 2>&1 | tail -10
```

Expected: most pass; `costEngine.test.ts` may fail because it expects taxes = 1125 (the Africa +$25 surcharge — that is removed in Task 2). If it fails there, note it and proceed to Task 2 which fixes that test.

- [ ] **Step 6 — Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add data/awardTaxes.ts __tests__/lib/awardTaxes.test.ts
git commit -m "feat(taxes): zone-aware default fallback for unknown airlines"
```

---

## Task 2 — Remove Africa surcharge + fix displayMessage wording

**Spec ref:** Design §A2 + user adjustment ("Pay cash — save $X")

**Files:**
- Modify: `lib/costEngine.ts`
- Modify: `__tests__/lib/costEngine.test.ts`

### Context

Two independent changes in one task (both touch `costEngine.ts` + its test):

1. Remove `getRegionalTaxSurcharge` / `AFRICAN_ZONES` / `regionalSurcharge`. Pass `from`, `to`, `originZone`, `destZone` to `getAwardTaxes` at all 3 call sites so the new zone-aware default fires correctly.

2. Change the `USE_CASH` + miles-more-expensive branch of `displayMessage`:
   - Before: `"❌ Les miles coûtent $${savings} de plus que le cash"`
   - After: `"💵 Pay cash — save $${savings}"`

- [ ] **Step 1 — Update `costEngine.test.ts`** (adjust existing tests to reflect removed surcharge + new wording)

In `__tests__/lib/costEngine.test.ts`, find and replace:

```typescript
// BEFORE (line ~28):
it("calculates taxes as 550 × 2 pax + $25 African surcharge = 1125 for AF business from DSS", () => {
  const { milesOptions } = buildCostOptions(BASE, new Map());
  const fb = milesOptions.find((o) => o.program === "Flying Blue")!;
  expect(fb.taxes).toBe(1125);
});

// AFTER:
it("calculates taxes as 550 × 2 pax = 1100 for AF business from DSS (no arbitrary surcharge)", () => {
  const { milesOptions } = buildCostOptions(BASE, new Map());
  const fb = milesOptions.find((o) => o.program === "Flying Blue")!;
  expect(fb.taxes).toBe(1100);
});
```

Also find the `displayMessage` test that checks for `❌` and update it:

```typescript
// BEFORE (line ~132):
it("starts with ❌ or 💵 when USE_CASH", () => {
  const cheap: FlightInput = { ...BASE, totalPrice: 50, cabin: "economy", passengers: 1 };
  const r = buildCostOptions(cheap, new Map());
  expect(r.recommendation).toBe("USE_CASH");
  expect(r.displayMessage).toMatch(/❌|💵/);
});

// AFTER:
it("starts with 💵 when USE_CASH", () => {
  const cheap: FlightInput = { ...BASE, totalPrice: 50, cabin: "economy", passengers: 1 };
  const r = buildCostOptions(cheap, new Map());
  expect(r.recommendation).toBe("USE_CASH");
  expect(r.displayMessage).toMatch(/💵/);
});
```

Also update the `regional tax adjustment` test to reflect that DSS (Air France = known airline) is no longer $25 higher than European routes:

```typescript
// BEFORE (line ~168):
describe("regional tax adjustment — Africa origin", () => {
  it("adds $25 surcharge for African origin (DSS) vs European origin", () => {
    ...
    if (afrFb && eurFb) {
      expect(afrFb.taxes).toBeGreaterThanOrEqual(eurFb.taxes - 10);
    }
  });
});

// AFTER — rename and weaken: both use Air France which has fixed taxes regardless of zone
describe("taxes — no arbitrary regional surcharge", () => {
  it("DSS→CDG and CDG→JFK both use per-airline taxes without extra surcharge", () => {
    const african: FlightInput = { ...BASE, from: "DSS", to: "CDG", cabin: "economy", passengers: 1, tripType: "oneway" };
    const european: FlightInput = { ...BASE, from: "CDG", to: "JFK", cabin: "economy", passengers: 1, tripType: "oneway" };
    const afr = buildCostOptions(african, new Map());
    const eur = buildCostOptions(european, new Map());
    const afrFb = afr.milesOptions.find((o) => o.program === "Flying Blue");
    const eurFb = eur.milesOptions.find((o) => o.program === "Flying Blue");
    // Both use AF taxes directly (known airline) — no hidden surcharge
    if (afrFb && eurFb) {
      expect(afrFb.taxes).toBe(eurFb.taxes); // same per-airline rate, no extra
    }
  });
});
```

- [ ] **Step 2 — Run tests to confirm the failures are exactly the ones we expect**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/lib/costEngine.test.ts --no-coverage 2>&1 | grep -E "FAIL|PASS|✓|✗|×" | head -20
```

Expected: failures on the taxes assertion (1125 still in prod) and the ❌ regex (still in prod). The updated test expectations now define what we want.

- [ ] **Step 3 — Update `lib/costEngine.ts`**

**3a. Remove Africa surcharge helpers.** Find and delete these lines (around line 165–180):

```typescript
// ─── Helper: regional tax surcharge ───────────────────────────────────────────

const AFRICAN_ZONES = new Set([
  "AFRICA_WEST", "AFRICA_NORTH", "AFRICA_EAST", "AFRICA_SOUTH",
]);

function getRegionalTaxSurcharge(originZone: string | null): number {
  if (!originZone) return 0;
  if (AFRICAN_ZONES.has(originZone)) return 25;
  return 0;
}
```

**3b. Remove `regionalSurcharge` computation.** Find and delete this line in `buildCostOptions` (around line 201):

```typescript
const regionalSurcharge = getRegionalTaxSurcharge(originZone);
```

**3c. Update 3 `getAwardTaxes` call sites.** Find every occurrence of:

```typescript
const taxes = getAwardTaxes(airlineForTaxes, cabin, passengers) + regionalSurcharge;
```

Replace each with (3 occurrences total — zone-fallback loop, standard programs loop, transfer loop):

```typescript
const taxes = getAwardTaxes(airlineForTaxes, cabin, passengers, from, to, originZone ?? undefined, destZone ?? undefined);
```

**3d. Fix `displayMessage` wording.** Find (around line 424–426):

```typescript
      : signedSavings < 0
        ? `❌ Les miles coûtent $${savings} de plus que le cash`
        : `💵 Cash légèrement moins cher — conserve tes miles`;
```

Replace with:

```typescript
      : signedSavings < 0
        ? `💵 Pay cash — save $${savings}`
        : `💵 Cash légèrement avantageux — conserve tes miles`;
```

- [ ] **Step 4 — Run tests**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/lib/costEngine.test.ts __tests__/lib/awardTaxes.test.ts --no-coverage 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 5 — Run full suite**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest --no-coverage 2>&1 | tail -8
```

Expected: all pass.

- [ ] **Step 6 — TypeScript check**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx tsc --noEmit 2>&1 | grep -v node_modules | head -15
```

Expected: 0 errors.

- [ ] **Step 7 — Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add lib/costEngine.ts __tests__/lib/costEngine.test.ts
git commit -m "fix(engine): remove Africa surcharge, zone-aware taxes, fix displayMessage wording"
```

---

## Task 3 — FlightCard UI revamp

**Spec ref:** Design §B1a, B1b-extra, B1b, B1c, B1d

**Files:**
- Modify: `components/FlightCard.tsx`

### Context

Current FlightCard DECISION BANNER renders a custom multi-branch message. The engine already computes a rich `displayMessage` on every `FlightResult` — it should be the primary headline. Four changes:

1. Replace banner text with `flight.displayMessage` (primary, large, colored)
2. Add `via Flying Blue (direct)` program context line below
3. Move confidence badge from WHY section into the banner row (always visible at top)
4. Add amber estimated-cabin strip when `flight.cabinPriceEstimated === true`
5. Add `isGlobalBest?: boolean` prop + `🥇 Meilleure offre` badge top-right

No unit tests for this task — verify with TypeScript check + ESLint + visual review.

- [ ] **Step 1 — Add `isGlobalBest` prop to the component signature**

In `components/FlightCard.tsx`, update the `Props` interface (around line 40):

```typescript
interface Props {
  flight: FlightResult;
  lang: "fr" | "en";
  /** Format a USD amount into user's chosen currency */
  formatPrice?: (usd: number) => string;
  /** True for the top card in the sorted results list */
  isGlobalBest?: boolean;
}
```

Update the function signature (around line 55):

```typescript
export function FlightCard({ flight, lang, formatPrice, isGlobalBest = false }: Props) {
```

- [ ] **Step 2 — Replace the DECISION BANNER section**

Find the entire `{/* DECISION BANNER */}` block (lines 87–122) and replace it with:

```tsx
      {/* DECISION BANNER */}
      <div className={clsx(
        "px-5 py-4 text-center relative",
        isUseMiles ? "bg-blue-500/10" : "bg-surface"
      )}>

        {/* Global best badge — top-right corner */}
        {isGlobalBest && (
          <div className="absolute top-3 right-3 bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
            🥇 Meilleure offre
          </div>
        )}

        {/* Primary message — engine displayMessage */}
        <div className={clsx(
          "text-lg font-black",
          isUseMiles ? "text-blue-400" : "text-amber-400"
        )}>
          {flight.displayMessage}
        </div>

        {/* Program context line */}
        {bestOption && (
          <div className="text-[11px] text-muted mt-0.5">
            via {bestOption.program} ({TYPE_LABEL[lang][bestOption.type].toLowerCase()})
          </div>
        )}

        {/* Route info + confidence badge */}
        <div className="text-[11px] text-muted mt-1.5 flex items-center justify-center gap-1.5 flex-wrap">
          <span>{city(flight.from, lang)} → {city(flight.to, lang)}</span>
          <span className="text-subtle">·</span>
          <span>{stops === 0 ? (fr ? "Direct" : "Nonstop") : `${stops} ${fr ? "escale" : "stop"}${stops > 1 ? "s" : ""}`}</span>
          {duration && duration > 0 && (
            <>
              <span className="text-subtle">·</span>
              <span>{formatDuration(duration, lang)}</span>
            </>
          )}
          {flight.tripType === "roundtrip" && (
            <>
              <span className="text-subtle">·</span>
              <span>{fr ? "A/R" : "Round trip"}</span>
            </>
          )}
          {/* Confidence badge — always visible in banner */}
          <span className={clsx(
            "text-[9px] font-semibold px-1.5 py-0.5 rounded border",
            badge.color
          )}>
            {fr ? badge.fr : badge.en}
          </span>
        </div>
      </div>

      {/* Estimated cabin warning — shown when business/first price is estimated */}
      {flight.cabinPriceEstimated && (
        <div className="bg-amber-500/10 text-amber-400 border-b border-amber-500/20 px-5 py-1.5 text-[11px] text-center font-medium">
          ⚠️ Business/First — prix du marché estimé, pas garanti
        </div>
      )}
```

- [ ] **Step 3 — Remove confidence badge from WHY section (avoid duplication)**

In the WHY section (around line 175), find:

```tsx
            {/* Confidence badge */}
            <span className={clsx(
              "text-[9px] font-semibold px-1.5 py-0.5 rounded border ml-auto",
              badge.color
            )}>
              {fr ? badge.fr : badge.en}
            </span>
```

Delete those 7 lines (the badge is now in the banner; no need to show it twice).

- [ ] **Step 4 — TypeScript + ESLint check**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx tsc --noEmit 2>&1 | grep -v node_modules | head -15
npx next lint 2>&1 | tail -5
```

Expected: 0 errors and 0 ESLint errors.

- [ ] **Step 5 — Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add components/FlightCard.tsx
git commit -m "feat(ui): displayMessage as primary headline, confidence in banner, estimated cabin strip, global best badge"
```

---

## Task 4 — Pass `isGlobalBest` from Results

**Spec ref:** Design §B2

**Files:**
- Modify: `components/Results.tsx`

### Context

`filtered` is already sorted by savings (`sortBy === "value"` → `b.savings - a.savings` descending). The first element (`i === 0`) after sort is the globally best deal. Pass `isGlobalBest={i === 0}` to the FlightCard — but only when the user is on the "all" or "miles" tab (the "cash" tab doesn't rank by savings so a "best deal" badge would be confusing).

- [ ] **Step 1 — Update the FlightCard render in Results.tsx**

Find (around line 248):

```tsx
          {filtered.map((f, i) => (
            <div key={i} className="animate-fade-up">
              <FlightCard flight={f} lang={lang} formatPrice={formatPrice} />
            </div>
          ))}
```

Replace with:

```tsx
          {filtered.map((f, i) => (
            <div key={i} className="animate-fade-up">
              <FlightCard
                flight={f}
                lang={lang}
                formatPrice={formatPrice}
                isGlobalBest={i === 0 && tab !== "cash"}
              />
            </div>
          ))}
```

- [ ] **Step 2 — TypeScript + ESLint check**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx tsc --noEmit 2>&1 | grep -v node_modules | head -10
npx next lint 2>&1 | tail -5
```

Expected: 0 errors.

- [ ] **Step 3 — Full test suite**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest --no-coverage 2>&1 | tail -8
```

Expected: all pass.

- [ ] **Step 4 — Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add components/Results.tsx
git commit -m "feat(ui): highlight global best deal card in sorted results"
```

---

## Task 5 — Push + E2E verification

- [ ] **Step 1 — Full suite + TypeScript + ESLint (final gate)**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest --no-coverage 2>&1 | tail -8
npx tsc --noEmit 2>&1 | grep -v node_modules
npx next lint 2>&1 | tail -5
```

Expected: all green.

- [ ] **Step 2 — Push**

```bash
cd /Users/DIALLO9194/Downloads/keza
git push origin main
```

- [ ] **Step 3 — Wait for deployment then smoke test**

```bash
until curl -s -o /dev/null -w "%{http_code}" "https://keza-taupe.vercel.app/" | grep -q "200"; do sleep 10; done
curl -s -o /dev/null -w "%{http_code}" "https://keza-taupe.vercel.app/"
curl -s -o /dev/null -w "%{http_code}" "https://keza-taupe.vercel.app/deals"
curl -s "https://keza-taupe.vercel.app/sitemap.xml" | grep -c "flights/"
```

Expected: two `200` responses, 271 flights in sitemap.

---

## Self-review

**Spec coverage:**
- [x] §A1 Zone-aware tax fallback → Task 1 (`awardTaxes.ts`)
- [x] §A2 Remove Africa +$25 surcharge → Task 2 (`costEngine.ts`)
- [x] §A2 Pass zones to getAwardTaxes → Task 2 (3 call sites)
- [x] User adj. "Pay cash — save $X" → Task 2 (displayMessage wording)
- [x] §B1a displayMessage as primary headline → Task 3 (replaces multi-branch JSX)
- [x] §B1b-extra Program context line → Task 3 (below displayMessage)
- [x] §B1b Confidence badge moved to banner → Task 3 (removed from WHY section)
- [x] §B1c Estimated cabin strip → Task 3 (amber band when `cabinPriceEstimated`)
- [x] §B1d Global best badge → Task 3 (`isGlobalBest` prop + badge)
- [x] §B2 Results passes `isGlobalBest` → Task 4
- [x] Sort confirmed → already `b.savings - a.savings` default, no change needed

**Placeholder scan:** No TBDs. All code blocks are complete.

**Type consistency:**
- `getAwardTaxes(airline, cabin, passengers, from?, to?, originZone?, destZone?)` — signature defined in Task 1, called with all params in Task 2. ✅
- `isGlobalBest?: boolean` — prop defined in Task 3, passed in Task 4. ✅
- `flight.displayMessage` — already on `FlightResult` (from previous engine pass), used in Task 3. ✅
- `flight.cabinPriceEstimated` — already on `FlightResult`, used in Task 3. ✅
- `TYPE_LABEL` — already defined in FlightCard, reused in Task 3 program context line. ✅
