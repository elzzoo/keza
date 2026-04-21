# Historique des prix — Design Spec

**Date :** 2026-04-21
**Statut :** Approuvé

---

## Objectif

Créer une page `/prix` affichant le meilleur moment pour voyager vers chacune des 20 destinations KEZA. L'utilisateur filtre par région puis par destination, et voit une sparkline SVG des prix cash estimés sur 12 mois avec les mois les moins chers mis en évidence. La recommandation KEZA (miles vs cash) est recalculée pour chaque mois.

## Architecture

Données : `data/seasonality.ts` contient 12 multiplicateurs saisonniers par région (6 régions). `lib/priceHistory.ts` applique ces multiplicateurs au `cashEstimateUsd` de base de chaque destination pour produire 12 prix mensuels + CPM + recommandation par mois.

Page SSG Server Component à `app/prix/page.tsx` — calcule les données pour les 20 destinations au build time, les passe en prop à `app/prix/PriceChart.tsx` ("use client"). Sparkline SVG pure (pas de lib chart).

**Tech Stack :** Next.js 14 App Router · TypeScript · Tailwind CSS · SVG pur · lib/dealsEngine (existant)

---

## Section 1 — Données saisonnières (`data/seasonality.ts`)

### Interface

```typescript
export type MonthlyMultipliers = [
  number, number, number, number, // Jan, Fév, Mar, Avr
  number, number, number, number, // Mai, Jun, Jul, Aoû
  number, number, number, number, // Sep, Oct, Nov, Déc
];
// index 0 = Janvier, index 11 = Décembre

export const REGIONAL_SEASONALITY: Record<Region, MonthlyMultipliers> = { ... };
```

### Multiplicateurs par région

| Région | Jan | Fév | Mar | Avr | Mai | Jun | Jul | Aoû | Sep | Oct | Nov | Déc |
|--------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| africa | 0.82 | 0.84 | 0.90 | 0.95 | 1.00 | 1.15 | 1.35 | 1.30 | 1.05 | 0.97 | 1.10 | 1.20 |
| europe | 0.82 | 0.84 | 0.90 | 0.94 | 0.98 | 1.15 | 1.35 | 1.30 | 1.02 | 0.96 | 1.10 | 1.20 |
| americas | 0.88 | 0.85 | 0.92 | 0.95 | 1.00 | 1.18 | 1.35 | 1.28 | 1.05 | 0.98 | 1.05 | 1.25 |
| asia | 1.10 | 0.90 | 0.95 | 1.05 | 1.00 | 0.95 | 1.00 | 1.05 | 0.92 | 0.90 | 1.00 | 1.15 |
| middle-east | 0.90 | 0.88 | 0.92 | 0.95 | 1.00 | 1.10 | 1.20 | 1.15 | 1.00 | 0.95 | 1.00 | 1.10 |
| oceania | 1.20 | 1.10 | 1.05 | 0.95 | 0.88 | 0.85 | 0.90 | 0.92 | 0.95 | 1.00 | 1.05 | 1.10 |

Rationale : Europe/Afrique — haute saison été (Jul/Aoû) + fêtes (Déc), basse saison jan-fév. Asie — inverse partiel (nouvel an chinois = Jan cher, mousson = Jun/Sep bas). Océanie — saisons inversées (Jul/Aoû = hiver austral = bas prix).

---

## Section 2 — Logique de calcul (`lib/priceHistory.ts`)

### Types exportés

```typescript
export interface MonthlyPrice {
  month: number;          // 0-11 (Jan=0)
  monthLabel: string;     // "Jan", "Fév", ...
  price: number;          // cashEstimateUsd × multiplier, arrondi
  cpm: number;            // computeDealRatio(price, milesEstimate)
  recommendation: DealRecommendation;
}

export interface DestinationPriceHistory {
  iata: string;
  monthlyPrices: MonthlyPrice[]; // 12 éléments
  bestMonths: number[];           // indices des mois les moins chers (prix ≤ percentile 33)
  worstMonths: number[];          // indices des mois les plus chers (prix ≥ percentile 67)
}
```

### Fonctions exportées

```typescript
export function getMonthlyPrices(dest: Destination): DestinationPriceHistory
export function getAllDestinationPriceHistories(): DestinationPriceHistory[]
```

`getMonthlyPrices` :
1. Récupère `REGIONAL_SEASONALITY[dest.region]`
2. Pour chaque mois i : `price = Math.round(dest.cashEstimateUsd * multipliers[i])`
3. `cpm = computeDealRatio(price, dest.milesEstimate)`
4. `recommendation = classifyDeal(cpm)`
5. Calcule `bestMonths` : mois dont le prix ≤ percentile 33 des 12 prix
6. Calcule `worstMonths` : mois dont le prix ≥ percentile 67 des 12 prix

Labels mois : `["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"]`

---

## Section 3 — Page `/prix` (`app/prix/page.tsx`)

Server Component SSG.

```typescript
export const metadata: Metadata = {
  title: "Meilleur moment pour voyager | KEZA",
  description: "Découvrez le meilleur mois pour voyager vers 20 destinations depuis Dakar — prix cash et recommandation miles estimés mois par mois.",
};
```

