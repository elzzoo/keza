# Historique des Prix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/prix` page showing the best month to travel to each of KEZA's 20 destinations, with a sparkline chart and recommendation badge computed from static seasonal multipliers.

**Architecture:** `data/seasonality.ts` holds 12 monthly multipliers per region; `lib/priceHistory.ts` applies them to `cashEstimateUsd` to produce 12 `MonthlyPrice` objects per destination; `app/prix/page.tsx` (SSG Server Component) pre-computes all data at build time and passes it to `app/prix/PriceChart.tsx` ("use client") which renders pills + SVG sparkline.

**Tech Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · SVG pur · lib/dealsEngine (existing)

---

## File Map

| Status | Path | Role |
|--------|------|------|
| CREATE | `data/seasonality.ts` | Monthly multipliers per region |
| CREATE | `__tests__/data/seasonality.test.ts` | Validate multiplier integrity |
| CREATE | `lib/priceHistory.ts` | `getMonthlyPrices` + `getAllDestinationPriceHistories` |
| CREATE | `__tests__/lib/priceHistory.test.ts` | Validate calculation logic |
| CREATE | `app/prix/PriceChart.tsx` | "use client" — pills + sparkline SVG |
| CREATE | `app/prix/page.tsx` | SSG Server Component — metadata + data |
| MODIFY | `components/Header.tsx` | Add "Prix" nav link between Carte and Programmes |
| MODIFY | `app/sitemap.ts` | Add /prix entry |

---

## Task 1: Seasonal data (`data/seasonality.ts`) + tests

**Files:**
- Create: `data/seasonality.ts`
- Create: `__tests__/data/seasonality.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/data/seasonality.test.ts
import { REGIONAL_SEASONALITY } from "@/data/seasonality";

const REGIONS = ["africa", "europe", "americas", "asia", "middle-east", "oceania"] as const;

describe("REGIONAL_SEASONALITY integrity", () => {
  it("contains all 6 regions", () => {
    REGIONS.forEach((region) => {
      expect(REGIONAL_SEASONALITY).toHaveProperty(region);
    });
  });

  it("each region has exactly 12 multipliers", () => {
    REGIONS.forEach((region) => {
      expect(REGIONAL_SEASONALITY[region]).toHaveLength(12);
    });
  });

  it("all multipliers are between 0.5 and 2.0", () => {
    REGIONS.forEach((region) => {
      REGIONAL_SEASONALITY[region].forEach((m) => {
        expect(m).toBeGreaterThanOrEqual(0.5);
        expect(m).toBeLessThanOrEqual(2.0);
      });
    });
  });

  it("sum of multipliers per region is between 10 and 14", () => {
    REGIONS.forEach((region) => {
      const sum = REGIONAL_SEASONALITY[region].reduce((a, b) => a + b, 0);
      expect(sum).toBeGreaterThanOrEqual(10);
      expect(sum).toBeLessThanOrEqual(14);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/data/seasonality.test.ts --no-coverage 2>&1 | tail -10
```

Expected: `Cannot find module '@/data/seasonality'`

- [ ] **Step 3: Create `data/seasonality.ts`**

```typescript
// data/seasonality.ts
import type { Region } from "@/data/destinations";

// 12 monthly multipliers applied to cashEstimateUsd base price.
// Index 0 = January, index 11 = December.
// Rationale:
//   Africa/Europe: high season summer (Jul/Aug) + holidays (Dec), low Jan–Feb
//   Americas:      similar to Europe with stronger Dec spike
//   Asia:          Chinese New Year (Jan high), monsoon dip (Jun/Sep)
//   Middle-East:   summer high season, mild pattern
//   Oceania:       inverted hemispheres — Jul/Aug = austral winter = cheap

export type MonthlyMultipliers = [
  number, number, number, number, // Jan Fév Mar Avr
  number, number, number, number, // Mai Jun Jul Aoû
  number, number, number, number, // Sep Oct Nov Déc
];

export const REGIONAL_SEASONALITY: Record<Region, MonthlyMultipliers> = {
  africa:       [0.82, 0.84, 0.90, 0.95, 1.00, 1.15, 1.35, 1.30, 1.05, 0.97, 1.10, 1.20],
  europe:       [0.82, 0.84, 0.90, 0.94, 0.98, 1.15, 1.35, 1.30, 1.02, 0.96, 1.10, 1.20],
  americas:     [0.88, 0.85, 0.92, 0.95, 1.00, 1.18, 1.35, 1.28, 1.05, 0.98, 1.05, 1.25],
  asia:         [1.10, 0.90, 0.95, 1.05, 1.00, 0.95, 1.00, 1.05, 0.92, 0.90, 1.00, 1.15],
  "middle-east":[0.90, 0.88, 0.92, 0.95, 1.00, 1.10, 1.20, 1.15, 1.00, 0.95, 1.00, 1.10],
  oceania:      [1.20, 1.10, 1.05, 0.95, 0.88, 0.85, 0.90, 0.92, 0.95, 1.00, 1.05, 1.10],
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/data/seasonality.test.ts --no-coverage 2>&1 | tail -10
```

