# Miles Portfolio — Design Spec

**Date:** 2026-05-15
**Status:** Approved

---

## Goal

Allow users to enter their real miles balances (airline programs + 3 bank currencies), then automatically answer "Puis-je me payer ce voyage ?" inline in search results — showing the best available program, or a transfer path if they're short.

## Architecture

**Approach: 100% client-side.**
- `FlightResult.milesOptions` is already returned by the search API — no server changes needed.
- The portfolio check is a pure client-side computation: read balances from localStorage, compare against milesOptions, surface the result.
- Transfer suggestions use the existing `TRANSFER_BONUSES` data (data/transferBonuses.ts) — no new data sources.

## Data Model

### UserProfile extension (`lib/userProfile.ts`)

Two new fields added to the existing `UserProfile` interface:

```typescript
balances:   Record<string, number>; // miles per program, e.g. {"Flying Blue": 45000, "Avios": 28000}
bankPoints: Record<string, number>; // bank currencies, e.g. {"Amex MR": 80000}
```

Both default to `{}` — migration is graceful (no existing profiles are broken).

### Bank currencies constant

```typescript
export const BANK_CURRENCIES = [
  { key: "Amex MR",     label: "Amex Membership Rewards" },
  { key: "Chase UR",    label: "Chase Ultimate Rewards"  },
  { key: "Capital One", label: "Capital One Miles"       },
] as const;

export type BankCurrencyKey = typeof BANK_CURRENCIES[number]["key"];
```

These three cover ~90% of transfer cases for Keza's audience. Others can be added in V2.

## Portfolio Engine (`lib/portfolioEngine.ts`)

Pure functions, zero side effects, no Redis/API dependencies.

### Status types

```typescript
export type PortfolioStatus =
  | { type: "CAN_AFFORD";
      program:      string;
      milesNeeded:  number;
      balanceAfter: number; }

  | { type: "CAN_TRANSFER";
      program:        string;
      milesNeeded:    number;
      shortfall:      number;
      transferFrom:   string;   // e.g. "Amex MR"
      transferAmount: number;   // points to transfer from bank currency
      transferRatio:  number; } // effective ratio (e.g. 1.0, 1.25 during promo)

  | { type: "CANT_AFFORD";
      bestProgram:  string;
      milesNeeded:  number;
      shortfall:    number; }

  | { type: "NO_PORTFOLIO" }
```

### Core function

```typescript
export function checkPortfolio(
  milesOptions: MilesOption[],             // from FlightResult, sorted cheapest-first
  balances:     Record<string, number>,    // from UserProfile.balances
  bankPoints:   Record<string, number>,    // from UserProfile.bankPoints
): PortfolioStatus
```

### Logic (4 steps)

1. **Empty portfolio guard** — if all balances and bankPoints are zero/empty → `NO_PORTFOLIO`

2. **Direct check** — iterate `milesOptions` cheapest-first:
   - If `balances[option.program] >= option.milesRequired` → return `CAN_AFFORD`
     - `balanceAfter = balances[option.program] - option.milesRequired`

3. **Transfer check** — if no direct match:
   - Find the `milesOption` with smallest shortfall (`milesRequired - balance`)
   - For each `TRANSFER_BONUSES` entry where `to === bestOption.program`:
     - `ratio = getEffectiveRatio(bonus)`
     - `pointsNeeded = Math.ceil(shortfall / ratio)`
     - If `bankPoints[bonus.from] >= pointsNeeded` → return `CAN_TRANSFER`

4. **Can't afford** — return `CANT_AFFORD` with the option closest to threshold

### Edge cases
- Balance exactly equals milesRequired → `CAN_AFFORD` with `balanceAfter: 0`
- Multiple programs with sufficient balance → return the cheapest `milesOption` first
- Transfer ratio is fractional → `Math.ceil` ensures we never under-estimate points needed
- Program has no transfer partner in TRANSFER_BONUSES → skip silently, try next
- Program not present in `balances` map → treated as balance 0 (not an error)

## UI Components

### `ProgramsWidget.tsx` (modified)

Balance fields added **inline** next to each program — auto-save on `onBlur`:

```
Layout per row:
[program color dot] [program name ──────────] [_______] miles/pts
```

- Programs section: existing list + balance input per row
- Bank currencies section: divider + 3 fixed rows (Amex MR, Chase UR, Capital One)
- `onBlur` fires `updateProfile({ balances, bankPoints })` — no save button
- Empty field = 0 (treated as no balance)
- Input: `type="number"`, `min="0"`, `step="1000"`, no decimals

### `PortfolioCheck.tsx` (new)

Read-only component. Accepts `milesOptions: MilesOption[]`, reads profile from `useProfile()`, calls `checkPortfolio()`, renders one of 4 states:

| Status | Style | Message |
|--------|-------|---------|
| `CAN_AFFORD` | Green border/bg | "✅ Tu peux payer avec tes {balance} {program} — il te restera {balanceAfter} miles" |
| `CAN_TRANSFER` | Blue border/bg | "🔁 Il te manque {shortfall} miles — transfère {transferAmount} {transferFrom} → {program}" |
| `CANT_AFFORD` | Amber border/bg | "⚠️ Il te manque {shortfall} miles {bestProgram} pour ce vol" |
| `NO_PORTFOLIO` | Neutral/muted | "💡 Ajoute tes soldes miles pour savoir si tu peux te payer ce vol →" (scrolls to ProgramsWidget) |

Both FR and EN strings required (follows existing `L` object pattern in Results.tsx).

Rendered in `Results.tsx` after `<CardRecommendation>`, only when `results.length > 0`. Uses the `milesOptions` of the first result where `bestOption?.isBestDeal === true`; falls back to `results[0].milesOptions` if none marked.

## Integration Points

### Files modified (4)

| File | Change |
|------|--------|
| `lib/userProfile.ts` | Add `balances`, `bankPoints` to `UserProfile`; add `BANK_CURRENCIES` constant; update `defaultProfile()` to include `balances: {}`, `bankPoints: {}` |
| `components/ProgramsWidget.tsx` | Add inline balance inputs + bank currencies section |
| `components/Results.tsx` | Import and render `<PortfolioCheck milesOptions={result.milesOptions} />` after CardRecommendation |
| `hooks/useProfile.ts` | Add `updateBalances(b: Record<string, number>)` and `updateBankPoints(b: Record<string, number>)` helpers |

### Files created (2)

| File | Contents |
|------|----------|
| `lib/portfolioEngine.ts` | `checkPortfolio()`, `PortfolioStatus` types, pure functions only |
| `components/PortfolioCheck.tsx` | UI component, 4 states, FR+EN |

### Files created — tests (1)

| File | Coverage |
|------|----------|
| `__tests__/lib/portfolioEngine.test.ts` | CAN_AFFORD (exact balance, surplus), CAN_TRANSFER (with ratio 1.0 and 1.25), CANT_AFFORD (no transfer available), NO_PORTFOLIO (empty profile), edge cases (balance=0, program not in balances, multiple programs) |

### Zero server changes

No modifications to `app/api/`, `lib/engine.ts`, `lib/costEngine.ts`, or Redis.

## Out of Scope (V2)

- Server-side persistence / cross-device sync
- Full `/portfolio` dashboard page
- Balance history / tracking over time
- Real-time transfer bonus alerts (Feature B from audit)
- More than 3 bank currencies
- Automatic balance import from loyalty program APIs
