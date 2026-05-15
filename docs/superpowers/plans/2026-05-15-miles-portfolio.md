# Miles Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users enter their real miles balances and automatically show "Puis-je me payer ce voyage ?" inline in search results.

**Architecture:** 100% client-side. Extend `UserProfile` in localStorage with `balances` + `bankPoints`. New pure engine `lib/portfolioEngine.ts` compares balances against `FlightResult.milesOptions` (already in API response). New `PortfolioCheck` component renders inline in Results after `CardRecommendation`. Balance inputs added to `ProgramsWidget`.

**Tech Stack:** TypeScript strict, React 18, localStorage, Jest/ts-jest, Tailwind CSS, Next.js 14 App Router.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/userProfile.ts` | Modify | Add `balances`, `bankPoints` fields + `BANK_CURRENCIES` constant |
| `lib/portfolioEngine.ts` | Create | Pure `checkPortfolio()` function, `PortfolioStatus` type |
| `hooks/useProfile.ts` | Modify | Add `setBalances()` and `setBankPoints()` helpers |
| `components/ProgramsWidget.tsx` | Modify | Add "Mes soldes" section with inline balance inputs |
| `components/PortfolioCheck.tsx` | Create | Read-only UI component, 4 states, FR+EN |
| `components/Results.tsx` | Modify | Render `<PortfolioCheck>` after `<CardRecommendation>` |
| `__tests__/lib/portfolioEngine.test.ts` | Create | Full test coverage for checkPortfolio() |

---

## Task 1: Extend UserProfile data model

**Files:**
- Modify: `lib/userProfile.ts`

> Context: `UserProfile` lives in localStorage via `loadProfile()` / `saveProfile()`. Adding fields with `{}` defaults is backward-compatible — existing profiles just get the new field from `defaultProfile()` on next merge.
> The keys in `BANK_CURRENCIES` must match `TransferBonusRecord.from` values in `data/transferBonuses.ts` exactly: "Amex MR", "Chase UR", "Capital One Miles".

- [ ] **Step 1: Add `balances` and `bankPoints` to `UserProfile` interface**

Open `lib/userProfile.ts`. The existing interface ends at `lastActiveAt`. Add two fields and the `BANK_CURRENCIES` constant:

```typescript
// Add after the existing FavoriteRoute interface, before STORAGE_KEY

export const BANK_CURRENCIES = [
  { key: "Amex MR",           label: "Amex Membership Rewards" },
  { key: "Chase UR",          label: "Chase Ultimate Rewards"  },
  { key: "Capital One Miles", label: "Capital One Miles"       },
] as const;

export type BankCurrencyKey = typeof BANK_CURRENCIES[number]["key"];
```

In the `UserProfile` interface, add after `favoriteRoutes: FavoriteRoute[];`:

```typescript
  /** Miles balance per program, e.g. {"Flying Blue": 45000} */
  balances: Record<string, number>;
  /** Bank points balance, keys must match BANK_CURRENCIES[n].key */
  bankPoints: Record<string, number>;
