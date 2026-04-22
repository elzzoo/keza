# Comparateur Multi-Destinations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une page `/comparer` permettant de comparer 2–3 destinations côte-à-côte (cash, miles, CPM, recommandation, meilleurs mois) avec URL partageable et bouton "Comparer" sur les fiches destination.

**Architecture:** Page `/comparer` avec `ComparateurClient` ("use client") qui lit `?a=`, `?b=`, `?c=` depuis l'URL via `useSearchParams` et met à jour l'URL avec `router.replace` à chaque changement de dropdown. Toutes les données sont calculées côté client depuis les données statiques existantes (`DESTINATIONS`, `dealsEngine`, `priceHistory`). Layout hybride : badges hero + table compacte.

**Tech Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · `useSearchParams` / `useRouter` · `DESTINATIONS` / `computeDealRatio` / `classifyDeal` / `getMonthlyPrices` (tous existants)

---

## Fichiers

| Fichier | Action |
|---------|--------|
| `app/comparer/ComparateurClient.tsx` | Créer |
| `app/comparer/page.tsx` | Créer |
| `app/destinations/[iata]/DestinationPageClient.tsx` | Modifier |
| `components/Header.tsx` | Modifier |
| `app/sitemap.ts` | Modifier |
| `__tests__/app/comparer/comparateur.test.ts` | Créer |

---

## Context utile

**Tailwind tokens custom du projet :**
- `bg-bg` — fond de page
- `bg-surface` — fond de card
- `border-border` — couleur de bordure
- `text-fg` — texte principal
- `text-muted` — texte secondaire
- `text-success` — vert (meilleurs mois)
- `text-primary` — bleu accent

**Types et fonctions utilisées (déjà dans le projet) :**

```typescript
// data/destinations.ts
export interface Destination {
  iata: string;        // "CDG"
  city: string;        // "Paris"
  country: string;     // "France"
  flag: string;        // "🇫🇷"
  region: Region;
  cashEstimateUsd: number;  // 680
  milesEstimate: number;    // 35000
  lat: number;
  lon: number;
}
export const DESTINATIONS: Destination[];  // 20 destinations

// lib/dealsEngine.ts
export type DealRecommendation = "USE_MILES" | "USE_CASH" | "NEUTRAL";
export function computeDealRatio(cashPrice: number, milesRequired: number): number;
// retourne cents per mile, ex: 680*100/35000 = 1.94
export function classifyDeal(ratioCpp: number): DealRecommendation;
// USE_MILES si >= 1.5, USE_CASH si < 1.0, NEUTRAL sinon

// lib/priceHistory.ts
export interface DestinationPriceHistory {
  iata: string;
  monthlyPrices: { month: number; monthLabel: string; price: number; cpm: number; recommendation: DealRecommendation }[];
  bestMonths: number[];   // indices des mois les moins chers
  worstMonths: number[];
}
export function getMonthlyPrices(dest: Destination): DestinationPriceHistory;
```

**Jest config (important) :**
- `testEnvironment: "node"` — pas de jsdom
- `testMatch: ["**/__tests__/**/*.test.ts"]` — uniquement `.test.ts`, pas `.test.tsx`
- Alias `@/` → racine du projet

**Pattern existant (DestinationPageClient.tsx) pour fonction pure exportée testable :**
```typescript
export function buildSparklinePoints(history: DestinationPriceHistory) { ... }
```
Le même pattern s'applique ici avec `buildComparisonData`.

**Pattern Footer/Header existant :**
```typescript
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
// Header accepte : lang: "fr"|"en", onLangChange: (l) => void
// Footer accepte : lang: "fr"|"en"
```

---

## Task 1 : `buildComparisonData` + tests

**Files:**
- Create: `app/comparer/ComparateurClient.tsx` (stub avec `buildComparisonData` seulement)
- Create: `__tests__/app/comparer/comparateur.test.ts`

- [ ] **Step 1 : Créer le test**