Expected: `Tests: 4 passed, 4 total`

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx tsc --noEmit 2>&1 | head -10
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add data/seasonality.ts __tests__/data/seasonality.test.ts
git commit -m "feat: add regional seasonality multipliers — 12-month price variation data"
```

---

## Task 2: Price history logic (`lib/priceHistory.ts`) + tests

**Files:**
- Create: `lib/priceHistory.ts`
- Create: `__tests__/lib/priceHistory.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/priceHistory.test.ts
import { getMonthlyPrices, getAllDestinationPriceHistories } from "@/lib/priceHistory";
import { DESTINATIONS } from "@/data/destinations";
import { REGIONAL_SEASONALITY } from "@/data/seasonality";

const CDG = DESTINATIONS.find((d) => d.iata === "CDG")!;

describe("getMonthlyPrices", () => {
  it("returns exactly 12 monthly prices", () => {
    const history = getMonthlyPrices(CDG);
    expect(history.monthlyPrices).toHaveLength(12);
  });

  it("each MonthlyPrice has required fields", () => {
    const history = getMonthlyPrices(CDG);
    history.monthlyPrices.forEach((mp, i) => {
      expect(mp.month).toBe(i);
      expect(typeof mp.monthLabel).toBe("string");
      expect(mp.monthLabel.length).toBeGreaterThan(0);
      expect(typeof mp.price).toBe("number");
      expect(typeof mp.cpm).toBe("number");
      expect(["USE_MILES", "NEUTRAL", "USE_CASH"]).toContain(mp.recommendation);
    });
  });

  it("price for CDG January = Math.round(cashEstimateUsd * europe[0])", () => {
    const history = getMonthlyPrices(CDG);
    const janMultiplier = REGIONAL_SEASONALITY["europe"][0]; // 0.82
    const expected = Math.round(CDG.cashEstimateUsd * janMultiplier);
    expect(history.monthlyPrices[0].price).toBe(expected);
  });

  it("bestMonths contains only months with price <= percentile 33", () => {
    const history = getMonthlyPrices(CDG);
    const prices = history.monthlyPrices.map((m) => m.price);
    const sorted = [...prices].sort((a, b) => a - b);
    const p33 = sorted[Math.floor(sorted.length * 0.33)];
    history.bestMonths.forEach((idx) => {
      expect(history.monthlyPrices[idx].price).toBeLessThanOrEqual(p33);
    });
  });

  it("worstMonths contains only months with price >= percentile 67", () => {
    const history = getMonthlyPrices(CDG);
    const prices = history.monthlyPrices.map((m) => m.price);
    const sorted = [...prices].sort((a, b) => a - b);
    const p67 = sorted[Math.floor(sorted.length * 0.67)];
    history.worstMonths.forEach((idx) => {
      expect(history.monthlyPrices[idx].price).toBeGreaterThanOrEqual(p67);
    });
  });

  it("iata matches the input destination", () => {
    const history = getMonthlyPrices(CDG);
    expect(history.iata).toBe("CDG");
  });
});

