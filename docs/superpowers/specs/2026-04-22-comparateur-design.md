# Comparateur Multi-Destinations — Design Spec

**Date :** 2026-04-22
**Statut :** Approuvé

---

## Objectif

Permettre à l'utilisateur de comparer 2–3 destinations côte-à-côte (cash, miles, CPM, recommandation, meilleurs mois) depuis une page dédiée `/comparer`. La sélection se fait via des dropdowns sur la page et via un bouton "Comparer" sur chaque fiche destination.

---

## Architecture

**Tech Stack :** Next.js 14 App Router · TypeScript · Tailwind CSS · données statiques (DESTINATIONS, dealsEngine, priceHistory)

Aucun appel API. Toutes les données sont calculées au render côté client depuis les données statiques existantes. L'URL est la source de vérité pour les destinations sélectionnées — partageable.

---

## Section 1 — Fichiers

| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `app/comparer/page.tsx` | Créer | SSG shell + metadata SEO |
| `app/comparer/ComparateurClient.tsx` | Créer | `"use client"` — dropdowns, sync URL, layout hybride |
| `app/destinations/[iata]/DestinationPageClient.tsx` | Modifier | Ajouter bouton "Comparer" → `/comparer?a=IATA` |
| `components/Header.tsx` | Modifier | Ajouter "Comparer" / "Compare" dans le nav |
| `app/sitemap.ts` | Modifier | Ajouter `/comparer` |
| `__tests__/app/comparer/ComparateurClient.test.tsx` | Créer | Tests sélection, URL sync, rendu |

---

## Section 2 — `app/comparer/page.tsx`

SSG Server Component, pas de `generateStaticParams` (page unique).

```typescript
import type { Metadata } from "next";
import { ComparateurClient } from "./ComparateurClient";

export const metadata: Metadata = {
  title: "Comparer des destinations — Cash ou Miles ? | KEZA",
  description: "Comparez 2 ou 3 destinations depuis Dakar : cash, miles, CPM et meilleurs mois côte-à-côte.",
  alternates: { canonical: "https://keza-taupe.vercel.app/comparer" },
};

export default function ComparateurPage() {
  return <ComparateurClient />;
}
```

---

## Section 3 — `app/comparer/ComparateurClient.tsx`

`"use client"`.

### URL et state

Les params `?a=`, `?b=`, `?c=` (IATA majuscules) sont la source de vérité. Lecture via `useSearchParams` au montage. Chaque changement de dropdown appelle `router.replace` avec les nouveaux params.

```typescript
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { DESTINATIONS } from "@/data/destinations";
import { computeDealRatio, classifyDeal } from "@/lib/dealsEngine";
import { getMonthlyPrices } from "@/lib/priceHistory";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { useState } from "react";
import type { DealRecommendation } from "@/lib/dealsEngine";

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
```

### Lecture des params

```typescript
const searchParams = useSearchParams();
const router = useRouter();

const slotA = searchParams.get("a")?.toUpperCase() ?? "";
const slotB = searchParams.get("b")?.toUpperCase() ?? "";
const slotC = searchParams.get("c")?.toUpperCase() ?? "";
```

### Mise à jour URL

```typescript
function updateSlot(slot: "a" | "b" | "c", iata: string) {
  const params = new URLSearchParams(searchParams.toString());
  if (iata) {
    params.set(slot, iata.toUpperCase());
  } else {
    params.delete(slot);
  }
  router.replace(`/comparer?${params.toString()}`);
}
```

### Calcul des données

```typescript
const selected = useMemo(() => {
  return [slotA, slotB, slotC]
    .filter(Boolean)
    .map((iata) => {
      const dest = DESTINATIONS.find((d) => d.iata === iata);
      if (!dest) return null;
      const cpm = computeDealRatio(dest.cashEstimateUsd, dest.milesEstimate);
      const recommendation = classifyDeal(cpm);
      const history = getMonthlyPrices(dest);
      const bestLabels = history.bestMonths.map((i) => history.monthlyPrices[i].monthLabel);
      return { dest, cpm, recommendation, bestLabels };
    })
    .filter(Boolean);
}, [slotA, slotB, slotC]);
```

### Layout

