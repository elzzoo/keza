# Loyalty Programs Ranking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/programmes` page and homepage widget ranking 33 loyalty programs (airlines, hotels, transfer cards) by Score KEZA with client-side filters.

**Architecture:** Static data in `data/programs.ts` (source of truth). Server Component SSG page at `app/programmes/page.tsx` with a `"use client"` `ProgramsTable.tsx` child for interactive filters. Compact `ProgramsWidget.tsx` on homepage showing top 5.

**Tech Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · custom tokens (text-fg, text-muted, bg-surface, bg-surface-2, border-border, text-primary, text-success, text-warning)

---

## File Map

| Status | Path | Role |
|--------|------|------|
| CREATE | `data/programs.ts` | Source of truth — 33 programs, types, sorted array |
| CREATE | `__tests__/data/programs.test.ts` | Data integrity tests |
| MODIFY | `lib/analytics.ts` | Add `trackProgramClick` |
| CREATE | `components/ProgramsWidget.tsx` | Top-5 widget for homepage |
| CREATE | `app/programmes/ProgramsTable.tsx` | "use client" — filters + sortable table |
| CREATE | `app/programmes/page.tsx` | Server Component SSG + SEO metadata |
| MODIFY | `app/page.tsx` | Add `ProgramsWidget` below `MilesCalculatorWidget` |
| MODIFY | `components/Header.tsx` | Add "Programmes" nav link |
| MODIFY | `app/sitemap.ts` | Add `/programmes` entry |

---

## Task 1: `data/programs.ts` — Types + 33 programs

**Files:**
- Create: `data/programs.ts`
- Create: `__tests__/data/programs.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/data/programs.test.ts
import { PROGRAMS, type LoyaltyProgram } from "@/data/programs";

describe("PROGRAMS data integrity", () => {
  it("contains exactly 33 programs", () => {
    expect(PROGRAMS).toHaveLength(33);
  });

  it("every program has required fields", () => {
    PROGRAMS.forEach((p: LoyaltyProgram) => {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.company).toBeTruthy();
      expect(["airline", "hotel", "transfer"]).toContain(p.type);
      expect(Array.isArray(p.regions)).toBe(true);
      expect(typeof p.cpmCents).toBe("number");
      expect(Array.isArray(p.transferPartners)).toBe(true);
      expect(p.bestUse).toBeTruthy();
      expect(p.flag).toBeTruthy();
      expect(typeof p.score).toBe("number");
    });
  });

  it("all scores are between 0 and 100", () => {
    PROGRAMS.forEach((p) => {
      expect(p.score).toBeGreaterThanOrEqual(0);
      expect(p.score).toBeLessThanOrEqual(100);
    });
  });

  it("all cpmCents are plausible (> 0 and < 5)", () => {
    PROGRAMS.forEach((p) => {
      expect(p.cpmCents).toBeGreaterThan(0);
      expect(p.cpmCents).toBeLessThan(5);
    });
  });

  it("all ids are unique", () => {
    const ids = PROGRAMS.map((p) => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(PROGRAMS.length);
  });

  it("top program by score has score >= 80", () => {
    const top = Math.max(...PROGRAMS.map((p) => p.score));
    expect(top).toBeGreaterThanOrEqual(80);
  });

  it("PROGRAMS is sorted by score descending", () => {
    for (let i = 0; i < PROGRAMS.length - 1; i++) {
      expect(PROGRAMS[i].score).toBeGreaterThanOrEqual(PROGRAMS[i + 1].score);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/data/programs.test.ts --no-coverage 2>&1 | tail -20
```

Expected: `Cannot find module '@/data/programs'`

- [ ] **Step 3: Create `data/programs.ts`**