describe("getAllDestinationPriceHistories", () => {
  it("returns 20 entries (one per destination)", () => {
    const all = getAllDestinationPriceHistories();
    expect(all).toHaveLength(20);
  });

  it("each entry has a valid iata matching DESTINATIONS", () => {
    const all = getAllDestinationPriceHistories();
    const iatas = DESTINATIONS.map((d) => d.iata);
    all.forEach((h) => {
      expect(iatas).toContain(h.iata);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/lib/priceHistory.test.ts --no-coverage 2>&1 | tail -10
```

Expected: `Cannot find module '@/lib/priceHistory'`

- [ ] **Step 3: Create `lib/priceHistory.ts`**

```typescript
// lib/priceHistory.ts
// Pure functions — no API calls, no Redis. Testable in isolation.

import { DESTINATIONS, type Destination } from "@/data/destinations";
import { REGIONAL_SEASONALITY } from "@/data/seasonality";
import { computeDealRatio, classifyDeal, type DealRecommendation } from "@/lib/dealsEngine";

export interface MonthlyPrice {
  month: number;           // 0-11 (0 = January)
  monthLabel: string;      // "Jan", "Fév", ...
  price: number;           // Math.round(cashEstimateUsd × multiplier)
  cpm: number;             // cents per mile
  recommendation: DealRecommendation;
}

export interface DestinationPriceHistory {
  iata: string;
  monthlyPrices: MonthlyPrice[]; // always 12 elements
  bestMonths: number[];           // month indices where price ≤ percentile 33
  worstMonths: number[];          // month indices where price ≥ percentile 67
}

const MONTH_LABELS = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
  "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc",
];

function percentileValue(sortedAsc: number[], p: number): number {
  return sortedAsc[Math.floor(sortedAsc.length * p)];
}

export function getMonthlyPrices(dest: Destination): DestinationPriceHistory {
  const multipliers = REGIONAL_SEASONALITY[dest.region];

  const monthlyPrices: MonthlyPrice[] = multipliers.map((mult, i) => {
    const price = Math.round(dest.cashEstimateUsd * mult);
    const cpm = computeDealRatio(price, dest.milesEstimate);
    return {
      month: i,
      monthLabel: MONTH_LABELS[i],
      price,
      cpm,
      recommendation: classifyDeal(cpm),
    };
  });

  const prices = monthlyPrices.map((m) => m.price);
  const sorted = [...prices].sort((a, b) => a - b);
  const p33 = percentileValue(sorted, 0.33);
  const p67 = percentileValue(sorted, 0.67);

  const bestMonths = monthlyPrices
    .filter((m) => m.price <= p33)
    .map((m) => m.month);

  const worstMonths = monthlyPrices
    .filter((m) => m.price >= p67)
    .map((m) => m.month);

  return { iata: dest.iata, monthlyPrices, bestMonths, worstMonths };
}

export function getAllDestinationPriceHistories(): DestinationPriceHistory[] {
  return DESTINATIONS.map(getMonthlyPrices);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/lib/priceHistory.test.ts --no-coverage 2>&1 | tail -10
```

Expected: `Tests: 7 passed, 7 total`

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx tsc --noEmit 2>&1 | head -10
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add lib/priceHistory.ts __tests__/lib/priceHistory.test.ts
git commit -m "feat: add priceHistory lib — monthly prices with percentile best/worst months"
```

---

## Task 3: Create `app/prix/PriceChart.tsx` — interactive chart

**Files:**
- Create: `app/prix/PriceChart.tsx`

No unit tests for this task (pure UI rendering — visual correctness validated by the page).

- [ ] **Step 1: Create `app/prix/PriceChart.tsx`**

```typescript
// app/prix/PriceChart.tsx
"use client";

import { useState, useMemo } from "react";
import type { Destination, Region } from "@/data/destinations";
import type { DestinationPriceHistory, MonthlyPrice } from "@/lib/priceHistory";
import type { DealRecommendation } from "@/lib/dealsEngine";

interface Props {
  histories: DestinationPriceHistory[];
  destinations: Destination[];
  lang: "fr" | "en";
}

type RegionFilter = "all" | Region;

const REGION_FILTERS: { key: RegionFilter; labelFr: string; labelEn: string }[] = [
  { key: "all",          labelFr: "Toutes",       labelEn: "All" },
  { key: "africa",       labelFr: "🌍 Afrique",   labelEn: "🌍 Africa" },
  { key: "europe",       labelFr: "🇪🇺 Europe",   labelEn: "🇪🇺 Europe" },
  { key: "americas",     labelFr: "🌎 Amériques", labelEn: "🌎 Americas" },
  { key: "asia",         labelFr: "🌏 Asie",      labelEn: "🌏 Asia" },
  { key: "middle-east",  labelFr: "🕌 M-Orient",  labelEn: "🕌 Mid-East" },
  { key: "oceania",      labelFr: "🇦🇺 Océanie",  labelEn: "🇦🇺 Oceania" },
];

const REC_COLORS: Record<DealRecommendation, string> = {
  USE_MILES: "#3b82f6",
  NEUTRAL:   "#10b981",
  USE_CASH:  "#f59e0b",
};

const REC_LABELS_FR: Record<DealRecommendation, string> = {
  USE_MILES: "MILES GAGNENT",
  NEUTRAL:   "SI TU AS LES MILES",
  USE_CASH:  "CASH GAGNE",
};

const REC_LABELS_EN: Record<DealRecommendation, string> = {
  USE_MILES: "MILES WIN",
  NEUTRAL:   "IF YOU HAVE MILES",
  USE_CASH:  "CASH WINS",
};

// SVG viewBox: 0 0 400 80. Points mapped into y ∈ [5, 75].
function buildSparkline(monthlyPrices: MonthlyPrice[]): {
  polylinePoints: string;
  areaPath: string;
  dots: { x: number; y: number; price: number; isBest: boolean; isWorst: boolean }[];
  minPrice: number;
  maxPrice: number;
  minIdx: number;
  maxIdx: number;
} {
  const prices = monthlyPrices.map((m) => m.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;

  const dots = monthlyPrices.map((m, i) => {
    const x = (i / 11) * 400;
    const y = 75 - ((m.price - minPrice) / range) * 70;
    return { x, y, price: m.price, isBest: false, isWorst: false };
  });

  const minIdx = prices.indexOf(minPrice);
  const maxIdx = prices.indexOf(maxPrice);

  dots[minIdx].isBest = true;
  dots[maxIdx].isWorst = true;

  const polylinePoints = dots.map((d) => `${d.x.toFixed(1)},${d.y.toFixed(1)}`).join(" ");
  const areaPath = `M0,80 L${dots.map((d) => `${d.x.toFixed(1)},${d.y.toFixed(1)}`).join(" L")} L400,80 Z`;

  return { polylinePoints, areaPath, dots, minPrice, maxPrice, minIdx, maxIdx };
}

export function PriceChart({ histories, destinations, lang }: Props) {
  const recLabels = lang === "fr" ? REC_LABELS_FR : REC_LABELS_EN;

  // Default: Africa → first Africa destination (CMN = Casablanca)
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("africa");
  const [selectedIata, setSelectedIata] = useState<string>("CMN");

  const filteredDests = useMemo(
    () =>
      regionFilter === "all"
        ? destinations
        : destinations.filter((d) => d.region === regionFilter),
    [destinations, regionFilter]
  );

  const handleRegionChange = (key: RegionFilter) => {
    setRegionFilter(key);
    const first = key === "all" ? destinations[0] : destinations.find((d) => d.region === key);
    if (first) setSelectedIata(first.iata);
  };

  const selectedDest = destinations.find((d) => d.iata === selectedIata) ?? destinations[0];
  const history = histories.find((h) => h.iata === selectedIata) ?? histories[0];
  const { monthlyPrices, bestMonths, worstMonths } = history;

  const bestMonthLabels = bestMonths.map((i) => monthlyPrices[i].monthLabel);
  const worstMonthLabels = worstMonths.map((i) => monthlyPrices[i].monthLabel);
  const cheapestMonth = monthlyPrices[bestMonths[0] ?? 0];
  const chartColor = REC_COLORS[cheapestMonth.recommendation];

  const { polylinePoints, areaPath, dots, minPrice, maxPrice, minIdx, maxIdx } =
    buildSparkline(monthlyPrices);

  // x-axis label positions (every other month: Jan Mar Mai Jul Sep Nov)
  const xAxisLabels = [0, 2, 4, 6, 8, 10].map((i) => ({
    x: (i / 11) * 400,
    label: monthlyPrices[i].monthLabel,
  }));

  const gradId = `grad-${selectedIata}`;

  return (
    <div>
      {/* Region filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none -mx-4 px-4">
        {REGION_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => handleRegionChange(f.key)}
            aria-pressed={regionFilter === f.key}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
              regionFilter === f.key
                ? "bg-primary/15 border-primary/35 text-blue-400"
                : "bg-transparent border-border text-muted hover:text-fg hover:border-border/60"
            }`}
          >
            {lang === "fr" ? f.labelFr : f.labelEn}
          </button>
        ))}
      </div>

      {/* Destination pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none -mx-4 px-4">
        {filteredDests.map((d) => (
          <button
            key={d.iata}
            onClick={() => setSelectedIata(d.iata)}
            aria-pressed={selectedIata === d.iata}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
              selectedIata === d.iata
                ? "bg-primary/15 border-primary/35 text-blue-400"
                : "bg-transparent border-border text-muted hover:text-fg hover:border-border/60"
            }`}
          >
            {d.flag} {d.city}
          </button>
        ))}
      </div>

      {/* Chart card */}
      <div className="bg-surface border border-border rounded-2xl p-5">
        {/* Destination header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{selectedDest.flag}</span>
          <div>
            <div className="font-black text-fg text-base">{selectedDest.city}</div>
            <div className="text-xs text-muted">{selectedDest.country} · depuis Dakar (DSS)</div>
          </div>
        </div>

        {/* Sparkline SVG */}
        <div className="relative">
          <svg
            viewBox="0 0 400 90"
            className="w-full"
            style={{ height: "120px" }}
            aria-label={`Graphique des prix pour ${selectedDest.city}`}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColor} stopOpacity={0.25} />
                <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Area fill */}
            <path d={areaPath} fill={`url(#${gradId})`} />

            {/* Line */}
            <polyline
              points={polylinePoints}
              fill="none"
              stroke={chartColor}
              strokeWidth={2}
              strokeLinejoin="round"
            />

            {/* Dots */}
            {dots.map((dot, i) => (
              <circle
                key={i}
                cx={dot.x}
                cy={dot.y}
                r={dot.isBest || dot.isWorst ? 4 : 2.5}
                fill={dot.isBest ? "#10b981" : dot.isWorst ? "#ef4444" : chartColor}
                opacity={dot.isBest || dot.isWorst ? 1 : 0.6}
              />
            ))}

            {/* Min price label */}
            <text
              x={dots[minIdx].x + (minIdx < 6 ? 6 : -6)}
              y={dots[minIdx].y - 5}
              textAnchor={minIdx < 6 ? "start" : "end"}
              fontSize={9}
              fill="#10b981"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              ${minPrice}
            </text>

            {/* Max price label */}
            <text
              x={dots[maxIdx].x + (maxIdx < 6 ? 6 : -6)}
              y={dots[maxIdx].y - 5}
              textAnchor={maxIdx < 6 ? "start" : "end"}
              fontSize={9}
              fill="#ef4444"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              ${maxPrice}
            </text>

            {/* X-axis month labels */}
            {xAxisLabels.map(({ x, label }) => (
              <text
                key={label}
                x={x}
                y={88}
                textAnchor="middle"
                fontSize={8}
                fill="#64748b"
                fontFamily="sans-serif"
              >
                {label}
              </text>
            ))}
          </svg>
        </div>

        {/* Best / worst month badges */}
        <div className="flex gap-3 mt-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-success/10 border border-success/25 rounded-lg px-3 py-1.5">
            <span className="text-success text-xs font-bold">✓</span>
            <span className="text-success text-xs font-semibold">{bestMonthLabels.join(" · ")}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-1.5">
            <span className="text-red-400 text-xs font-bold">✕</span>
            <span className="text-red-400 text-xs font-semibold">{worstMonthLabels.join(" · ")}</span>
          </div>
        </div>

        {/* KEZA note */}
        <div
          className="mt-3 rounded-xl px-4 py-3 text-xs"
          style={{
            backgroundColor: `${REC_COLORS[cheapestMonth.recommendation]}15`,
            border: `1px solid ${REC_COLORS[cheapestMonth.recommendation]}30`,
          }}
        >
          <span className="mr-1">💡</span>
          <span className="text-muted">
            En{" "}
            <strong style={{ color: REC_COLORS[cheapestMonth.recommendation] }}>
              {cheapestMonth.monthLabel}
            </strong>
            , tes miles valent{" "}
            <strong style={{ color: REC_COLORS[cheapestMonth.recommendation] }}>
              {cheapestMonth.cpm.toFixed(1)}¢/mile
            </strong>{" "}
            →{" "}
            <strong style={{ color: REC_COLORS[cheapestMonth.recommendation] }}>
              {recLabels[cheapestMonth.recommendation]}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add app/prix/PriceChart.tsx