```typescript
// __tests__/app/comparer/comparateur.test.ts
import { buildComparisonData } from "@/app/comparer/ComparateurClient";
import { DESTINATIONS } from "@/data/destinations";

describe("buildComparisonData", () => {
  it("retourne un tableau vide pour une liste vide", () => {
    expect(buildComparisonData([])).toHaveLength(0);
  });

  it("filtre les IATA invalides", () => {
    const result = buildComparisonData(["INVALID"]);
    expect(result).toHaveLength(0);
  });

  it("retourne 1 item pour un IATA valide", () => {
    const result = buildComparisonData(["CDG"]);
    expect(result).toHaveLength(1);
    expect(result[0].dest.city).toBe("Paris");
  });

  it("retourne 3 items pour 3 IATA valides", () => {
    const result = buildComparisonData(["CDG", "NRT", "DXB"]);
    expect(result).toHaveLength(3);
  });

  it("calcule le CPM correctement pour CDG", () => {
    const result = buildComparisonData(["CDG"]);
    // CPM = cashEstimateUsd * 100 / milesEstimate = 680 * 100 / 35000 ≈ 1.94
    expect(result[0].cpm).toBeCloseTo((680 * 100) / 35000, 1);
  });

  it("la recommandation USE_MILES implique CPM >= 1.5", () => {
    const result = buildComparisonData(["CDG", "NRT", "DXB"]);
    for (const item of result) {
      if (item.recommendation === "USE_MILES") expect(item.cpm).toBeGreaterThanOrEqual(1.5);
      if (item.recommendation === "USE_CASH") expect(item.cpm).toBeLessThan(1.0);
    }
  });

  it("bestLabels est un tableau non vide de strings", () => {
    const result = buildComparisonData(["CDG"]);
    expect(result[0].bestLabels.length).toBeGreaterThan(0);
    expect(typeof result[0].bestLabels[0]).toBe("string");
  });

  it("accepte les IATA en minuscules", () => {
    const result = buildComparisonData(["cdg"]);
    expect(result).toHaveLength(1);
    expect(result[0].dest.iata).toBe("CDG");
  });
});
```

- [ ] **Step 2 : Vérifier que le test échoue**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx jest __tests__/app/comparer/comparateur.test.ts --no-coverage
```

Attendu : FAIL avec `Cannot find module '@/app/comparer/ComparateurClient'`

- [ ] **Step 3 : Créer le stub `ComparateurClient.tsx` avec `buildComparisonData`**

```typescript
// app/comparer/ComparateurClient.tsx
"use client";

import { DESTINATIONS } from "@/data/destinations";
import { computeDealRatio, classifyDeal } from "@/lib/dealsEngine";
import { getMonthlyPrices } from "@/lib/priceHistory";
import type { DealRecommendation } from "@/lib/dealsEngine";

// ─── Constants ──────────────────────────────────────────────────────────────

const REC_COLORS: Record<DealRecommendation, string> = {
  USE_MILES: "#3b82f6",
  NEUTRAL:   "#10b981",
  USE_CASH:  "#f59e0b",
};

const REC_LABELS_FR: Record<DealRecommendation, string> = {
  USE_MILES: "MILES ✓",
  NEUTRAL:   "NEUTRE ~",
  USE_CASH:  "CASH ✗",
};

const REC_LABELS_EN: Record<DealRecommendation, string> = {
  USE_MILES: "MILES ✓",
  NEUTRAL:   "NEUTRAL ~",
  USE_CASH:  "CASH ✗",
};

// ─── Pure function (exported for tests) ─────────────────────────────────────

