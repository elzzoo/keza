# Business/First Comparator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user searches in Business or First cabin, enrich the results with a "BEST J" badge on the winning program, a chips row of all other programs, "vs Business cash" savings framing, and a contextual banner in Results.

**Architecture:** 100% client-side, zero server changes. `flight.cabin` is already on `FlightResult`; `flight.cashCost` already uses the Business multiplier; `flight.savings` is already the correct delta. We add a `lib/businessMode.ts` helper with testable pure functions, then use those in the two modified components.

**Tech Stack:** Next.js 14 App Router · TypeScript strict · Tailwind CSS · Jest + ts-jest (node env, `.test.ts` files only — no jsdom)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `lib/businessMode.ts` | **Create** | Pure helpers: `isBusinessMode`, `HIGH_TAXES_THRESHOLD_USD`, `buildBusinessChips` |
| `__tests__/lib/businessMode.test.ts` | **Create** | Unit tests for the helpers above |
| `components/FlightCard.tsx` | **Modify** | BEST J badge · "Business cash" label · savings framing · chips row · hide alt button |
| `components/Results.tsx` | **Modify** | Business mode banner + i18n strings |

---

## Task 1 — Pure helpers + tests (TDD first)

**Files:**
- Create: `lib/businessMode.ts`
- Create: `__tests__/lib/businessMode.test.ts`

---

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/businessMode.test.ts`:

```typescript
import {
  isBusinessMode,
  HIGH_TAXES_THRESHOLD_USD,
  buildBusinessChips,
} from "@/lib/businessMode";
import type { MilesOption } from "@/lib/costEngine";

// ── fixture helper ────────────────────────────────────────────────────────────
function makeOpt(
  program: string,
  milesRequired: number,
  taxes: number,
  isBestDeal = false
): MilesOption {
  return {
    type: "DIRECT",
    program,
    operatingAirline: "AF",
    milesRequired,
    taxes,
    valuePerMile: 1.5,
    milesCost: (milesRequired * 1.5) / 100,
    totalMilesCost: (milesRequired * 1.5) / 100 + taxes,
    savings: 0,
    confidence: "LOW",
    explanation: `${program} · ${milesRequired} miles + $${taxes}`,
    isBestDeal,
    chartSource: "REAL",
  } as MilesOption;
}

// ── isBusinessMode ────────────────────────────────────────────────────────────
describe("isBusinessMode", () => {
  it("returns true for business", () => {
    expect(isBusinessMode("business")).toBe(true);
  });

  it("returns true for first", () => {
    expect(isBusinessMode("first")).toBe(true);
  });

  it("returns false for economy", () => {
    expect(isBusinessMode("economy")).toBe(false);
  });

  it("returns false for premium", () => {
    expect(isBusinessMode("premium")).toBe(false);
  });
});

// ── HIGH_TAXES_THRESHOLD_USD ──────────────────────────────────────────────────
describe("HIGH_TAXES_THRESHOLD_USD", () => {
  it("is 300", () => {
    expect(HIGH_TAXES_THRESHOLD_USD).toBe(300);
  });
});