git commit -m "feat: add PriceChart component — sparkline SVG with region/destination pills"
```

---

## Task 4: Create `app/prix/page.tsx` — SSG page

**Files:**
- Create: `app/prix/page.tsx`

- [ ] **Step 1: Create `app/prix/page.tsx`**

```typescript
// app/prix/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { DESTINATIONS } from "@/data/destinations";
import { getAllDestinationPriceHistories } from "@/lib/priceHistory";
import { PriceChart } from "./PriceChart";

export const metadata: Metadata = {
  title: "Meilleur moment pour voyager | KEZA",
  description:
    "Découvrez le meilleur mois pour voyager vers 20 destinations depuis Dakar — prix cash et recommandation miles estimés mois par mois.",
  openGraph: {
    title: "Meilleur moment pour voyager | KEZA",
    description:
      "20 destinations · prix estimés mois par mois · miles vs cash recalculé chaque mois.",
    url: "https://keza-taupe.vercel.app/prix",
  },
};

// Computed at build time — no client JS needed for this calculation
const ALL_HISTORIES = getAllDestinationPriceHistories();

export default function PrixPage() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

        {/* Back link */}
        <Link href="/" className="text-xs text-muted hover:text-fg transition-colors">
          ← Retour
        </Link>

        {/* Hero */}
        <div className="mt-6 mb-8">
          <h1 className="text-3xl sm:text-4xl font-black leading-tight">
            <span className="bg-gradient-to-br from-blue-300 via-primary to-blue-500 bg-clip-text text-transparent">
              Meilleur moment
            </span>
            <span className="text-fg"> pour voyager</span>
          </h1>
          <p className="text-sm text-muted mt-2">
            {DESTINATIONS.length} destinations · prix estimés depuis Dakar · clique pour explorer
          </p>
        </div>

        {/* Interactive chart */}
        <PriceChart
          histories={ALL_HISTORIES}
          destinations={DESTINATIONS}
          lang="fr"
        />

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-colors"
          >
            ✈ Rechercher un vol
          </Link>
        </div>

      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx tsc --noEmit 2>&1 | head -10