```typescript
// data/programs.ts

export type Alliance = "star" | "oneworld" | "skyteam";
export type ProgramType = "airline" | "hotel" | "transfer";

export interface LoyaltyProgram {
  id: string;
  name: string;
  company: string;
  type: ProgramType;
  alliance?: Alliance;
  regions: string[];
  cpmCents: number;        // estimated cents per mile/point
  transferPartners: string[]; // card program slugs
  bestUse: string;
  bestUseFr: string;
  flag: string;
  score: number;           // 0–100, KEZA score
}

// Sorted by score descending
export const PROGRAMS: LoyaltyProgram[] = [
  // ── Transfer Cards (highest flexibility) ──────────────────────────────────
  {
    id: "amex-mr",
    name: "Membership Rewards",
    company: "American Express",
    type: "transfer",
    regions: ["americas", "europe", "asia", "africa", "middle-east"],
    cpmCents: 2.0,
    transferPartners: [],
    bestUse: "Transfer to 20+ airline & hotel partners",
    bestUseFr: "Transfert vers 20+ compagnies & hôtels",
    flag: "🇺🇸",
    score: 92,
  },
  {
    id: "chase-ur",
    name: "Ultimate Rewards",
    company: "Chase",
    type: "transfer",
    regions: ["americas", "europe", "asia"],
    cpmCents: 2.0,
    transferPartners: [],
    bestUse: "Transfer to United, Hyatt, British Airways",
    bestUseFr: "Transfert vers United, Hyatt, British Airways",
    flag: "🇺🇸",
    score: 90,
  },
  {
    id: "aeroplan",
    name: "Aeroplan",
    company: "Air Canada",
    type: "airline",
    alliance: "star",
    regions: ["americas", "europe", "asia", "africa"],
    cpmCents: 1.8,
    transferPartners: ["amex", "chase", "capital-one"],
    bestUse: "Star Alliance business class sweet spots",
    bestUseFr: "Business class Star Alliance — sweet spots unbeatable",
    flag: "🇨🇦",
    score: 87,
  },
  {
    id: "capital-one",
    name: "Capital One Miles",
    company: "Capital One",
    type: "transfer",
    regions: ["americas", "europe", "africa"],
    cpmCents: 1.7,
    transferPartners: [],
    bestUse: "Transfer to Air Canada, Turkish, Flying Blue",
    bestUseFr: "Transfert vers Aeroplan, Turkish, Flying Blue",
    flag: "🇺🇸",
    score: 84,
  },
  {
    id: "flying-blue",
    name: "Flying Blue",
    company: "Air France / KLM",
    type: "airline",
    alliance: "skyteam",
    regions: ["europe", "africa", "americas"],
    cpmCents: 1.6,
    transferPartners: ["amex", "chase", "capital-one", "citi"],
    bestUse: "Promo awards + Africa routes",
    bestUseFr: "Promo Awards + liaisons Afrique-Europe",
    flag: "🇫🇷",
    score: 82,
  },
  {
    id: "virgin-flying-club",
    name: "Flying Club",
    company: "Virgin Atlantic",
    type: "airline",
    alliance: undefined,
    regions: ["europe", "americas", "asia", "africa"],
    cpmCents: 1.8,
    transferPartners: ["amex", "chase", "capital-one", "citi"],
    bestUse: "Delta One & ANA business class",
    bestUseFr: "Business class Delta One & ANA",
    flag: "🇬🇧",
    score: 80,
  },
  // ── Mid-High Tier ──────────────────────────────────────────────────────────
  {
    id: "citi-thankyou",
    name: "ThankYou Points",
    company: "Citi",
    type: "transfer",
    regions: ["americas", "europe", "middle-east"],
    cpmCents: 1.6,
    transferPartners: [],
    bestUse: "Transfer to Turkish, Avianca, Flying Blue",
    bestUseFr: "Transfert vers Turkish, Avianca, Flying Blue",
    flag: "🇺🇸",
    score: 76,
  },
  {
    id: "bilt",
    name: "Bilt Rewards",
    company: "Bilt",
    type: "transfer",
    regions: ["americas"],
    cpmCents: 1.7,
    transferPartners: [],
    bestUse: "Hyatt, United, American Airlines",
    bestUseFr: "Hyatt, United, American Airlines",
    flag: "🇺🇸",
    score: 74,
  },
  {
    id: "ana-mileage",
    name: "ANA Mileage Club",
    company: "ANA",
    type: "airline",
    alliance: "star",
    regions: ["asia", "americas", "europe"],
    cpmCents: 1.8,
    transferPartners: ["amex", "chase"],
    bestUse: "Round-the-world & Japan business class",
    bestUseFr: "Tour du monde & business class Japon",
    flag: "🇯🇵",
    score: 72,
  },
  {
    id: "krisflyer",
    name: "KrisFlyer",
    company: "Singapore Airlines",
    type: "airline",
    alliance: "star",
    regions: ["asia", "europe", "americas", "oceania"],
    cpmCents: 1.4,
    transferPartners: ["amex", "capital-one"],
    bestUse: "Singapore Suites & business class Asia",
    bestUseFr: "Singapore Suites & business class Asie",
    flag: "🇸🇬",
    score: 70,
  },
  {
    id: "alaska-mileage",
    name: "Mileage Plan",
    company: "Alaska Airlines",
    type: "airline",
    alliance: undefined,
    regions: ["americas", "asia", "oceania"],
    cpmCents: 1.8,
    transferPartners: ["amex"],
    bestUse: "First class on Cathay Pacific & Emirates",
    bestUseFr: "Première classe Cathay Pacific & Emirates",
    flag: "🇺🇸",
    score: 69,
  },
  {
    id: "hyatt",
    name: "World of Hyatt",
    company: "Hyatt",
    type: "hotel",
    regions: ["americas", "europe", "asia", "middle-east"],
    cpmCents: 1.7,
    transferPartners: ["chase"],
    bestUse: "High-end hotels at low category rates",
    bestUseFr: "Hôtels premium aux meilleurs tarifs catégorie",
    flag: "🇺🇸",
    score: 67,
  },
  {
    id: "british-avios",
    name: "Avios",
    company: "British Airways",
    type: "airline",
    alliance: "oneworld",
    regions: ["europe", "americas", "africa", "asia"],
    cpmCents: 1.5,
    transferPartners: ["amex", "chase", "capital-one"],
    bestUse: "Short-haul economy & Iberia flights",
    bestUseFr: "Court-courrier economy & vols Iberia",
    flag: "🇬🇧",
    score: 66,
  },
  {
    id: "jal-mileage",
    name: "JAL Mileage Bank",
    company: "Japan Airlines",
    type: "airline",
    alliance: "oneworld",
    regions: ["asia", "americas", "europe"],
    cpmCents: 1.6,
    transferPartners: ["amex", "chase"],
    bestUse: "Japan & Asia first class",
    bestUseFr: "Première classe Japon & Asie",
    flag: "🇯🇵",
    score: 65,
  },
  {
    id: "turkish-miles",
    name: "Miles&Smiles",
    company: "Turkish Airlines",
    type: "airline",
    alliance: "star",
    regions: ["europe", "middle-east", "africa", "asia", "americas"],
    cpmCents: 1.5,
    transferPartners: ["citi", "capital-one"],
    bestUse: "Business class at low mile rates",
    bestUseFr: "Business class à faible tarif miles",
    flag: "🇹🇷",
    score: 65,
  },
  // ── Mid Tier ───────────────────────────────────────────────────────────────
  {
    id: "ethiopian-sheba",
    name: "ShebaMiles",
    company: "Ethiopian Airlines",
    type: "airline",
    alliance: "star",
    regions: ["africa", "middle-east", "europe", "asia"],
    cpmCents: 1.6,
    transferPartners: ["amex"],
    bestUse: "Africa intercontinental routes",
    bestUseFr: "Liaisons intercontinentales Afrique",
    flag: "🇪🇹",
    score: 62,
  },
  {
    id: "united-mileageplus",
    name: "MileagePlus",
    company: "United Airlines",
    type: "airline",
    alliance: "star",
    regions: ["americas", "europe", "asia", "africa"],
    cpmCents: 1.2,
    transferPartners: ["chase"],
    bestUse: "Star Alliance partners & Polaris business",
    bestUseFr: "Partenaires Star Alliance & business Polaris",
    flag: "🇺🇸",
    score: 60,
  },
  {
    id: "cathay-asia-miles",
    name: "Asia Miles",
    company: "Cathay Pacific",
    type: "airline",
    alliance: "oneworld",
    regions: ["asia", "oceania", "americas", "europe"],
    cpmCents: 1.2,
    transferPartners: ["amex", "chase", "capital-one"],
    bestUse: "Business & first class Asia-Pacific",
    bestUseFr: "Business & première classe Asie-Pacifique",
    flag: "🇭🇰",
    score: 58,
  },
  {
    id: "iberia-plus",
    name: "Iberia Plus",
    company: "Iberia",
    type: "airline",
    alliance: "oneworld",
    regions: ["europe", "americas", "africa"],
    cpmCents: 1.3,
    transferPartners: ["amex", "chase"],
    bestUse: "Madrid hub & Latin America routes",
    bestUseFr: "Hub Madrid & liaisons Amérique Latine",
    flag: "🇪🇸",
    score: 56,
  },
  {
    id: "qantas",
    name: "Frequent Flyer",
    company: "Qantas",
    type: "airline",
    alliance: undefined,
    regions: ["oceania", "asia", "americas", "europe"],
    cpmCents: 1.4,
    transferPartners: ["amex"],
    bestUse: "Qantas & Oneworld routes to Australia",
    bestUseFr: "Qantas & Oneworld vers l'Australie",
    flag: "🇦🇺",
    score: 55,
  },
  {
    id: "etihad-guest",
    name: "Etihad Guest",
    company: "Etihad Airways",
    type: "airline",
    alliance: undefined,
    regions: ["middle-east", "europe", "africa", "asia", "americas"],
    cpmCents: 1.2,
    transferPartners: ["amex", "citi"],
    bestUse: "The Residence first-class suite",
    bestUseFr: "Suite première classe The Residence",
    flag: "🇦🇪",
    score: 52,
  },
  {
    id: "marriott-bonvoy",
    name: "Marriott Bonvoy",
    company: "Marriott",
    type: "hotel",
    regions: ["americas", "europe", "asia", "middle-east", "africa"],
    cpmCents: 0.7,
    transferPartners: ["amex", "chase", "citi", "capital-one"],
    bestUse: "Category 1–4 hotels & airline transfers",
    bestUseFr: "Hôtels catégorie 1-4 & transferts compagnies",
    flag: "🇺🇸",
    score: 52,
  },
  {
    id: "hilton-honors",
    name: "Hilton Honors",
    company: "Hilton",
    type: "hotel",
    regions: ["americas", "europe", "asia", "africa", "middle-east"],
    cpmCents: 0.5,
    transferPartners: ["amex"],
    bestUse: "Fifth night free & premium properties",
    bestUseFr: "5e nuit gratuite & propriétés premium",
    flag: "🇺🇸",
    score: 50,
  },
  // ── Lower Tier ─────────────────────────────────────────────────────────────
  {
    id: "ihg-one",
    name: "IHG One Rewards",
    company: "IHG",
    type: "hotel",
    regions: ["americas", "europe", "asia", "africa"],
    cpmCents: 0.5,
    transferPartners: ["chase"],
    bestUse: "InterContinental & Kimpton properties",
    bestUseFr: "Propriétés InterContinental & Kimpton",
    flag: "🇬🇧",
    score: 46,
  },
  {
    id: "korean-skypass",
    name: "SKYPASS",
    company: "Korean Air",
    type: "airline",
    alliance: "skyteam",
    regions: ["asia", "americas", "europe"],
    cpmCents: 1.5,
    transferPartners: ["chase"],
    bestUse: "Korean Air first class & Prestige",
    bestUseFr: "Première classe & Prestige Korean Air",
    flag: "🇰🇷",
    score: 44,
  },
  {
    id: "accor-all",
    name: "ALL — Accor Live Limitless",
    company: "Accor",
    type: "hotel",
    regions: ["europe", "africa", "asia", "middle-east"],
    cpmCents: 0.4,
    transferPartners: [],
    bestUse: "Sofitel, Novotel, Mercure properties",
    bestUseFr: "Propriétés Sofitel, Novotel, Mercure",
    flag: "🇫🇷",
    score: 44,
  },
  {
    id: "qatar-privilege",
    name: "Privilege Club",
    company: "Qatar Airways",
    type: "airline",
    alliance: "oneworld",
    regions: ["middle-east", "europe", "africa", "asia", "americas"],
    cpmCents: 1.3,
    transferPartners: ["amex"],
    bestUse: "Qsuites business class",
    bestUseFr: "Business class Qsuites",
    flag: "🇶🇦",
    score: 42,
  },
  {
    id: "aeromexico-premier",
    name: "Club Premier",
    company: "Aeromexico",
    type: "airline",
    alliance: "skyteam",
    regions: ["americas", "europe"],
    cpmCents: 1.1,
    transferPartners: ["amex"],
    bestUse: "Mexico & Latin America routes",
    bestUseFr: "Liaisons Mexique & Amérique Latine",
    flag: "🇲🇽",
    score: 40,
  },
  {
    id: "aa-aadvantage",
    name: "AAdvantage",
    company: "American Airlines",
    type: "airline",
    alliance: "oneworld",
    regions: ["americas", "europe", "asia", "africa"],
    cpmCents: 1.0,
    transferPartners: ["citi", "bilt"],
    bestUse: "Oneworld partner awards",
    bestUseFr: "Récompenses partenaires Oneworld",
    flag: "🇺🇸",
    score: 40,
  },
  {
    id: "emirates-skywards",
    name: "Emirates Skywards",
    company: "Emirates",
    type: "airline",
    alliance: undefined,
    regions: ["middle-east", "europe", "africa", "asia", "americas"],
    cpmCents: 0.9,
    transferPartners: ["amex", "citi"],
    bestUse: "Emirates First class A380",
    bestUseFr: "Première classe Emirates A380",
    flag: "🇦🇪",
    score: 38,
  },
  {
    id: "delta-skymiles",
    name: "SkyMiles",
    company: "Delta Air Lines",
    type: "airline",
    alliance: "skyteam",
    regions: ["americas", "europe", "asia", "africa"],
    cpmCents: 1.0,
    transferPartners: ["amex"],
    bestUse: "Delta One & partner business class",
    bestUseFr: "Delta One & business class partenaires",
    flag: "🇺🇸",
    score: 36,
  },
  {
    id: "lufthansa-miles",
    name: "Miles & More",
    company: "Lufthansa Group",
    type: "airline",
    alliance: "star",
    regions: ["europe", "americas", "africa", "asia"],
    cpmCents: 1.1,
    transferPartners: ["amex"],
    bestUse: "Lufthansa First class & HON Circle",
    bestUseFr: "Première classe Lufthansa & HON Circle",
    flag: "🇩🇪",
    score: 35,
  },
  {
    id: "finnair-plus",
    name: "Finnair Plus",
    company: "Finnair",
    type: "airline",
    alliance: "oneworld",
    regions: ["europe", "asia"],
    cpmCents: 1.0,
    transferPartners: ["amex"],
    bestUse: "Nordic Europe & Asia routes via Helsinki",
    bestUseFr: "Europe nordique & Asie via Helsinki",
    flag: "🇫🇮",
    score: 32,
  },
];
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/data/programs.test.ts --no-coverage 2>&1 | tail -20
```