export function buildComparisonData(iatas: string[]) {
  return iatas
    .map((iata) => {
      const dest = DESTINATIONS.find((d) => d.iata === iata.toUpperCase());
      if (!dest) return null;
      const cpm = computeDealRatio(dest.cashEstimateUsd, dest.milesEstimate);
      const recommendation = classifyDeal(cpm);
      const history = getMonthlyPrices(dest);
      const bestLabels = history.bestMonths.map((i) => history.monthlyPrices[i].monthLabel);
      return { dest, cpm, recommendation, bestLabels };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

// ─── Component (stub — full implementation in Task 2) ────────────────────────

export function ComparateurClient() {
  return null;
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx jest __tests__/app/comparer/comparateur.test.ts --no-coverage
```

Attendu : PASS — 8 tests verts

- [ ] **Step 5 : Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza && git add app/comparer/ComparateurClient.tsx __tests__/app/comparer/comparateur.test.ts && git commit -m "feat: add buildComparisonData pure function + tests"
```

---

## Task 2 : `ComparateurClient` UI complète + `page.tsx`

**Files:**
- Modify: `app/comparer/ComparateurClient.tsx` (remplacer le stub par le composant complet)
- Create: `app/comparer/page.tsx`

- [ ] **Step 1 : Remplacer le stub par le composant complet**

Remplacer tout le contenu de `app/comparer/ComparateurClient.tsx` par :

```typescript
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DESTINATIONS } from "@/data/destinations";
import { computeDealRatio, classifyDeal } from "@/lib/dealsEngine";
import { getMonthlyPrices } from "@/lib/priceHistory";
import type { DealRecommendation } from "@/lib/dealsEngine";

// ─── Constants ──────────────────────────────────────────────────────────────

const REC_COLORS: Record<DealRecommendation, string> = {
  USE_MILES: "#3b82f6",
  NEUTRAL:   "#10b981",
  USE_CASH:  "#f59e0b",
};

const REC_LABELS_FR: Record<DealRecommendation, string> = {
  USE_MILES: "MILES ✓",
  NEUTRAL:   "NEUTRE ~",
  USE_CASH:  "CASH ✗",
};

const REC_LABELS_EN: Record<DealRecommendation, string> = {
  USE_MILES: "MILES ✓",
  NEUTRAL:   "NEUTRAL ~",
  USE_CASH:  "CASH ✗",
};

// ─── Pure function (exported for tests) ─────────────────────────────────────

export function buildComparisonData(iatas: string[]) {
  return iatas
    .map((iata) => {
      const dest = DESTINATIONS.find((d) => d.iata === iata.toUpperCase());
      if (!dest) return null;
      const cpm = computeDealRatio(dest.cashEstimateUsd, dest.milesEstimate);
      const recommendation = classifyDeal(cpm);
      const history = getMonthlyPrices(dest);
      const bestLabels = history.bestMonths.map((i) => history.monthlyPrices[i].monthLabel);
      return { dest, cpm, recommendation, bestLabels };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ComparateurClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const fr = lang === "fr";

  const slotA = searchParams.get("a")?.toUpperCase() ?? "";
  const slotB = searchParams.get("b")?.toUpperCase() ?? "";
  const slotC = searchParams.get("c")?.toUpperCase() ?? "";

  function updateSlot(slot: "a" | "b" | "c", iata: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (iata) {
      params.set(slot, iata.toUpperCase());
    } else {
      params.delete(slot);
    }
    router.replace(`/comparer?${params.toString()}`);
  }

  const selected = useMemo(
    () => buildComparisonData([slotA, slotB, slotC].filter(Boolean)),
    [slotA, slotB, slotC]
  );

  const gridCols =
    selected.length <= 1
      ? "grid-cols-1"
      : selected.length === 2
      ? "grid-cols-2"
      : "grid-cols-3";

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header lang={lang} onLangChange={setLang} />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pb-12">
        {/* Hero */}
        <div className="pt-8 pb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-fg mb-2">
            📊 {fr ? "Comparer des destinations" : "Compare destinations"}
          </h1>
          <p className="text-sm text-muted">
            {fr
              ? "Sélectionne jusqu'à 3 destinations pour les comparer"
              : "Select up to 3 destinations to compare"}
          </p>
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {(["a", "b", "c"] as const).map((slot, i) => {
            const val = [slotA, slotB, slotC][i];
            return (
              <select
                key={slot}
                value={val}
                onChange={(e) => updateSlot(slot, e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-fg"
                aria-label={fr ? `Destination ${i + 1}` : `Destination ${i + 1}`}
              >
                <option value="">—</option>
                {DESTINATIONS.map((d) => (
                  <option key={d.iata} value={d.iata}>
                    {d.flag} {d.city}
                  </option>
                ))}
              </select>
            );
          })}
        </div>

        {/* Empty state */}
        {selected.length === 0 && (
          <p className="text-muted text-sm text-center py-12">
            {fr
              ? "Choisis au moins une destination pour commencer"
              : "Choose at least one destination to start"}
          </p>
        )}

        {/* Hero badges + table */}
        {selected.length > 0 && (
          <>
            {/* Hero badges */}
            <div className={`grid ${gridCols} gap-3 mb-6`}>
              {selected.map(({ dest, cpm, recommendation }) => {
                const color = REC_COLORS[recommendation];
                const label = fr ? REC_LABELS_FR[recommendation] : REC_LABELS_EN[recommendation];
                return (
                  <div
                    key={dest.iata}
                    className="rounded-2xl border p-4 text-center"
                    style={{
                      borderColor: `${color}44`,
                      backgroundColor: `${color}08`,
                    }}
                  >
                    <div className="text-3xl mb-2">{dest.flag}</div>
                    <div className="font-black text-fg text-base mb-1">{dest.city}</div>
                    <div
                      className="text-lg font-black mb-2"
                      style={{ color }}
                    >
                      {cpm.toFixed(1)}¢/mile
                    </div>
                    <div
                      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black mb-3"
                      style={{
                        backgroundColor: `${color}22`,
                        color,
                        border: `1px solid ${color}44`,
                      }}
                    >
                      {label}
                    </div>
                    <div>
                      <Link
                        href={`/destinations/${dest.iata.toLowerCase()}`}
                        className="text-xs text-muted hover:text-fg transition-colors"
                      >
                        {fr ? "Voir la fiche →" : "View details →"}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comparison table */}
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wide font-semibold w-1/4" />
                    {selected.map(({ dest }) => (
                      <th
                        key={dest.iata}
                        className="text-center px-4 py-3 font-black text-fg text-xs"
                      >
                        {dest.flag} {dest.city}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 text-xs text-muted">Cash</td>
                    {selected.map(({ dest }) => (
                      <td key={dest.iata} className="px-4 py-3 text-center font-bold text-fg">
                        ${dest.cashEstimateUsd}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 text-xs text-muted">Miles</td>
                    {selected.map(({ dest }) => (
                      <td key={dest.iata} className="px-4 py-3 text-center font-bold text-fg">
                        {(dest.milesEstimate / 1000).toFixed(0)}k
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-xs text-muted">
                      {fr ? "Meilleurs mois" : "Best months"}
                    </td>
                    {selected.map(({ dest, bestLabels }) => (
                      <td
                        key={dest.iata}
                        className="px-4 py-3 text-center text-xs text-success"
                      >
                        {bestLabels.join(" · ")}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      <Footer lang={lang} />
    </div>
  );
}
```

- [ ] **Step 2 : Créer `app/comparer/page.tsx`**

Note : `useSearchParams()` requiert un `<Suspense>` dans le composant parent pour éviter que Next.js ne désactive le SSG sur toute la route.

```typescript
// app/comparer/page.tsx
import { Suspense } from "react";
import type { Metadata } from "next";
import { ComparateurClient } from "./ComparateurClient";

export const metadata: Metadata = {
  title: "Comparer des destinations — Cash ou Miles ? | KEZA",
  description:
    "Comparez 2 ou 3 destinations depuis Dakar : cash, miles, CPM et meilleurs mois côte-à-côte.",
  alternates: { canonical: "https://keza-taupe.vercel.app/comparer" },
};

export default function ComparateurPage() {
  return (
    <Suspense fallback={null}>
      <ComparateurClient />
    </Suspense>
  );
}
```

- [ ] **Step 3 : Vérifier que les tests passent toujours**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx jest __tests__/app/comparer/comparateur.test.ts --no-coverage
```

Attendu : PASS — 8 tests verts

- [ ] **Step 4 : Vérifier le build TypeScript**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx tsc --noEmit
```

Attendu : aucune erreur

- [ ] **Step 5 : Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza && git add app/comparer/ComparateurClient.tsx app/comparer/page.tsx && git commit -m "feat: add /comparer page — compare up to 3 destinations side-by-side"
```

---

## Task 3 : Wiring — bouton sur fiches, nav, sitemap

**Files:**
- Modify: `app/destinations/[iata]/DestinationPageClient.tsx`
- Modify: `components/Header.tsx`
- Modify: `app/sitemap.ts`

### Contexte Header.tsx

Le nav actuel dans `components/Header.tsx` :

```typescript
const NAV = {
  fr: [
    { label: "Comment ça marche", href: "/#how" },
    { label: "Calculateur", href: "/calculateur" },
    { label: "Carte", href: "/carte" },
    { label: "Prix", href: "/prix" },
    { label: "Alertes", href: "/alertes" },
    { label: "Programmes", href: "/programmes" },
    { label: "Pour les entreprises", href: "/entreprises" },
  ],
  en: [
    { label: "How it works", href: "/#how" },
    { label: "Calculator", href: "/calculateur" },
    { label: "Map", href: "/carte" },
    { label: "Prices", href: "/prix" },
    { label: "Alerts", href: "/alertes" },
    { label: "Programs", href: "/programmes" },
    { label: "For Business", href: "/entreprises" },
  ],
};
```

### Contexte DestinationPageClient.tsx

Le deal card (bloc à modifier) se trouve autour de la ligne 157 :

```tsx
{/* Deal card */}
<div className="bg-surface border border-border rounded-2xl p-4 mb-6">
  ...
</div>

{/* Sparkline */}
<div className="bg-surface border border-border rounded-2xl p-4 mb-4">
```

- [ ] **Step 1 : Ajouter le bouton "Comparer" dans `DestinationPageClient.tsx`**

Ajouter le bloc suivant **après** le deal card (`</div>` de la section `{/* Deal card */}`) et **avant** `{/* Sparkline */}` :

```tsx
{/* Compare CTA */}
<div className="mb-6">
  <Link
    href={`/comparer?a=${dest.iata}`}
    className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg border border-border hover:border-primary/40 rounded-xl px-4 py-2.5 transition-all hover:bg-primary/5"
  >
    📊 {fr ? "Comparer avec d'autres destinations →" : "Compare with other destinations →"}
  </Link>
</div>
```

`Link` est déjà importé en haut du fichier (`import Link from "next/link"`).

- [ ] **Step 2 : Ajouter "Comparer" dans le nav de `components/Header.tsx`**

Dans `NAV.fr`, ajouter **entre** `{ label: "Alertes", href: "/alertes" }` et `{ label: "Programmes", href: "/programmes" }` :

```typescript
{ label: "Comparer", href: "/comparer" },
```

Dans `NAV.en`, ajouter **entre** `{ label: "Alerts", href: "/alertes" }` et `{ label: "Programs", href: "/programmes" }` :

```typescript
{ label: "Compare", href: "/comparer" },
```

- [ ] **Step 3 : Ajouter `/comparer` dans `app/sitemap.ts`**

Dans le tableau `pages` initial (après l'entrée `/alertes`, avant `// Route pages`), ajouter :

```typescript
{
  url: `${BASE_URL}/comparer`,
  lastModified: now,
  changeFrequency: "monthly" as const,
  priority: 0.6,
},
```

- [ ] **Step 4 : Vérifier le build TypeScript**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx tsc --noEmit
```

Attendu : aucune erreur

- [ ] **Step 5 : Lancer la suite de tests complète**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx jest --no-coverage
```

Attendu : tous les tests passent (y compris les anciens tests destinations + alertes)

- [ ] **Step 6 : Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza && git add app/destinations/[iata]/DestinationPageClient.tsx components/Header.tsx app/sitemap.ts && git commit -m "feat: wire up comparateur — CTA on destination pages, nav, sitemap"
```