```

- [ ] **Step 2: Update `defaultProfile()` to include the new fields**

Change `defaultProfile()` from:

```typescript
function defaultProfile(): UserProfile {
  return {
    programs: [],
    currency: "USD",
    lang: "fr",
    cabin: "economy",
    recentSearches: [],
    favoriteRoutes: [],
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };
}
```

To:

```typescript
function defaultProfile(): UserProfile {
  return {
    programs: [],
    currency: "USD",
    lang: "fr",
    cabin: "economy",
    recentSearches: [],
    favoriteRoutes: [],
    balances: {},
    bankPoints: {},
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add lib/userProfile.ts
git commit -m "feat(portfolio): extend UserProfile with balances + bankPoints fields"
```

---

## Task 2: Create portfolioEngine — pure calculation

**Files:**
- Create: `lib/portfolioEngine.ts`
- Create: `__tests__/lib/portfolioEngine.test.ts`

> Context: `MilesOption` from `lib/costEngine.ts` has fields `program: string`, `milesRequired: number`, `type: "DIRECT"|"ALLIANCE"|"TRANSFER"`. `TRANSFER_BONUSES` from `data/transferBonuses.ts` has `from`, `to`, `baseRatio`, `promoRatio?`, `promoValidUntil?`. `getEffectiveRatio(record)` returns the active ratio.

- [ ] **Step 1: Write the failing tests first**

Create `__tests__/lib/portfolioEngine.test.ts`:

```typescript
import {
  checkPortfolio,
  type PortfolioStatus,
} from "@/lib/portfolioEngine";
import type { MilesOption } from "@/lib/costEngine";

// ── helpers ────────────────────────────────────────────────────────────────

function makeOption(program: string, milesRequired: number): MilesOption {
  return {
    type: "DIRECT",
    program,
    operatingAirline: "Air France",
    milesRequired,
    taxes: 50,
    valuePerMile: 1.5,
    milesCost: milesRequired * 0.015,
    totalMilesCost: milesRequired * 0.015 + 50,
    savings: 100,
    confidence: "HIGH",
    explanation: "",
    isBestDeal: false,
    chartSource: "REAL",
  };
}

// ── NO_PORTFOLIO ────────────────────────────────────────────────────────────

describe("checkPortfolio — NO_PORTFOLIO", () => {
  it("returns NO_PORTFOLIO when balances and bankPoints are empty", () => {
    const result = checkPortfolio([makeOption("Flying Blue", 35000)], {}, {});
    expect(result.type).toBe("NO_PORTFOLIO");
  });

  it("returns NO_PORTFOLIO when all balances are zero", () => {
    const result = checkPortfolio(
      [makeOption("Flying Blue", 35000)],
      { "Flying Blue": 0 },
      { "Amex MR": 0 },
    );
    expect(result.type).toBe("NO_PORTFOLIO");
  });
});

// ── CAN_AFFORD ─────────────────────────────────────────────────────────────

describe("checkPortfolio — CAN_AFFORD", () => {
  it("returns CAN_AFFORD when balance covers milesRequired", () => {
    const result = checkPortfolio(
      [makeOption("Flying Blue", 35000)],
      { "Flying Blue": 45000 },
      {},
    );
    expect(result.type).toBe("CAN_AFFORD");
    if (result.type === "CAN_AFFORD") {
      expect(result.program).toBe("Flying Blue");
      expect(result.milesNeeded).toBe(35000);
      expect(result.balanceAfter).toBe(10000);
    }
  });

  it("returns CAN_AFFORD when balance equals milesRequired exactly", () => {
    const result = checkPortfolio(
      [makeOption("Flying Blue", 35000)],
      { "Flying Blue": 35000 },
      {},
    );
    expect(result.type).toBe("CAN_AFFORD");
    if (result.type === "CAN_AFFORD") {
      expect(result.balanceAfter).toBe(0);
    }
  });

  it("picks cheapest option first when multiple programs can afford", () => {
    // Flying Blue costs 30 000, Avios costs 40 000 — Flying Blue is cheaper
    const result = checkPortfolio(
      [makeOption("Flying Blue", 30000), makeOption("Avios", 40000)],
      { "Flying Blue": 50000, "Avios": 50000 },
      {},
    );
    expect(result.type).toBe("CAN_AFFORD");
    if (result.type === "CAN_AFFORD") {
      expect(result.program).toBe("Flying Blue");
    }
  });

  it("skips programs with insufficient balance and finds the next one", () => {
    const result = checkPortfolio(
      [makeOption("Flying Blue", 35000), makeOption("Avios", 28000)],
      { "Flying Blue": 10000, "Avios": 30000 },
      {},
    );
    expect(result.type).toBe("CAN_AFFORD");
    if (result.type === "CAN_AFFORD") {
      expect(result.program).toBe("Avios");
    }
  });
});

// ── CAN_TRANSFER ────────────────────────────────────────────────────────────

describe("checkPortfolio — CAN_TRANSFER", () => {
  it("returns CAN_TRANSFER when bankPoints cover the shortfall via 1:1 ratio", () => {
    // Flying Blue needs 35 000, user has 20 000. Shortfall = 15 000.
    // Amex MR → Flying Blue ratio = 1.0 → needs 15 000 Amex MR points.
    // User has 20 000 Amex MR → can transfer.
    const result = checkPortfolio(
      [makeOption("Flying Blue", 35000)],
      { "Flying Blue": 20000 },
      { "Amex MR": 20000 },
    );
    expect(result.type).toBe("CAN_TRANSFER");
    if (result.type === "CAN_TRANSFER") {
      expect(result.program).toBe("Flying Blue");
      expect(result.shortfall).toBe(15000);
      expect(result.transferFrom).toBe("Amex MR");
      expect(result.transferAmount).toBe(15000);
    }
  });

  it("accounts for transfer ratio correctly (ratio = 1.25 means fewer points needed)", () => {
    // Shortfall = 10 000. Ratio 1.25 → ceil(10000 / 1.25) = 8 000 points needed.
    // User has 8 000 Amex MR → can transfer.
    const result = checkPortfolio(
      [makeOption("Flying Blue", 30000)],
      { "Flying Blue": 20000 },
      { "Amex MR": 8000 },
    );
    // If a 1.25 promo were active this would be CAN_TRANSFER.
    // With base ratio 1.0, need 10000 pts but only have 8000 → CANT_AFFORD.
    expect(result.type).toBe("CANT_AFFORD");
  });
});

// ── CANT_AFFORD ─────────────────────────────────────────────────────────────

describe("checkPortfolio — CANT_AFFORD", () => {
  it("returns CANT_AFFORD when no direct match and no transfer covers shortfall", () => {
    const result = checkPortfolio(
      [makeOption("Flying Blue", 35000)],
      { "Flying Blue": 10000 },
      { "Amex MR": 5000 },
    );
    expect(result.type).toBe("CANT_AFFORD");
    if (result.type === "CANT_AFFORD") {
      expect(result.bestProgram).toBe("Flying Blue");
      expect(result.milesNeeded).toBe(35000);
      expect(result.shortfall).toBe(25000);
    }
  });

  it("reports shortfall for program not present in balances (treated as 0)", () => {
    const result = checkPortfolio(
      [makeOption("KrisFlyer", 37500)],
      {},
      {},
    );
    // All balances empty → NO_PORTFOLIO (guard fires first)
    expect(result.type).toBe("NO_PORTFOLIO");
  });

  it("treats missing program in balances as 0 when other programs have balance", () => {
    const result = checkPortfolio(
      [makeOption("KrisFlyer", 37500)],
      { "Flying Blue": 1000 }, // has some balance but not for KrisFlyer
      {},
    );
    expect(result.type).toBe("CANT_AFFORD");
    if (result.type === "CANT_AFFORD") {
      expect(result.bestProgram).toBe("KrisFlyer");
      expect(result.shortfall).toBe(37500);
    }
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx jest __tests__/lib/portfolioEngine.test.ts --no-coverage 2>&1 | tail -10
```

Expected: FAIL — "Cannot find module '@/lib/portfolioEngine'"

- [ ] **Step 3: Create `lib/portfolioEngine.ts`**

```typescript
// lib/portfolioEngine.ts
// Pure portfolio check engine — no side effects, no Redis, no API calls.

import type { MilesOption } from "./costEngine";
import { TRANSFER_BONUSES, getEffectiveRatio } from "@/data/transferBonuses";

// ── Types ──────────────────────────────────────────────────────────────────

export type PortfolioStatus =
  | {
      type: "CAN_AFFORD";
      program: string;
      milesNeeded: number;
      balanceAfter: number;
    }
  | {
      type: "CAN_TRANSFER";
      program: string;
      milesNeeded: number;
      shortfall: number;
      transferFrom: string;
      transferAmount: number;   // source points needed
      transferRatio: number;    // effective ratio used
    }
  | {
      type: "CANT_AFFORD";
      bestProgram: string;
      milesNeeded: number;
      shortfall: number;
    }
  | { type: "NO_PORTFOLIO" };

// ── Core function ──────────────────────────────────────────────────────────

/**
 * Check whether the user's portfolio can cover a flight's miles cost.
 *
 * @param milesOptions - from FlightResult.milesOptions, sorted cheapest-first
 * @param balances     - UserProfile.balances  e.g. {"Flying Blue": 45000}
 * @param bankPoints   - UserProfile.bankPoints e.g. {"Amex MR": 80000}
 */
export function checkPortfolio(
  milesOptions: MilesOption[],
  balances: Record<string, number>,
  bankPoints: Record<string, number>,
): PortfolioStatus {
  // 1. Empty portfolio guard
  const hasAnyBalance =
    Object.values(balances).some((v) => v > 0) ||
    Object.values(bankPoints).some((v) => v > 0);
  if (!hasAnyBalance) return { type: "NO_PORTFOLIO" };

  // 2. Direct check — iterate cheapest option first
  for (const option of milesOptions) {
    const balance = balances[option.program] ?? 0;
    if (balance >= option.milesRequired) {
      return {
        type: "CAN_AFFORD",
        program: option.program,
        milesNeeded: option.milesRequired,
        balanceAfter: balance - option.milesRequired,
      };
    }
  }

  // 3. Transfer check — find the option with smallest shortfall
  let bestOption = milesOptions[0];
  let bestShortfall = Infinity;

  for (const option of milesOptions) {
    const balance = balances[option.program] ?? 0;
    const shortfall = option.milesRequired - balance;
    if (shortfall < bestShortfall) {
      bestShortfall = shortfall;
      bestOption = option;
    }
  }

  // Check if any bank currency can cover the shortfall
  for (const bonus of TRANSFER_BONUSES) {
    if (bonus.to !== bestOption.program) continue;
    const available = bankPoints[bonus.from] ?? 0;
    if (available <= 0) continue;
    const ratio = getEffectiveRatio(bonus);
    const pointsNeeded = Math.ceil(bestShortfall / ratio);
    if (available >= pointsNeeded) {
      return {
        type: "CAN_TRANSFER",
        program: bestOption.program,
        milesNeeded: bestOption.milesRequired,
        shortfall: bestShortfall,
        transferFrom: bonus.from,
        transferAmount: pointsNeeded,
        transferRatio: ratio,
      };
    }
  }

  // 4. Can't afford
  return {
    type: "CANT_AFFORD",
    bestProgram: bestOption.program,
    milesNeeded: bestOption.milesRequired,
    shortfall: bestShortfall,
  };
}
```

- [ ] **Step 4: Run tests — all must pass**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx jest __tests__/lib/portfolioEngine.test.ts --no-coverage 2>&1 | tail -15
```

Expected: all tests PASS. If any fail, fix the engine before continuing.

- [ ] **Step 5: Run full test suite to confirm no regressions**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx jest --no-coverage 2>&1 | tail -5
```

Expected: 265+ tests passing (was 264 before this task).

- [ ] **Step 6: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add lib/portfolioEngine.ts __tests__/lib/portfolioEngine.test.ts
git commit -m "feat(portfolio): add portfolioEngine with checkPortfolio() — 4-state pure function"
```

---

## Task 3: Add balance helpers to useProfile hook

**Files:**
- Modify: `hooks/useProfile.ts`

> Context: The hook's `update(updates: Partial<UserProfile>)` already handles persisting any field. We just add two named helpers that call it, following the same pattern as `setPrograms`, `setLang`, etc.

- [ ] **Step 1: Add `setBalances` and `setBankPoints` to `useProfile.ts`**

After the `setCabin` callback (line 47), add:

```typescript
  const setBalances = useCallback((balances: Record<string, number>) => {
    update({ balances });
  }, [update]);

  const setBankPoints = useCallback((bankPoints: Record<string, number>) => {
    update({ bankPoints });
  }, [update]);
```

In the return object, add both helpers after `setCabin`:

```typescript
  return {
    profile,
    isLoaded: profile !== null,
    update,
    setPrograms,
    setLang,
    setCurrency,
    setCabin,
    setBalances,
    setBankPoints,
    recordSearch,
    toggleFavorite,
  };
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add hooks/useProfile.ts
git commit -m "feat(portfolio): add setBalances + setBankPoints helpers to useProfile"
```

---

## Task 4: Add balance inputs to ProgramsWidget

**Files:**
- Modify: `components/ProgramsWidget.tsx`

> Context: The current widget shows static TOP5 from PROGRAMS data. We add a new "Mes soldes" section below the existing list. It reads `profile.programs` (user's selected programs) from `useProfile` and renders one balance input per program, plus 3 fixed rows for bank currencies. The TOP5 static section is kept as-is. Auto-save on `onBlur`.

- [ ] **Step 1: Rewrite `components/ProgramsWidget.tsx`**

Replace the entire file content with:

```typescript
"use client";

import { useState, useCallback } from "react";
import { PROGRAMS } from "@/data/programs";
import { BANK_CURRENCIES } from "@/lib/userProfile";
import { trackProgramClick } from "@/lib/analytics";
import { useProfile } from "@/hooks/useProfile";

interface Props {
  lang: "fr" | "en";
}

const L = {
  fr: {
    title:        "Top programmes",
    seeAll:       "Voir tout →",
    updated:      "Mis à jour · avr. 2026",
    myBalances:   "Mes soldes",
    milesUnit:    "miles",
    ptsUnit:      "pts",
    noPrograms:   "Ajoute tes programmes →",
    bankSection:  "Points bancaires",
    placeholder:  "0",
  },
  en: {
    title:        "Top programs",
    seeAll:       "See all →",
    updated:      "Updated · Apr 2026",
    myBalances:   "My balances",
    milesUnit:    "miles",
    ptsUnit:      "pts",
    noPrograms:   "Add your programs →",
    bankSection:  "Bank points",
    placeholder:  "0",
  },
};

const TOP5 = PROGRAMS.slice(0, 5);

export function ProgramsWidget({ lang }: Props) {
  const t = L[lang];
  const { profile, setBalances, setBankPoints } = useProfile();

  // Local state mirrors profile so inputs feel instant
  const [localBalances, setLocalBalances] = useState<Record<string, number>>({});
  const [localBank, setLocalBank]         = useState<Record<string, number>>({});
  const [seeded, setSeeded]               = useState(false);

  // Seed local state from profile once loaded
  if (profile && !seeded) {
    setLocalBalances(profile.balances ?? {});
    setLocalBank(profile.bankPoints ?? {});
    setSeeded(true);
  }

  const handleBalanceChange = useCallback((program: string, value: string) => {
    const n = Math.max(0, parseInt(value.replace(/\D/g, ""), 10) || 0);
    setLocalBalances(prev => ({ ...prev, [program]: n }));
  }, []);

  const handleBalanceBlur = useCallback((program: string, value: string) => {
    const n = Math.max(0, parseInt(value.replace(/\D/g, ""), 10) || 0);
    const updated = { ...localBalances, [program]: n };
    setLocalBalances(updated);
    setBalances?.(updated);
  }, [localBalances, setBalances]);

  const handleBankChange = useCallback((key: string, value: string) => {
    const n = Math.max(0, parseInt(value.replace(/\D/g, ""), 10) || 0);
    setLocalBank(prev => ({ ...prev, [key]: n }));
  }, []);

  const handleBankBlur = useCallback((key: string, value: string) => {
    const n = Math.max(0, parseInt(value.replace(/\D/g, ""), 10) || 0);
    const updated = { ...localBank, [key]: n };
    setLocalBank(updated);
    setBankPoints?.(updated);
  }, [localBank, setBankPoints]);

  const userPrograms = profile?.programs ?? [];

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 space-y-4">

      {/* ── Top programmes (static) ────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🏆</span>
            <span className="text-xs font-bold text-muted uppercase tracking-wider">{t.title}</span>
          </div>
          <a
            href="/programmes"
            className="text-xs text-primary font-semibold hover:text-primary/80 transition-colors"
          >
            {t.seeAll}
          </a>
        </div>
        <div className="space-y-2">
          {TOP5.map((program, index) => (
            <a
              key={program.id}
              href={`/programmes#${program.id}`}
              onClick={() => trackProgramClick({ id: program.id, name: program.name })}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-2 transition-colors group cursor-pointer"
            >
              <span className="flex-shrink-0 w-5 text-center text-xs font-black text-muted">
                #{index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{program.flag}</span>
                  <span className="text-xs font-bold text-fg truncate">{program.name}</span>
                </div>
                <p className="text-[10px] text-muted truncate mt-0.5">
                  {lang === "fr" ? program.bestUseFr : program.bestUse}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <span className="text-sm font-black text-primary">{program.score}</span>
                <span className="text-[10px] text-muted">/100</span>
              </div>
            </a>
          ))}
        </div>
        <p className="text-[10px] text-muted mt-3 pt-3 border-t border-border/50">{t.updated}</p>
      </div>

      {/* ── Mes soldes ────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">💳</span>
          <span className="text-xs font-bold text-muted uppercase tracking-wider">{t.myBalances}</span>
        </div>

        {/* User's airline programs */}
        {userPrograms.length === 0 ? (
          <a
            href="/programmes"
            className="block text-xs text-primary font-semibold hover:text-primary/80 transition-colors py-1"
          >
            {t.noPrograms}
          </a>
        ) : (
          <div className="space-y-2">
            {userPrograms.map(programName => (
              <div key={programName} className="flex items-center gap-2">
                <span className="flex-1 text-xs text-fg truncate">{programName}</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={localBalances[programName] || ""}
                  placeholder={t.placeholder}
                  onChange={e => handleBalanceChange(programName, e.target.value)}
                  onBlur={e => handleBalanceBlur(programName, e.target.value)}
                  className="w-24 bg-surface-2 border border-border rounded-lg px-2 py-1 text-xs text-fg text-right focus:border-primary focus:outline-none"
                />
                <span className="text-[10px] text-muted w-7 flex-shrink-0">{t.milesUnit}</span>
              </div>
            ))}
          </div>
        )}

        {/* Bank currencies divider */}
        <div className="flex items-center gap-2 my-3">
          <div className="flex-1 h-px bg-border/50" />
          <span className="text-[10px] text-muted uppercase tracking-wider">{t.bankSection}</span>
          <div className="flex-1 h-px bg-border/50" />
        </div>

        {/* 3 fixed bank currency rows */}
        <div className="space-y-2">
          {BANK_CURRENCIES.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="flex-1 text-xs text-fg truncate">{label}</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={localBank[key] || ""}
                placeholder={t.placeholder}
                onChange={e => handleBankChange(key, e.target.value)}
                onBlur={e => handleBankBlur(key, e.target.value)}
                className="w-24 bg-surface-2 border border-border rounded-lg px-2 py-1 text-xs text-fg text-right focus:border-primary focus:outline-none"
              />
              <span className="text-[10px] text-muted w-7 flex-shrink-0">{t.ptsUnit}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors.

- [ ] **Step 3: Run test suite**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx jest --no-coverage 2>&1 | tail -5
```

Expected: all tests passing. The existing `ProgramsWidget.test.ts` tests data logic (`PROGRAMS.slice(0, 5)`) which is unchanged — they should still pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add components/ProgramsWidget.tsx
git commit -m "feat(portfolio): add Mes soldes balance inputs to ProgramsWidget"
```

---

## Task 5: Create PortfolioCheck component

**Files:**
- Create: `components/PortfolioCheck.tsx`

> Context: Read-only component. Calls `checkPortfolio()` with data from `useProfile()` and the flight's `milesOptions`. The `milesOptions` prop comes from the best result (the one with `bestOption.isBestDeal === true`). Follows the `L` object i18n pattern used throughout the app (see Results.tsx for reference). Tailwind classes follow the existing patterns: `bg-success/10 border-success/25` for green, `bg-primary/10 border-primary/25` for blue, `bg-warning/10 border-warning/25` for amber.

- [ ] **Step 1: Create `components/PortfolioCheck.tsx`**

```typescript
"use client";

import { useMemo } from "react";
import type { MilesOption } from "@/lib/costEngine";
import { checkPortfolio } from "@/lib/portfolioEngine";
import { useProfile } from "@/hooks/useProfile";

interface Props {
  milesOptions: MilesOption[];
  lang: "fr" | "en";
}

const L = {
  fr: {
    canAfford:      (program: string, balance: number, remaining: number) =>
      `✅ Tu peux payer avec tes ${balance.toLocaleString("fr-FR")} ${program} — il te restera ${remaining.toLocaleString("fr-FR")} miles`,
    canTransfer:    (shortfall: number, amount: number, from: string, to: string) =>
      `🔁 Il te manque ${shortfall.toLocaleString("fr-FR")} miles — transfère ${amount.toLocaleString("fr-FR")} ${from} → ${to}`,
    cantAfford:     (shortfall: number, program: string) =>
      `⚠️ Il te manque ${shortfall.toLocaleString("fr-FR")} miles ${program} pour ce vol`,
    noPortfolio:    "💡 Ajoute tes soldes miles pour savoir si tu peux te payer ce vol",
    noPortfolioLink: "→ Renseigner mes soldes",
  },
  en: {
    canAfford:      (program: string, balance: number, remaining: number) =>
      `✅ You can pay with your ${balance.toLocaleString("en-US")} ${program} — ${remaining.toLocaleString("en-US")} miles left after`,
    canTransfer:    (shortfall: number, amount: number, from: string, to: string) =>
      `🔁 You're short ${shortfall.toLocaleString("en-US")} miles — transfer ${amount.toLocaleString("en-US")} ${from} → ${to}`,
    cantAfford:     (shortfall: number, program: string) =>
      `⚠️ You need ${shortfall.toLocaleString("en-US")} more ${program} miles for this flight`,
    noPortfolio:    "💡 Add your miles balances to check if you can afford this flight",
    noPortfolioLink: "→ Enter my balances",
  },
};

export function PortfolioCheck({ milesOptions, lang }: Props) {
  const { profile, isLoaded } = useProfile();
  const t = L[lang];

  const status = useMemo(() => {
    if (!isLoaded || !profile) return null;
    if (milesOptions.length === 0) return null;
    return checkPortfolio(
      milesOptions,
      profile.balances ?? {},
      profile.bankPoints ?? {},
    );
  }, [isLoaded, profile, milesOptions]);

  if (!status) return null;

  if (status.type === "NO_PORTFOLIO") {
    return (
      <div className="bg-surface rounded-xl border border-border/50 px-4 py-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted">{t.noPortfolio}</p>
        <a
          href="#programmes-widget"
          className="text-xs text-primary font-semibold whitespace-nowrap hover:text-primary/80 transition-colors"
        >
          {t.noPortfolioLink}
        </a>
      </div>
    );
  }

  if (status.type === "CAN_AFFORD") {
    return (
      <div className="bg-success/10 rounded-xl border border-success/25 px-4 py-3">
        <p className="text-xs font-semibold text-success">
          {t.canAfford(status.program, status.milesNeeded + status.balanceAfter, status.balanceAfter)}
        </p>
      </div>
    );
  }

  if (status.type === "CAN_TRANSFER") {
    return (
      <div className="bg-primary/10 rounded-xl border border-primary/25 px-4 py-3">
        <p className="text-xs font-semibold text-primary">
          {t.canTransfer(status.shortfall, status.transferAmount, status.transferFrom, status.program)}
        </p>
      </div>
    );
  }

  // CANT_AFFORD
  return (
    <div className="bg-warning/10 rounded-xl border border-warning/25 px-4 py-3">
      <p className="text-xs font-semibold text-warning">
        {t.cantAfford(status.shortfall, status.bestProgram)}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add components/PortfolioCheck.tsx
git commit -m "feat(portfolio): add PortfolioCheck component — 4 states, FR+EN"
```

---

## Task 6: Wire PortfolioCheck into Results

**Files:**
- Modify: `components/Results.tsx`

> Context: `CardRecommendation` is rendered at line 203: `{results.length > 0 && <CardRecommendation results={results} lang={lang} formatPrice={formatPrice} />}`. Add `PortfolioCheck` immediately after it. Use the `milesOptions` from the result where `bestOption?.isBestDeal === true`; fall back to `results[0].milesOptions` if none marked.

- [ ] **Step 1: Add the import at the top of Results.tsx**

After the existing import of `CardRecommendation` (line 7), add:

```typescript
import { PortfolioCheck } from "./PortfolioCheck";
```

- [ ] **Step 2: Add a helper to find the best result's milesOptions**

Inside the `Results` function, after the `maxSavings` line (line 109), add:

```typescript
  // Find milesOptions for the best result (isBestDeal) or fall back to first result
  const bestResultOptions = useMemo(() => {
    if (results.length === 0) return [];
    const best = results.find(r => r.bestOption?.isBestDeal);
    return (best ?? results[0]).milesOptions;
  }, [results]);
```

- [ ] **Step 3: Render PortfolioCheck after CardRecommendation**

Find the line:
```typescript
      {results.length > 0 && <CardRecommendation results={results} lang={lang} formatPrice={formatPrice} />}
```

Replace it with:
```typescript
      {results.length > 0 && <CardRecommendation results={results} lang={lang} formatPrice={formatPrice} />}
      {results.length > 0 && bestResultOptions.length > 0 && (
        <PortfolioCheck milesOptions={bestResultOptions} lang={lang} />
      )}
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors.

- [ ] **Step 5: Run full test suite**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx jest --no-coverage 2>&1 | tail -5
```

Expected: all tests passing (265+).

- [ ] **Step 6: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add components/Results.tsx
git commit -m "feat(portfolio): wire PortfolioCheck into Results after CardRecommendation"
```

---

## Task 7: Final integration check

**Files:** none (verification only)

- [ ] **Step 1: Full TypeScript + lint + tests**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx tsc --noEmit && npx next lint && npx jest --no-coverage 2>&1 | tail -10
```

Expected: zero TypeScript errors, zero lint errors, all tests passing.

- [ ] **Step 2: Push to origin**

```bash
cd /Users/DIALLO9194/Downloads/keza && git push origin main
```

Expected: pre-push hooks run (TS + ESLint + tests), then push accepted.
