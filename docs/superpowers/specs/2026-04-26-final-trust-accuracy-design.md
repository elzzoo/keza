# KEZA — Final Trust & Accuracy Pass Design

**Date:** 2026-04-26  
**Scope:** Pre-launch trust pass — clarity, realism, decision quality. No refactor.

---

## Goal

Make KEZA feel reliable and understandable in 2 seconds. The user must immediately know: should I pay cash or use miles, and can I trust this number?

---

## Architecture overview

4 files touched. Engine architecture (FETCH → ENRICH → DECIDE) unchanged.

| File | Change |
|------|--------|
| `data/awardTaxes.ts` | Zone-aware default fallback for unknown airlines |
| `lib/costEngine.ts` | Remove +$25 Africa surcharge; pass zones to tax fallback |
| `components/FlightCard.tsx` | displayMessage as primary headline; confidence top; estimated banner; global best badge |
| `components/Results.tsx` | Pass `isGlobalBest` to first card in sorted results |

---

## A — Engine: taxes realism + remove arbitrary Africa surcharge

### A1. `data/awardTaxes.ts`

**Problem:** The `_default` fallback is flat ($120 economy / $250 business) regardless of route. A London→NY route on an unknown carrier gets $120 — should be ~$250+.

**Fix:** Add `getRegionalDefaultTaxes(originZone, destZone, cabin, passengers)`. Used only when airline is not in `AWARD_TAXES` map.

Zone-pair rules (economy base, per person, one-way):

| Zone condition | Economy | Business |
|---------------|---------|----------|
| Either zone is UK (British Isles) | $250 | $500 |
| Either zone is EUROPE | $150 | $350 |
| Both zones are US/Canada (North America domestic) | $30 | $60 |
| Either zone is AFRICA_* | $50 | $100 |
| Either zone is MIDDLE_EAST | $40 | $80 |
| Default (all others) | $100 | $200 |

Rules are checked top-to-bottom, first match wins. Deterministic, no floating-point logic.

Update `getAwardTaxes` signature: accept optional `originZone?: string` and `destZone?: string`. When airline is not found (`AWARD_TAXES[airline]` is undefined), fall through to `getRegionalDefaultTaxes(originZone, destZone, cabin, passengers)` instead of `AWARD_TAXES["_default"]`.

### A2. `lib/costEngine.ts`

**Remove:**
- `getRegionalTaxSurcharge()` function
- `AFRICAN_ZONES` Set
- `const regionalSurcharge = getRegionalTaxSurcharge(originZone)`
- All 3 `+ regionalSurcharge` additions on `getAwardTaxes()` call sites

**Update:** Pass `originZone ?? undefined` and `destZone ?? undefined` to every `getAwardTaxes(...)` call. These are already computed in `buildCostOptions`.

**Rationale:** The +$25 flat surcharge was too arbitrary. The new zone-aware default in `awardTaxes.ts` handles African routes more realistically (African carriers are already in the AWARD_TAXES map with correct values; unknown carriers on African routes now get $50 base instead of $120+$25).

---

## B — UI: display clarity and trust signals

### B1. `components/FlightCard.tsx`

**Four changes:**

#### B1a. `displayMessage` as primary headline (replaces current banner)

The engine computes a contextual message per result. **Update `lib/costEngine.ts` displayMessage logic** to show positive savings framing for both cases:

- USE_MILES → `"🔥 Tu économises $X avec les miles"` (unchanged)
- USE_CASH + miles more expensive (`signedSavings < 0`): **change from** `"❌ Les miles coûtent $X de plus"` **to** `"💵 Cash moins cher — économise $X"` where `$X = savings`
- USE_CASH near-equal (`signedSavings >= 0` but USE_CASH): `"💵 Cash légèrement avantageux — conserve tes miles"` (unchanged)
- No miles available: `"💵 Payez en cash — aucune option miles disponible"` (unchanged)

This ensures both USE_MILES and USE_CASH cases show a positive framing (savings, not losses), avoiding bias toward either option.