Expected: `Tests: 7 passed, 7 total`

- [ ] **Step 5: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add data/programs.ts __tests__/data/programs.test.ts
git commit -m "feat: add loyalty programs data — 33 programs with KEZA scores"
```

---

## Task 2: `lib/analytics.ts` — Add `trackProgramClick`

**Files:**
- Modify: `lib/analytics.ts`

- [ ] **Step 1: Add `trackProgramClick` at the end of `lib/analytics.ts`**

Open `lib/analytics.ts` and append after the last function:

```typescript
/** User clicks a program in ProgramsWidget or ProgramsTable */
export function trackProgramClick(params: { id: string; name: string }) {
  track("Program Click", { program_id: params.id, program_name: params.name });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (no errors)

- [ ] **Step 3: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add lib/analytics.ts
git commit -m "feat: add trackProgramClick analytics event"
```

---

## Task 3: `components/ProgramsWidget.tsx` — Homepage top-5 widget

**Files:**
- Create: `components/ProgramsWidget.tsx`

This component is a pure Client Component. It takes the top 5 programs (sorted by score, already sorted in `data/programs.ts`) and renders them in a compact card list.

- [ ] **Step 1: Create `components/ProgramsWidget.tsx`**

```typescript
// components/ProgramsWidget.tsx
"use client";

import { PROGRAMS } from "@/data/programs";
import { trackProgramClick } from "@/lib/analytics";

interface Props {
  lang: "fr" | "en";
}

const L = {
  fr: { title: "Top programmes", seeAll: "Voir tout →", score: "Score KEZA", updated: "Mis à jour · avr. 2026" },
  en: { title: "Top programs",   seeAll: "See all →",   score: "KEZA Score", updated: "Updated · Apr 2026" },
};

const TOP5 = PROGRAMS.slice(0, 5);

export function ProgramsWidget({ lang }: Props) {
  const t = L[lang];

  return (
    <div className="bg-surface border border-border rounded-2xl p-4">
      {/* Header */}
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

      {/* Programs list */}
      <div className="space-y-2">
        {TOP5.map((program, index) => (
          <a
            key={program.id}
            href={`/programmes#${program.id}`}
            onClick={() => trackProgramClick({ id: program.id, name: program.name })}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-2 transition-colors group cursor-pointer"
          >
            {/* Rank */}
            <span className="flex-shrink-0 w-5 text-center text-xs font-black text-muted">
              #{index + 1}
            </span>

            {/* Flag + name */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{program.flag}</span>
                <span className="text-xs font-bold text-fg truncate">{program.name}</span>
              </div>
              <p className="text-[10px] text-muted truncate mt-0.5">
                {lang === "fr" ? program.bestUseFr : program.bestUse}
              </p>
            </div>

            {/* Score */}
            <div className="flex-shrink-0 text-right">
              <span className="text-sm font-black text-primary">{program.score}</span>
              <span className="text-[10px] text-muted">/100</span>
            </div>
          </a>
        ))}
      </div>

      {/* Footer */}
      <p className="text-[10px] text-muted mt-3 pt-3 border-t border-border/50">{t.updated}</p>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (no errors)

- [ ] **Step 3: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add components/ProgramsWidget.tsx
git commit -m "feat: add ProgramsWidget — top 5 loyalty programs for homepage"
```

---

## Task 4: `app/programmes/ProgramsTable.tsx` — Filterable, sortable table

**Files:**
- Create: `app/programmes/ProgramsTable.tsx`

This is a `"use client"` component that receives all programs as a prop and handles filtering/sorting in the browser.

- [ ] **Step 1: Create `app/programmes/ProgramsTable.tsx`**

```typescript
// app/programmes/ProgramsTable.tsx
"use client";

import { useState, useMemo } from "react";
import { PROGRAMS, type LoyaltyProgram, type ProgramType, type Alliance } from "@/data/programs";
import { trackProgramClick } from "@/lib/analytics";

type SortKey = "score" | "cpmCents";
type SortDir = "desc" | "asc";
type TypeFilter = "all" | ProgramType;
type AllianceFilter = "all" | Alliance;

const L = {
  fr: {
    filterAll: "Tous",
    filterAirline: "✈ Airline",
    filterHotel: "🏨 Hôtel",
    filterTransfer: "💳 Transfert",
    alliances: "Alliance",
    colRank: "#",
    colProgram: "Programme",
    colScore: "Score",
    colCpm: "Valeur/mile",
    colPartners: "Partenaires",
    colUse: "Meilleur usage",
    sortAsc: "↑",
    sortDesc: "↓",
    noCpm: "—",
  },
  en: {
    filterAll: "All",
    filterAirline: "✈ Airline",
    filterHotel: "🏨 Hotel",
    filterTransfer: "💳 Transfer",
    alliances: "Alliance",
    colRank: "#",
    colProgram: "Program",
    colScore: "Score",
    colCpm: "Value/mile",
    colPartners: "Partners",
    colUse: "Best use",
    sortAsc: "↑",
    sortDesc: "↓",
    noCpm: "—",
  },
};

const PARTNER_LABELS: Record<string, string> = {
  amex: "Amex",
  chase: "Chase",
  citi: "Citi",
  "capital-one": "Cap1",
  bilt: "Bilt",
};

const ALLIANCE_FILTERS: { key: AllianceFilter; label: string }[] = [
  { key: "all",      label: "Toutes" },
  { key: "star",     label: "⭐ Star Alliance" },
  { key: "oneworld", label: "🌐 Oneworld" },
  { key: "skyteam",  label: "🌀 SkyTeam" },
];

export function ProgramsTable({ lang }: { lang: "fr" | "en" }) {
  const t = L[lang];
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [allianceFilter, setAllianceFilter] = useState<AllianceFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleAllianceFilter = (key: AllianceFilter) => {
    setAllianceFilter(key);
    // Alliance filter scopes to airline type — reset hotel/transfer selection
    if (key !== "all") setTypeFilter("all");
  };

  const filtered = useMemo(() => {
    let list = [...PROGRAMS];

    if (typeFilter !== "all") {
      list = list.filter((p) => p.type === typeFilter);
    }
    if (allianceFilter !== "all") {
      list = list.filter((p) => p.alliance === allianceFilter);
    }

    list.sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortDir === "desc" ? -diff : diff;
    });

    return list;
  }, [typeFilter, allianceFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <span className="text-border">↕</span>;
    return <span className="text-primary">{sortDir === "desc" ? "↓" : "↑"}</span>;
  };

  return (
    <div>
      {/* Type Filters */}
      <div className="flex gap-2 flex-wrap mb-3">
        {(["all", "airline", "hotel", "transfer"] as const).map((key) => {
          const label = key === "all" ? t.filterAll : key === "airline" ? t.filterAirline : key === "hotel" ? t.filterHotel : t.filterTransfer;
          return (
            <button
              key={key}
              onClick={() => { setTypeFilter(key); if (key !== "all" && key !== "airline") setAllianceFilter("all"); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                typeFilter === key
                  ? "bg-primary/15 border-primary/35 text-blue-400"
                  : "bg-transparent border-border text-muted hover:text-fg"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Alliance Filters */}
      <div className="flex gap-2 flex-wrap mb-5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {ALLIANCE_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => handleAllianceFilter(f.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
              allianceFilter === f.key
                ? "bg-primary/15 border-primary/35 text-blue-400"
                : "bg-transparent border-border text-muted hover:text-fg"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block bg-surface border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider w-10">{t.colRank}</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider">{t.colProgram}</th>
              <th
                className="text-right px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider cursor-pointer select-none hover:text-fg transition-colors"
                onClick={() => toggleSort("score")}
              >
                {t.colScore} {sortIcon("score")}
              </th>
              <th
                className="text-right px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider cursor-pointer select-none hover:text-fg transition-colors"
                onClick={() => toggleSort("cpmCents")}
              >
                {t.colCpm} {sortIcon("cpmCents")}
              </th>
              <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider hidden lg:table-cell">{t.colPartners}</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider hidden xl:table-cell">{t.colUse}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((program, index) => (
              <tr
                key={program.id}
                id={program.id}
                className="border-b border-border/50 hover:bg-surface-2 transition-colors cursor-pointer"
                onClick={() => trackProgramClick({ id: program.id, name: program.name })}
              >
                <td className="px-4 py-3 text-xs font-black text-muted">{index + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{program.flag}</span>
                    <div>
                      <div className="font-bold text-fg text-sm">{program.name}</div>
                      <div className="text-[11px] text-muted">{program.company}</div>
                    </div>
                    {program.alliance && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-surface-2 border border-border text-muted capitalize">
                        {program.alliance}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-base font-black text-primary">{program.score}</span>
                  <span className="text-xs text-muted">/100</span>
                </td>
                <td className="px-4 py-3 text-right font-bold text-fg">
                  {program.cpmCents.toFixed(1)}¢
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {program.transferPartners.length > 0
                      ? program.transferPartners.map((p) => (
                          <span key={p} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-blue-400">
                            {PARTNER_LABELS[p] ?? p}
                          </span>
                        ))
                      : <span className="text-[10px] text-muted">—</span>
                    }
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted hidden xl:table-cell max-w-[200px]">
                  {lang === "fr" ? program.bestUseFr : program.bestUse}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-2">
        {filtered.map((program, index) => (
          <div
            key={program.id}
            id={program.id}
            className="bg-surface border border-border rounded-xl p-4"
            onClick={() => trackProgramClick({ id: program.id, name: program.name })}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-muted w-5">#{index + 1}</span>
                <span className="text-lg">{program.flag}</span>
                <div>
                  <div className="font-bold text-fg text-sm">{program.name}</div>
                  <div className="text-[11px] text-muted">{program.company}</div>
                </div>
              </div>
              <div className="text-right">
                <div>
                  <span className="text-lg font-black text-primary">{program.score}</span>
                  <span className="text-xs text-muted">/100</span>
                </div>
                <div className="text-xs font-bold text-fg">{program.cpmCents.toFixed(1)}¢/mi</div>
              </div>
            </div>
            <p className="text-[11px] text-muted mt-2">
              {lang === "fr" ? program.bestUseFr : program.bestUse}
            </p>
            {program.transferPartners.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {program.transferPartners.map((p) => (
                  <span key={p} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-blue-400">
                    {PARTNER_LABELS[p] ?? p}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
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

Expected: no output (no errors)

- [ ] **Step 3: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add app/programmes/ProgramsTable.tsx
git commit -m "feat: add ProgramsTable — filterable sortable loyalty programs table"
```

---

## Task 5: `app/programmes/page.tsx` — SSG page + SEO

**Files:**
- Create: `app/programmes/page.tsx`

- [ ] **Step 1: Create `app/programmes/page.tsx`**

```typescript
// app/programmes/page.tsx
import type { Metadata } from "next";
import { ProgramsTable } from "./ProgramsTable";

export const metadata: Metadata = {
  title: "Meilleurs programmes miles & points 2026 | KEZA",
  description:
    "Comparez les 33 meilleurs programmes de fidélité : Flying Blue, Aeroplan, Chase UR, Amex MR… Score KEZA, valeur du mile, partenaires de transfert.",
  openGraph: {
    title: "Meilleurs programmes miles & points 2026 | KEZA",
    description: "Classement KEZA des 33 meilleurs programmes de fidélité — valeur du mile, partenaires, meilleur usage.",
    url: "https://keza-taupe.vercel.app/programmes",
  },
};

export default function ProgrammesPage() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Back link */}
        <a href="/" className="text-xs text-muted hover:text-fg transition-colors">
          ← Retour
        </a>

        {/* Hero */}
        <div className="mt-6 mb-8">
          <h1 className="text-3xl sm:text-4xl font-black leading-tight">
            <span className="bg-gradient-to-br from-blue-300 via-primary to-blue-500 bg-clip-text text-transparent">
              Programmes miles
            </span>
            <br />
            <span className="text-fg">Quel vaut vraiment le coup ?</span>
          </h1>
          <p className="text-sm text-muted mt-3 max-w-xl">
            33 programmes analysés — airlines, hôtels, cartes de transfert. Score KEZA calculé sur la valeur du mile, les partenaires disponibles et la flexibilité d'utilisation.
          </p>
          <p className="text-xs text-muted/60 mt-1">
            Mis à jour : avril 2026 · Sources : ThePointsGuy, NerdWallet, AwardWallet
          </p>
        </div>

        {/* Table */}
        <ProgramsTable lang="fr" />

        {/* Editorial note */}
        <div className="mt-10 bg-surface border border-border rounded-2xl p-5">
          <h2 className="text-sm font-bold text-fg mb-2">Comment KEZA calcule le Score</h2>
          <p className="text-xs text-muted leading-relaxed">
            Le Score KEZA (0–100) combine trois critères : la <strong className="text-fg">valeur estimée du mile</strong> (50%) basée sur les valuations de marché de ThePointsGuy et NerdWallet, le <strong className="text-fg">nombre de partenaires de transfert</strong> (30%) qui détermine la flexibilité d'alimentation du programme, et la <strong className="text-fg">flexibilité d'utilisation</strong> (20%) évaluant la facilité à obtenir des sièges prime. Les valeurs sont mises à jour manuellement 2 à 4 fois par an.
          </p>
        </div>

      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles and the page builds**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (no errors)

- [ ] **Step 3: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add app/programmes/page.tsx
git commit -m "feat: add /programmes page — SSG loyalty programs ranking with SEO metadata"
```

---

## Task 6: Wire up — Homepage, Header, Sitemap

**Files:**
- Modify: `app/page.tsx` (add ProgramsWidget import + render)
- Modify: `components/Header.tsx` (add "Programmes" nav link)
- Modify: `app/sitemap.ts` (add /programmes entry)

- [ ] **Step 1: Add `ProgramsWidget` to `app/page.tsx`**

Open `app/page.tsx`. Find the import block at the top and add:

```typescript
import { ProgramsWidget }          from "@/components/ProgramsWidget";
```

Then find this section in the JSX (around line 262):

```tsx
              {/* Calculateur (takes 1/3 on desktop, full width on mobile) */}
              <div className="lg:col-span-1 lg:sticky lg:top-20">
                <MilesCalculatorWidget lang={lang} />
              </div>
```

Replace it with:

```tsx
              {/* Calculateur + Programmes (takes 1/3 on desktop, full width on mobile) */}
              <div className="lg:col-span-1 lg:sticky lg:top-20 space-y-4">
                <MilesCalculatorWidget lang={lang} />
                <ProgramsWidget lang={lang} />
              </div>
```

- [ ] **Step 2: Add "Programmes" nav link to `components/Header.tsx`**

Open `components/Header.tsx`. Find the `NAV` constant:

```typescript
const NAV = {
  fr: [
    { label: "Comment ça marche", href: "/#how" },
    { label: "Calculateur", href: "/calculateur" },
    { label: "Pour les entreprises", href: "/entreprises" },
  ],
  en: [
    { label: "How it works", href: "/#how" },
    { label: "Calculator", href: "/calculateur" },
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
    { label: "Programmes", href: "/programmes" },
    { label: "Pour les entreprises", href: "/entreprises" },
  ],
  en: [
    { label: "How it works", href: "/#how" },
    { label: "Calculator", href: "/calculateur" },
    { label: "Programs", href: "/programmes" },
    { label: "For Business", href: "/entreprises" },
  ],
};
```

- [ ] **Step 3: Add `/programmes` to `app/sitemap.ts`**

Open `app/sitemap.ts`. Find the `/calculateur` entry:

```typescript
    {
      url: `${BASE_URL}/calculateur`,
      lastModified: now,
      priority: 0.8,
    },
```

Add `/programmes` immediately after:

```typescript
    {
      url: `${BASE_URL}/calculateur`,
      lastModified: now,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/programmes`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (no errors)

- [ ] **Step 5: Run all tests**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest --no-coverage 2>&1 | tail -20
```

Expected: all tests pass (including the 7 new programs tests + existing test suites)

- [ ] **Step 6: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add app/page.tsx components/Header.tsx app/sitemap.ts
git commit -m "feat: integrate ProgramsWidget on homepage, add nav link + sitemap entry"
```

---

## Final Verification

After all 6 tasks are complete, verify the build succeeds end-to-end:

```bash
cd /Users/DIALLO9194/Downloads/keza
npx next build 2>&1 | tail -30
```

Expected: `✓ Compiled successfully` with `/programmes` listed as a static page.