// ── buildBusinessChips ────────────────────────────────────────────────────────
describe("buildBusinessChips", () => {
  it("formats label as 'Program XK'", () => {
    const chips = buildBusinessChips([makeOpt("Flying Blue", 72_000, 50)]);
    expect(chips[0].label).toBe("Flying Blue 72K");
  });

  it("rounds miles to nearest K", () => {
    const chips = buildBusinessChips([makeOpt("Avios", 67_500, 50)]);
    expect(chips[0].label).toBe("Avios 68K");
  });

  it("sets highTaxes = false when taxes <= 300", () => {
    const chips = buildBusinessChips([makeOpt("Flying Blue", 72_000, 300)]);
    expect(chips[0].highTaxes).toBe(false);
  });

  it("sets highTaxes = true when taxes > 300", () => {
    const chips = buildBusinessChips([makeOpt("Miles&Smiles", 45_000, 680)]);
    expect(chips[0].highTaxes).toBe(true);
  });

  it("returns empty array for empty input", () => {
    expect(buildBusinessChips([])).toEqual([]);
  });

  it("processes multiple alternatives", () => {
    const chips = buildBusinessChips([
      makeOpt("Flying Blue", 72_000, 400),
      makeOpt("Avios", 85_000, 150),
    ]);
    expect(chips).toHaveLength(2);
    expect(chips[0].label).toBe("Flying Blue 72K");
    expect(chips[0].highTaxes).toBe(true);
    expect(chips[1].label).toBe("Avios 85K");
    expect(chips[1].highTaxes).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/lib/businessMode.test.ts --no-coverage 2>&1 | tail -10
```

Expected: `Cannot find module '@/lib/businessMode'`

- [ ] **Step 3: Create `lib/businessMode.ts`**

```typescript
import type { MilesOption } from "@/lib/costEngine";

/** Taxes threshold (USD) above which a chip shows a high-taxes warning (`*`). */
export const HIGH_TAXES_THRESHOLD_USD = 300;

/**
 * Returns true when the cabin warrants Business/First mode UI enrichment.
 * First-class uses Business award rates in the engine, so both are treated identically.
 */
export function isBusinessMode(cabin: string): boolean {
  return cabin === "business" || cabin === "first";
}

export interface BusinessChip {
  /** Display label: "{Program} {roundedK}K" e.g. "Flying Blue 72K" */
  label: string;
  /** True when taxes > HIGH_TAXES_THRESHOLD_USD — triggers `*` footnote */
  highTaxes: boolean;
}

/**
 * Converts a list of alternative MilesOptions into chip display data.
 * Caller is responsible for filtering out the bestOption before passing.
 */
export function buildBusinessChips(alternatives: MilesOption[]): BusinessChip[] {
  return alternatives.map((opt) => ({
    label: `${opt.program} ${Math.round(opt.milesRequired / 1_000)}K`,
    highTaxes: opt.taxes > HIGH_TAXES_THRESHOLD_USD,
  }));
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx jest __tests__/lib/businessMode.test.ts --no-coverage 2>&1 | tail -10
```

Expected: `Tests: 10 passed, 10 total`

- [ ] **Step 5: Commit**

```bash
git add lib/businessMode.ts __tests__/lib/businessMode.test.ts
git commit -m "feat: add businessMode helpers (isBusinessMode, buildBusinessChips)"
```

---

## Task 2 — FlightCard: BEST J badge + "Business cash" label + savings framing

**Files:**
- Modify: `components/FlightCard.tsx`

Key areas touched (read the file before editing):
- **Line 2** (imports): add import of helpers
- **After line 72** (`isNearParity`): add `isBusinessMode` local const
- **Lines 118–126** (decision banner USE_MILES text): add "vs Business cash" framing
- **Line 215–217** (Cash tile label): change "Cash" → "Business cash" in business mode
- **Lines 261–263** (program name in WHY SECTION): add BEST J badge after program name

---

- [ ] **Step 1: Add import at top of FlightCard.tsx**

After line 8 (`import { getOrAssignVariant, CTA_COPY } from "@/lib/abtest";`), add:

```typescript
import { isBusinessMode as checkBusinessMode, HIGH_TAXES_THRESHOLD_USD, buildBusinessChips } from "@/lib/businessMode";
```

- [ ] **Step 2: Add `isBusinessMode` local constant**

After line 72 (`const isNearParity = savingsRatio < 0.05 && bestOption !== null;`), add:

```typescript
  const isBusinessMode = checkBusinessMode(flight.cabin);
```

- [ ] **Step 3: Update savings framing in decision banner**

Find this block (lines ~118–126):
```typescript
              ? (fr
                  ? `🔥 Tu économises ${fmt(flight.savings)} avec les miles`
                  : `🔥 You save ${fmt(flight.savings)} with miles`)
```

Replace with:
```typescript
              ? (fr
                  ? `🔥 Tu économises ${fmt(flight.savings)}${isBusinessMode ? " vs Business cash" : " avec les miles"}`
                  : `🔥 You save ${fmt(flight.savings)}${isBusinessMode ? " vs Business cash" : " with miles"}`)
```

- [ ] **Step 4: Update Cash tile label**

Find (lines ~215–217):
```tsx
          <div className="text-[10px] text-muted uppercase tracking-widest mt-1 font-bold">
            Cash
          </div>
```

Replace with:
```tsx
          <div className="text-[10px] text-muted uppercase tracking-widest mt-1 font-bold">
            {isBusinessMode ? "Business cash" : "Cash"}
          </div>
```

- [ ] **Step 5: Add BEST J badge after program name**

Find (lines ~261–263, inside the WHY SECTION):
```tsx
            <span className="text-[12px] font-bold text-fg">
              {bestOption.program}
            </span>
```

Replace with:
```tsx
            <span className="text-[12px] font-bold text-fg">
              {bestOption.program}
            </span>
            {isBusinessMode && (
              <span className="text-[8px] font-bold bg-primary/30 text-blue-300 rounded px-1.5 py-0.5">
                BEST J
              </span>
            )}
```

- [ ] **Step 6: Run full test suite — no regressions**

```bash
npx jest --no-coverage 2>&1 | tail -15
```

Expected: all previously passing tests still pass.

- [ ] **Step 7: Commit**

```bash
git add components/FlightCard.tsx
git commit -m "feat(FlightCard): add BEST J badge, Business cash label, savings framing for Business/First mode"
```

---

## Task 3 — FlightCard: program chips row + hide alt button in business mode

**Files:**
- Modify: `components/FlightCard.tsx`

---

- [ ] **Step 1: Add chips row between WHY SECTION and ALTERNATIVES**

The WHY SECTION ends at the closing `</div>` of `{bestOption && (...)}` (around line 274).
The ALTERNATIVES section starts at `{/* ALTERNATIVES */}` (around line 276).

Insert this block between them:

```tsx
      {/* BUSINESS MODE — program chips */}
      {isBusinessMode && alternatives.length > 0 && (
        <div className="px-5 py-2.5 border-t border-border">
          <div className="text-[9px] text-muted/60 uppercase tracking-widest mb-2">
            {fr ? "Autres programmes" : "Other programs"}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {buildBusinessChips(alternatives).map((chip, i) => (
              <span
                key={i}
                className="text-[10px] px-2.5 py-1 bg-surface-2 border border-border rounded-full text-muted"
              >
                {chip.label}{chip.highTaxes ? "*" : ""}
              </span>
            ))}
            <button
              onClick={() => setShowAlts(v => !v)}
              className="text-[10px] text-primary hover:text-primary-hover transition-colors font-medium"
            >
              {fr ? "Voir tous" : "See all"} →
            </button>
          </div>
          {buildBusinessChips(alternatives).some(c => c.highTaxes) && (
            <div className="text-[9px] text-muted/40 mt-1.5">
              * {fr ? "taxes élevées" : "high taxes"}
            </div>
          )}
        </div>
      )}
```

- [ ] **Step 2: Hide the existing alternatives toggle button in business mode**

Find the ALTERNATIVES section opening (around line 276):
```tsx
      {alternatives.length > 0 && (
        <div className="border-t border-border">
          <button
            onClick={() => setShowAlts(v => !v)}
            className="w-full px-5 py-2.5 flex items-center justify-between text-[11px] text-muted hover:text-fg transition-colors"
          >
            <span>{fr ? `${alternatives.length} autre${alternatives.length > 1 ? "s" : ""} option${alternatives.length > 1 ? "s" : ""}` : `${alternatives.length} more option${alternatives.length > 1 ? "s" : ""}`}</span>
            <span className="text-subtle">{showAlts ? "▲" : "▼"}</span>
          </button>
```

Replace with (wrap button in `{!isBusinessMode && (...)}` — the expanded content below stays unchanged):
```tsx
      {alternatives.length > 0 && (
        <div className="border-t border-border">
          {/* Toggle button hidden in Business mode — the chips row handles expand there */}
          {!isBusinessMode && (
            <button
              onClick={() => setShowAlts(v => !v)}
              className="w-full px-5 py-2.5 flex items-center justify-between text-[11px] text-muted hover:text-fg transition-colors"
            >
              <span>{fr ? `${alternatives.length} autre${alternatives.length > 1 ? "s" : ""} option${alternatives.length > 1 ? "s" : ""}` : `${alternatives.length} more option${alternatives.length > 1 ? "s" : ""}`}</span>
              <span className="text-subtle">{showAlts ? "▲" : "▼"}</span>
            </button>
          )}
```

- [ ] **Step 3: Run full test suite**

```bash
npx jest --no-coverage 2>&1 | tail -15
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/FlightCard.tsx
git commit -m "feat(FlightCard): add program chips row for Business/First mode"
```

---

## Task 4 — Results.tsx: Business mode banner + i18n

**Files:**
- Modify: `components/Results.tsx`

---

- [ ] **Step 1: Add strings to the L object**

In `components/Results.tsx`, find the `const L = {` block.

In the `fr` section (after `loading: "Recherche en cours…",`), add:
```typescript
    businessBannerTitle: "Mode Business — comparaison vs prix Business cash",
    businessBannerDesc: "Les miles en Business offrent souvent 5–8× plus de valeur qu'en éco · Prix cash estimé (×4 éco)",
```

In the `en` section (after `loading: "Searching…",`), add:
```typescript
    businessBannerTitle: "Business mode — compared against Business cash price",
    businessBannerDesc: "Miles in Business often deliver 5–8× more value than economy · Cash price estimated (×4 eco)",
```

- [ ] **Step 2: Add the banner JSX**

In `components/Results.tsx`, find this line (around line 210):
```tsx
      {/* Card recommendation (transfer savings) */}
      {results.length > 0 && <CardRecommendation results={results} lang={lang} formatPrice={formatPrice} />}
```

Insert this block BEFORE it:
```tsx
      {/* Business/First mode contextual banner */}
      {results.length > 0 && (searchMeta?.cabin === "business" || searchMeta?.cabin === "first") && (
        <div className="flex items-center gap-3 px-4 py-3 bg-primary/10 border border-primary/20 rounded-xl">
          <span className="text-lg flex-shrink-0">✈️</span>
          <div>
            <p className="text-xs font-semibold text-blue-300">{t.businessBannerTitle}</p>
            <p className="text-[11px] text-muted mt-0.5">{t.businessBannerDesc}</p>
          </div>
        </div>
      )}

```

- [ ] **Step 3: Run full test suite — confirm no regressions**

```bash
npx jest --no-coverage 2>&1 | tail -15
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/Results.tsx
git commit -m "feat(Results): add Business/First mode contextual banner"
```

---

## Done — verify the full feature

After all 4 tasks, run:

```bash
npx jest --no-coverage 2>&1 | grep -E "Tests:|Test Suites:"
```

Expected output:
```
Test Suites: X passed, X total
Tests:       Y passed, Y total
```

All tests green. Feature C is complete.