In `FlightCard.tsx`, replace the current multi-branch JSX in the DECISION BANNER with a single line rendering `flight.displayMessage` as the primary large text. Color:
- USE_MILES → `text-blue-400`
- USE_CASH → `text-amber-400` (warning)

Remove the `fr ? ... : ...` i18n branch on this element — emoji + dollar amount is language-neutral. French text is acceptable pre-launch.

#### B1b-extra. Program context line

Directly under the `displayMessage` headline, add a single line:

```
via Flying Blue (direct)
```

Rendered as: `bestOption ? \`via ${bestOption.program} (${TYPE_LABEL[lang][bestOption.type].toLowerCase()})\` : ""`

Styled: `text-[11px] text-muted mt-0.5`

Only shown when `bestOption` exists.

#### B1b. Confidence badge moved to top

Currently the confidence badge is in the WHY section (only visible if there's a bestOption, requires reading down). 

Move it to the DECISION BANNER row, displayed inline after the displayMessage. Small badge, always visible at the top of the card:
- HIGH → green `"Prix confirmé"` / `"Confirmed"`
- MEDIUM → blue `"Bonne est."` / `"Est."`  
- LOW → amber `"Estimation"` / `"Est."`

Use the existing `CONFIDENCE_BADGE` constant — just render it in the banner area instead of (or in addition to) the WHY section.

#### B1c. Estimated cabin warning banner

When `flight.cabinPriceEstimated === true`, show a narrow amber strip under the decision banner:

```
⚠️ Business/First — prix du marché estimé, pas garanti
```

Styled: `bg-amber-500/10 text-amber-400 border-b border-amber-500/20 px-5 py-1.5 text-[11px] text-center`

This is the existing `cabinPriceEstimated` flag already on every FlightResult — zero engine change needed.

#### B1d. Global best badge

Add `isGlobalBest?: boolean` prop to `FlightCard`.

When `isGlobalBest === true`, show a small badge in the top-right corner of the card (absolute positioned):

```
🥇 Meilleure offre
```

Styled: `absolute top-3 right-3 bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30`

### B2. `components/Results.tsx`

When mapping over `filtered` (already sorted by savings by default), pass `isGlobalBest={idx === 0}` to the first `FlightCard` only when `tab !== "cash"` (best deal only makes sense in miles context).

Verify the `sortBy === "value"` default is applied before the map (it already is in the `useMemo` — no change needed, just confirm).

---

## What does NOT change

- Engine architecture (FETCH → ENRICH → DECIDE) — untouched
- Award charts, zone logic, haversine, dynamic award engine — untouched
- Miles valuation (contextual) — untouched
- isBestDeal, explanation, disclaimer — computed, not removed
- Sort order — already savings-first by default ✅
- Confidence badge in WHY section — kept (now also in banner)
- Negative case display — already handled by displayMessage ✅

---

## Self-review

**Placeholder scan:** No TBDs or TODOs.

**Internal consistency:** 
- `getRegionalDefaultTaxes` is used only as fallback for unknown airlines in `getAwardTaxes` — consistent with existing behavior for known airlines.
- `displayMessage` is already on `FlightResult` (propagated from costEngine via engine.ts) — no new engine fields needed.
- `cabinPriceEstimated` is already on `FlightResult` — no new engine fields needed.
- `isGlobalBest` is a UI-only prop, not stored in engine state — correct.

**Scope check:** 4 files, focused. No new API routes, no Redis changes, no cron changes.

**Ambiguity check:**
- "UK zone" — defined as: either `from` or `to` airport is in the UK. Since we use zone strings, UK airports are in EUROPE zone. Add a separate UK check using a known UK airport set OR use the operating airline heuristic. **Decision:** Use a `UK_AIRPORTS` constant (LHR, LGW, LCY, MAN, EDI, BHX, STN, GLA) checked against `from`/`to` before zone lookup. First match wins.
- `isGlobalBest` on cash-only tab: pass `false` so no badge shows. Covered above.