**Données calculées au build time :**
```typescript
const ALL_HISTORIES = getAllDestinationPriceHistories();
// Passées en prop à PriceChart
```

**Layout :**
```
Header (existant)
├── Hero compact
│   ├── Titre : "Meilleur moment pour voyager"
│   └── Sous-titre : "20 destinations · prix estimés depuis Dakar · clique pour explorer"
└── PriceChart (client component)
    ├── Pills filtres région (même pattern que /carte)
    ├── Pills destinations filtrées
    ├── Sparkline SVG
    ├── Badges meilleurs/pires mois
    └── Note KEZA (CPM + recommandation du mois le moins cher)
```

---

## Section 4 — Composant graphique (`app/prix/PriceChart.tsx`)

`"use client"` — gère state des pills et rendu de la sparkline.

### Props

```typescript
interface Props {
  histories: DestinationPriceHistory[];
  destinations: Destination[];
  lang: "fr" | "en";
}
```

### State

```typescript
const [regionFilter, setRegionFilter] = useState<RegionFilter>("africa");
const [selectedIata, setSelectedIata] = useState<string>("CMN"); // Casablanca par défaut
```

Défaut : région Afrique + première destination de la région.

### Pills région

Même 7 options que `/carte` : Toutes / Afrique / Europe / Amériques / Asie / M-Orient / Océanie. Quand région change → `selectedIata` bascule sur la première destination de la nouvelle région.

### Pills destination

Destinations filtrées par région sélectionnée. Pills horizontaux scrollables. Affichage : `{flag} {city}`.

### Sparkline SVG

ViewBox fixe `0 0 400 80`. 12 points calculés :
- `x = (i / 11) * 400` pour i ∈ [0..11]
- `y = 80 - ((price - minPrice) / (maxPrice - minPrice)) * 70 + 5`

Éléments :
- `<path>` area fill avec gradient (couleur = REC_COLORS[recommendation du mois le moins cher])
- `<polyline>` ligne principale
- `<circle r=3>` sur chaque point — vert si bestMonth, rouge si worstMonth, gris sinon
- `<text>` labels mois en bas (Jan, Mar, Mai, Jul, Sep, Nov — tous les 2 mois)
- `<text>` prix min (vert) et max (rouge) aux extrêmes

### Badges sous le graphique

```tsx
<div>✓ {bestMonthLabels.join(" · ")}</div>   // fond vert
<div>✕ {worstMonthLabels.join(" · ")}</div>  // fond rouge
```

### Note KEZA

Le mois avec le prix le plus bas :
```tsx
<div>
  💡 En {bestMonth.monthLabel}, tes miles valent {bestMonth.cpm.toFixed(1)}¢/mile
  → {recLabel[bestMonth.recommendation]}
</div>
```

---

## Section 5 — Wiring

| Fichier | Modification |
|---------|-------------|
| `components/Header.tsx` | Ajouter `{ label: "Prix", href: "/prix" }` entre "Carte" et "Programmes" |
| `app/sitemap.ts` | Ajouter `/prix` avec `priority: 0.7`, `changeFrequency: "monthly"` |

---

## Section 6 — Tests

**`__tests__/data/seasonality.test.ts`** (nouveau) :
- Chaque région a exactement 12 multiplicateurs
- Tous les multiplicateurs sont entre 0.5 et 2.0
- Toutes les 6 régions sont présentes (`africa`, `europe`, `americas`, `asia`, `middle-east`, `oceania`)
- La somme des multiplicateurs pour chaque région est entre 10 et 14 (cohérence — pas de biais massif)

**`__tests__/lib/priceHistory.test.ts`** (nouveau) :
- `getMonthlyPrices` retourne exactement 12 entrées pour chaque destination
- Chaque `MonthlyPrice` a les champs requis : `month`, `monthLabel`, `price`, `cpm`, `recommendation`
- `price = Math.round(cashEstimateUsd × multiplier)` — vérifié sur CDG (Jan)
- `recommendation` est "USE_MILES" | "NEUTRAL" | "USE_CASH"
- `bestMonths` contient uniquement des mois avec prix ≤ percentile 33 des 12 prix
- `worstMonths` contient uniquement des mois avec prix ≥ percentile 67 des 12 prix
- `getAllDestinationPriceHistories` retourne 20 entrées

---

## Décisions clés

| Décision | Choix | Raison |
|----------|-------|--------|
| Données saisonnières | Multiplicateurs par région | 6 jeux suffisent — même saisonnalité intra-région |
| Graphique | SVG pur | Pas de lib chart — léger, SSR-safe, full control |
| Défaut sélection | Afrique / Casablanca | Audience principale KEZA |
| Meilleurs mois | Percentile 33 des 12 prix | Objectif que robuste aux outliers vs simple "3 moins chers" |
| Note KEZA | CPM du mois le moins cher | Lien direct avec la proposition de valeur KEZA |

---

## Hors scope

- Prix réels depuis une API (Travelpayouts, Amadeus)
- Alertes prix (notification quand un prix descend)
- Comparaison multi-destinations sur un même graphique
- Pages détail par destination `/destinations/[iata]`
- Historique réel des prix passés (données archivées)
