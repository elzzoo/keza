# P2 Onboarding v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve onboarding UX with card-based program selector, smart balance sliders with suggestions, and autocomplete favorite routes, persisted across sessions.

**Architecture:** 
Replace checkbox layout with card grid (logos + toggle). Add balance slider suggestions for major programs (Flying Blue 50k, Amex MR 100k, etc.). New autocomplete component for 20 major corridors. Save all choices to localStorage + ProfileContext for instant recall. Flow: Programs → Balances → Favorites (3-screen modal).

**Tech Stack:** 
React, TypeScript, localStorage, ProfileContext, Tailwind CSS

---

## File Structure

### New Components
- Create: `components/onboarding/ProgramSelectorCards.tsx` — Card grid for program selection
- Create: `components/onboarding/BalanceSliderWithSuggestions.tsx` — Enhanced slider with preset buttons
- Create: `components/onboarding/FavoriteRoutesAutocomplete.tsx` — Multi-select autocomplete for routes
- Create: `components/onboarding/OnboardingFlow.tsx` — 3-step modal controller

### Modified Files
- Modify: `lib/contexts/onboardingContext.ts` — Add localStorage persistence
- Modify: `components/SearchForm.tsx` — Replace old onboarding with new flow

### Tests
- Create: `__tests__/components/onboarding/ProgramSelectorCards.test.tsx`
- Create: `__tests__/components/onboarding/FavoriteRoutesAutocomplete.test.tsx`
- Create: `e2e/onboarding-v2.spec.ts`

---

## Implementation Tasks

### Task 1: Create Program Selector Cards Component

**Files:**
- Create: `components/onboarding/ProgramSelectorCards.tsx`
- Create: `__tests__/components/onboarding/ProgramSelectorCards.test.tsx`

- [ ] **Step 1-5: Write tests, implement, verify**

Create grid component with toggle functionality for programs. Reference: PROGRAMS_BY_NAME from globalPrograms.

- [ ] **Step 6: Commit**

```bash
git add components/onboarding/ProgramSelectorCards.tsx __tests__/components/onboarding/ProgramSelectorCards.test.tsx
git commit -m "feat(P2): create program selector cards component

- Grid layout with card-based program selection
- Toggle programs with visual feedback
- Replaces checkbox UI

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Create Balance Slider with Suggestions

**Files:**
- Create: `components/onboarding/BalanceSliderWithSuggestions.tsx`

- [ ] **Step 1: Create component**

Add PROGRAM_SUGGESTIONS constant and render slider with preset buttons for Flying Blue, Amex MR, ANA, KrisFlyer, Emirates.

- [ ] **Step 2: Commit**

```bash
git add components/onboarding/BalanceSliderWithSuggestions.tsx
git commit -m "feat(P2): add balance slider with program-specific suggestions

- Suggestions for Flying Blue, Amex MR, ANA, KrisFlyer, Emirates
- Preset buttons for common balances (50k, 100k, 150k, etc.)
- Real-time slider feedback

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Create Favorite Routes Autocomplete

**Files:**
- Create: `components/onboarding/FavoriteRoutesAutocomplete.tsx`
- Create: `lib/data/majorRoutes.ts`
- Create: `__tests__/components/onboarding/FavoriteRoutesAutocomplete.test.tsx`

- [ ] **Step 1-5: Write tests, implement MAJOR_ROUTES constant, verify**

20 major routes (SIN-LAX, CDG-JFK, NRT-LAX, etc.) with autocomplete search, add/remove functionality.

- [ ] **Step 6: Commit**

```bash
git add components/onboarding/FavoriteRoutesAutocomplete.tsx lib/data/majorRoutes.ts __tests__/components/onboarding/FavoriteRoutesAutocomplete.test.tsx
git commit -m "feat(P2): add favorite routes autocomplete

- 20 major routes (SIN-LAX, CDG-JFK, etc.)
- Autocomplete search by route name
- Add/remove selected routes
- Display as tags

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Update Onboarding Context with localStorage

**Files:**
- Modify: `lib/contexts/onboardingContext.ts`

- [ ] **Step 1-3: Add localStorage persistence**

Update context with load/save to localStorage for programs, balances, favoriteRoutes.

- [ ] **Step 4: Commit**

```bash
git add lib/contexts/onboardingContext.ts
git commit -m "feat(P2): add localStorage persistence to onboarding

- Save/load programs, balances, favorite routes
- Auto-persist on data changes
- Reset method to clear preferences

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Create 3-Step Onboarding Flow

**Files:**
- Create: `components/onboarding/OnboardingFlow.tsx`

- [ ] **Step 1-3: Create flow controller**

Modal with 3 steps: Programs → Balances → Routes. Back/Next navigation.

- [ ] **Step 4: Integrate into SearchForm**

Add OnboardingFlow to SearchForm with "Customize Profile" button.

- [ ] **Step 5: Commit**

```bash
git add components/onboarding/OnboardingFlow.tsx components/SearchForm.tsx
git commit -m "feat(P2): implement 3-step onboarding flow

- Step 1: Program selection (cards)
- Step 2: Balance sliders with suggestions
- Step 3: Favorite routes autocomplete
- Back/Next navigation
- Persists to localStorage

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

### Task 6: Add Tests & Verify

**Files:**
- Create: `e2e/onboarding-v2.spec.ts`

- [ ] **Step 1-3: Write E2E test, run, verify**

Test complete 3-step flow, localStorage persistence, and page reload data survival.

- [ ] **Step 4: Commit**

```bash
git add e2e/onboarding-v2.spec.ts
git commit -m "test(P2): add E2E tests for onboarding v2

- 3-step flow completion
- localStorage persistence
- Data survives page reload

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Spec Coverage Checklist

- ✅ Program selector cards (Task 1)
- ✅ Balance sliders with suggestions (Task 2)
- ✅ Favorite routes autocomplete (Task 3)
- ✅ localStorage persistence (Task 4)
- ✅ 3-screen onboarding flow (Task 5)
- ✅ No regressions (E2E tests verify search still works)
- ✅ Tests passing (Task 6)