```
Header (avec lang toggle)

Hero
  📊 Comparer des destinations     [FR] / Compare destinations [EN]
  "Sélectionne jusqu'à 3 destinations pour les comparer"

Sélecteurs (3 dropdowns en ligne)
  [Destination 1 ▼]  [Destination 2 ▼]  [Destination 3 ▼]
  — Chaque dropdown liste les 20 destinations (option vide = "—")
  — Slot 1 est requis, 2 et 3 optionnels

--- si selected.length === 0 ---
  "Choisis au moins une destination pour commencer"

--- si selected.length >= 1 ---

Hero badges (grid 1/2/3 colonnes selon le nombre)
  Pour chaque destination :
  ┌──────────────────────────┐
  │  🇫🇷  Paris               │
  │  1.9¢/mile               │
  │  [MILES ✓]               │
  │  → Voir la fiche          │
  └──────────────────────────┘

Table compacte (colonnes alignées sur les badges)
  Ligne "Cash"         : $680    $1 100   $490
  Ligne "Miles"        : 35k     65k      28k
  Ligne "Meilleurs mois": Jan·Mar  Nov·Déc  Mar·Avr

Footer
```

### Dropdowns

Chaque dropdown est un `<select>` natif avec les 20 destinations triées par région puis ville :

```typescript
<select
  value={slotA}
  onChange={(e) => updateSlot("a", e.target.value)}
  className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-fg"
>
  <option value="">— {fr ? "Destination" : "Destination"} —</option>
  {DESTINATIONS.map((d) => (
    <option key={d.iata} value={d.iata}>
      {d.flag} {d.city} ({d.iata})
    </option>
  ))}
</select>
```

---

## Section 4 — Bouton sur les fiches destinations

Dans `app/destinations/[iata]/DestinationPageClient.tsx`, ajouter après le deal card et avant la sparkline :

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

---

## Section 5 — Wiring

### `components/Header.tsx`

Dans `NAV.fr`, ajouter entre "Alertes" et "Programmes" :
```typescript
{ label: "Comparer", href: "/comparer" },
```

Dans `NAV.en` :
```typescript
{ label: "Compare", href: "/comparer" },
```

### `app/sitemap.ts`

```typescript
{
  url: `${BASE_URL}/comparer`,
  lastModified: now,
  changeFrequency: "monthly" as const,
  priority: 0.6,
},
```

---

## Section 6 — Fonction pure `buildComparisonData`

Extraire depuis `ComparateurClient` une fonction pure testable (même pattern que `buildSparklinePoints` dans `DestinationPageClient`).

```typescript
// Dans ComparateurClient.tsx — export nommé
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
```

### `__tests__/app/comparer/comparateur.test.ts`

```typescript
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
    const dest = DESTINATIONS.find((d) => d.iata === "CDG")!;
    const result = buildComparisonData(["CDG"]);
    // CPM = cashEstimateUsd * 100 / milesEstimate = 680 * 100 / 35000 ≈ 1.94
    expect(result[0].cpm).toBeCloseTo(680 * 100 / 35000, 1);
  });

  it("la recommandation USE_MILES implique CPM >= 1.5", () => {
    const result = buildComparisonData(["CDG", "NRT", "DXB"]);
    for (const item of result) {
      if (item.recommendation === "USE_MILES") expect(item.cpm).toBeGreaterThanOrEqual(1.5);
      if (item.recommendation === "USE_CASH") expect(item.cpm).toBeLessThan(1.0);
    }
  });

  it("bestLabels est un tableau non vide de labels de mois", () => {
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

---

## Décisions clés

| Décision | Choix | Raison |
|----------|-------|--------|
| Source de vérité | URL (`?a=`, `?b=`, `?c=`) | Partageable, pas de state externe |
| Layout | Hybride — badges hero + table | Verdict immédiat + détails disponibles |
| Sparklines | Absent du comparateur | Trop lourd — lien vers la fiche à la place |
| Sélection | Dropdowns + bouton sur fiches | Découvrabilité + accès direct depuis une fiche |
| Max destinations | 3 | Au-delà illisible sur mobile |
| Tests | `next/navigation` mocké | Pattern existant dans le projet |

---

## Hors scope

- Comparaison avec prix live (SearchForm) — statique suffit pour le comparateur
- Sauvegarde des comparaisons (pas de compte utilisateur)
- Export / partage formaté
- Sparklines dans le comparateur