```

Expected: no output.

- [ ] **Step 3: Run all tests to confirm no regressions**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest --no-coverage 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add app/prix/page.tsx
git commit -m "feat: add /prix SSG page — best month to travel with server-computed histories"
```

---

## Task 5: Wire up — Header + Sitemap

**Files:**
- Modify: `components/Header.tsx`
- Modify: `app/sitemap.ts`

- [ ] **Step 1: Add "Prix" to `components/Header.tsx`**

Read `components/Header.tsx`. The current NAV is:

```typescript
const NAV = {
  fr: [
    { label: "Comment ça marche", href: "/#how" },
    { label: "Calculateur", href: "/calculateur" },
    { label: "Carte", href: "/carte" },
    { label: "Programmes", href: "/programmes" },
    { label: "Pour les entreprises", href: "/entreprises" },
  ],
  en: [
    { label: "How it works", href: "/#how" },
    { label: "Calculator", href: "/calculateur" },
    { label: "Map", href: "/carte" },
    { label: "Programs", href: "/programmes" },
    { label: "For Business", href: "/entreprises" },
  ],
};
```

Replace it with:

```typescript
const NAV = {
  fr: [
    { label: "Comment ça marche", href: "/#how" },
    { label: "Calculateur", href: "/calculateur" },
    { label: "Carte", href: "/carte" },
    { label: "Prix", href: "/prix" },
    { label: "Programmes", href: "/programmes" },
    { label: "Pour les entreprises", href: "/entreprises" },
  ],
  en: [
    { label: "How it works", href: "/#how" },
    { label: "Calculator", href: "/calculateur" },
    { label: "Map", href: "/carte" },
    { label: "Prices", href: "/prix" },
    { label: "Programs", href: "/programmes" },
    { label: "For Business", href: "/entreprises" },
  ],
};
```

- [ ] **Step 2: Add `/prix` to `app/sitemap.ts`**

Read `app/sitemap.ts`. Find the `/carte` entry and add `/prix` immediately after it:

```typescript
    {
      url: `${BASE_URL}/carte`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/prix`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
```

- [ ] **Step 3: Verify TypeScript and all tests**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx tsc --noEmit 2>&1 | head -10
npx jest --no-coverage 2>&1 | tail -10
```

Expected: no errors, all tests pass.

- [ ] **Step 4: Run a local build to confirm /prix is a static page**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx next build 2>&1 | tail -20
```

Expected: `○ /prix` listed as a static page, `✓ Compiled successfully`.

- [ ] **Step 5: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add components/Header.tsx app/sitemap.ts
git commit -m "feat: wire up /prix — nav link Prix/Prices, sitemap entry"
```

---

## Final Verification

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest --no-coverage 2>&1 | tail -5
npx next build 2>&1 | grep -E "(/prix|Compiled|error)" | head -10
```

Expected: all tests pass, `/prix` is `○` (static), no build errors.
