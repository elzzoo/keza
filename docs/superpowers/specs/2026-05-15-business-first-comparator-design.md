# Business/First Comparator — Design Spec

**Date:** 2026-05-15
**Status:** Approved

---

## Goal

When a user searches in Business or First cabin, automatically enrich the results to show:
1. The **true savings** vs Business cash price (not economy)
2. The **best program** for that flight in J class, with a `BEST J` badge
3. **Chips** showing all other available programs
4. A **contextual banner** explaining why miles shine in Business

No server changes. No new routes. Pure UI enrichment on existing data.

---

## Architecture

**100% client-side.** All data needed is already present in `FlightResult`:

| Field | Usage |
|-------|-------|
| `flight.cabin` | Detect Business/First mode (`"business"` \| `"first"`) |
| `flight.cashCost` | Already = Business price (economy × 4 multiplier) |
| `flight.savings` | Already = `cashCost − milesCost` → correct baseline |
| `flight.bestOption` (`isBestDeal: true`) | Best program to highlight |
| `flight.milesOptions` | Full ranked program list for chips |
| `flight.cabinPriceEstimated` | Already `true` for Business — existing warning retained |

**Detection constant:**
```typescript
const isBusinessMode = flight.cabin === "business" || flight.cabin === "first";
```

### Zero server changes
No modifications to `app/api/`, `lib/engine.ts`, `lib/costEngine.ts`, or Redis.

---

## Files Modified (2)

| File | Change |
|------|--------|
| `components/FlightCard.tsx` | Business mode: `BEST J` badge, program chips row, savings framing |
| `components/Results.tsx` | Contextual banner when `searchMeta.cabin === "business" \| "first"` |

### Files Created: 0

---

## FlightCard.tsx Changes

### 1. `isBusinessMode` flag
```typescript
const isBusinessMode = flight.cabin === "business" || flight.cabin === "first";
```
Used as a gate for all 3 new UI elements below.

### 2. `BEST J` badge on the winning program tile
Inside the miles tile (where `bestOption.program` is displayed), when `isBusinessMode`:
```tsx
{isBusinessMode && (
  <span className="text-[8px] font-bold bg-primary/30 text-primary-light rounded px-1.5 py-0.5 ml-1">
    BEST J
  </span>
)}
```

### 3. Savings framing — "vs Business cash"
The savings footer line changes label when in Business mode:

| Mode | FR label | EN label |
|------|----------|----------|
| Economy/Premium | existing copy | existing copy |
| Business/First | `"vs Business cash estimé"` | `"vs estimated Business cash"` |

### 4. Program chips row (new section)
Rendered **below** the cash/miles tiles, only when `isBusinessMode && alternatives.length > 0`.

`alternatives` is already computed: `flight.milesOptions.filter(o => !o.isBestDeal).slice(0, 3)`.

Layout:
```
Autres programmes   [Miles&Smiles 45K*]  [Avios 85K]  Voir tous →
```

- Each chip shows: `{program} {milesRequired / 1000}K`
- If a program has notably high taxes (`option.taxesUSD > 300`): append `*` + footnote `"* taxes élevées / high taxes"`
- "Voir tous →" toggles `showAlts` (existing state) — reuses the existing alternatives expand
- If `alternatives.length === 0`: entire chips row hidden (single-program result)

**FR/EN strings added to `L` object in FlightCard:**
```typescript
businessSavingsLabel: { fr: "vs Business cash estimé",  en: "vs estimated Business cash" },
otherPrograms:        { fr: "Autres programmes",         en: "Other programs" },
seeAll:               { fr: "Voir tous",                 en: "See all" },
highTaxesNote:        { fr: "taxes élevées",             en: "high taxes" },
```

Note: the `BEST J` badge text is hardcoded (universal abbreviation, no translation needed).

---

## Results.tsx Changes

### Contextual banner
Rendered at the top of the results list (before `<CardRecommendation>`) when:
```typescript
searchMeta?.cabin === "business" || searchMeta?.cabin === "first"
```

`searchMeta` already carries `{ from, to, cabin }` — no prop changes needed.

```tsx
{(searchMeta?.cabin === "business" || searchMeta?.cabin === "first") && (
  <div className="flex items-center gap-3 px-4 py-3 bg-primary/8 border border-primary/20 rounded-xl text-sm">
    <span className="text-lg">✈️</span>
    <div>
      <p className="font-semibold text-primary-light text-xs">
        {fr ? "Mode Business — comparaison vs prix Business cash"
             : "Business mode — compared against Business cash price"}
      </p>
      <p className="text-muted text-xs mt-0.5">
        {fr ? "Les miles en Business offrent souvent 5–8× plus de valeur qu'en éco · Prix cash estimé (×4 éco)"
             : "Miles in Business often deliver 5–8× more value than economy · Cash price estimated (×4 eco)"}
      </p>
    </div>
  </div>
)}
```

**FR/EN strings added to `L` object in Results.tsx:**
```typescript
businessBannerTitle: {
  fr: "Mode Business — comparaison vs prix Business cash",
  en: "Business mode — compared against Business cash price",
},
businessBannerDesc: {
  fr: "Les miles en Business offrent souvent 5–8× plus de valeur qu'en éco · Prix cash estimé (×4 éco)",
  en: "Miles in Business often deliver 5–8× more value than economy · Cash price estimated (×4 eco)",
},
```

---

## Edge Cases

| Case | Behaviour |
|------|-----------|
| `isBusinessMode = false` (economy/premium) | No changes — card looks exactly like today |
| First class cabin | `isBusinessMode = true` (First uses Business award rates — already handled in engine) |
| `alternatives.length === 0` | Chips row hidden entirely |
| `cabinPriceEstimated: true` | Existing warning `"⚠️ Business/First — prix estimé"` retained as-is |
| Only 1 `milesOption` total | `bestOption` shown with `BEST J` badge, no chips row |
| Miles savings negative vs Business cash | `recommendation === "USE_CASH"` — savings framing label still updates to "vs Business cash"; decision banner unchanged |

---

## Tests

### File: `__tests__/components/FlightCard.business.test.tsx`

Coverage:
- `isBusinessMode = true` when `cabin === "business"` → `BEST J` badge renders
- `isBusinessMode = true` when `cabin === "first"` → `BEST J` badge renders
- `isBusinessMode = false` when `cabin === "economy"` → no badge, no chips
- chips row renders when `alternatives.length > 0` in Business mode
- chips row hidden when `alternatives.length === 0`
- high-taxes footnote (`*`) appears when `option.taxesUSD > 300`
- savings label shows "vs Business cash estimé" in FR
- savings label shows "vs estimated Business cash" in EN

### File: `__tests__/components/Results.business.test.tsx`

Coverage:
- banner renders when `searchMeta.cabin === "business"`
- banner renders when `searchMeta.cabin === "first"`
- banner absent when `searchMeta.cabin === "economy"`
- banner absent when `searchMeta` is undefined

---

## Out of Scope (V2)

- Real Business cash prices from Duffel (would remove `cabinPriceEstimated` flag)
- Seat availability for award Business redemptions
- Upgrade redemption scenarios (eco → business partial miles)
- Dedicated `/business` route or standalone Business mode page
- "Price alert in Business" feature
