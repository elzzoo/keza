# Fiches Destination — Design Spec

**Date :** 2026-04-22
**Statut :** Approuvé

---

## Objectif

Créer 20 pages statiques `/destinations/[iata]` — une fiche par destination KEZA. Chaque page affiche la recommandation miles vs cash calculée à partir des données statiques (instantané, sans latence API), une mini sparkline saisonnière 12 mois, et un formulaire de recherche pré-rempli pour obtenir des prix live sur des dates précises.

## Architecture

SSG Server Component + "use client" child. Les données statiques (deal estimé, sparkline) sont calculées au build time. La partie live (prix par dates) est déléguée au `SearchForm` existant.

**Tech Stack :** Next.js 14 App Router · TypeScript · Tailwind CSS · SVG pur · lib/dealsEngine (existant) · lib/priceHistory (existant)

---

## Section 1 — Fichiers

| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `app/destinations/[iata]/page.tsx` | Créer | SSG Server Component — génère 20 params, calcule deal statique + sparkline, metadata SEO, schema.org |
| `app/destinations/[iata]/DestinationPageClient.tsx` | Créer | "use client" — hero, deal card, sparkline SVG, SearchForm pré-rempli, Results |
| `app/carte/WorldMap.tsx` | Modifier | Bouton "Rechercher ce vol" → `/destinations/${iata}` |
| `app/sitemap.ts` | Modifier | +20 entrées `/destinations/[iata]` avec priority 0.8 |
| `__tests__/app/destinations/page.test.ts` | Créer | Tests generateStaticParams |
| `__tests__/app/destinations/DestinationPageClient.test.tsx` | Créer | Tests rendu composant |

---

## Section 2 — `app/destinations/[iata]/page.tsx`

Server Component SSG.

### generateStaticParams

```typescript
export async function generateStaticParams() {
  return DESTINATIONS.map((d) => ({ iata: d.iata.toLowerCase() }));
}
```

### generateMetadata

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const dest = DESTINATIONS.find((d) => d.iata.toLowerCase() === params.iata.toLowerCase());
  if (!dest) return { title: "Destination not found — KEZA" };
  return {
    title: `Vols Dakar → ${dest.city} — Cash ou Miles ? | KEZA`,
    description: `Vols depuis Dakar (DSS) vers ${dest.city} (${dest.iata}). KEZA calcule si tes miles valent plus que le prix cash — estimation instantanée + recherche live.`,
    alternates: { canonical: `https://keza-taupe.vercel.app/destinations/${dest.iata}` },
  };
}
```

### Données calculées au build time

```typescript
const dest = DESTINATIONS.find((d) => d.iata.toLowerCase() === params.iata.toLowerCase());
if (!dest) notFound();

const cpm = computeDealRatio(dest.cashEstimateUsd, dest.milesEstimate);
const recommendation = classifyDeal(cpm);
const history = getMonthlyPrices(dest); // DestinationPriceHistory
```

### Schema.org

```typescript
const schema = {
  "@context": "https://schema.org",
  "@type": "TouristDestination",
  name: dest.city,
  description: `Vols depuis Dakar vers ${dest.city} — comparaison cash vs miles`,
  touristType: "Voyageur miles",
};
```

---

## Section 3 — `app/destinations/[iata]/DestinationPageClient.tsx`

`"use client"` — gère state lang + search results.

### Props

```typescript
interface Props {
  dest: Destination;
  cpm: number;
  recommendation: DealRecommendation;
  history: DestinationPriceHistory;
  lang?: "fr" | "en";
}
```

### Layout (haut → bas)

```
Header (existant, avec lang toggle)
Breadcrumb  KEZA / Destinations / {city}

Hero
  {flag}  {city} · {country}
  Badge [USE_MILES | NEUTRAL | USE_CASH]
  "Vols depuis Dakar estimés à ${cashEstimateUsd} · {milesEstimate/1000}k miles"

Deal card (3 colonnes)
  Cash: ${cashEstimateUsd}
  Miles: {milesEstimate/1000}k
  CPM: {cpm.toFixed(1)}¢/mile

Sparkline SVG inline (ViewBox "0 0 400 80")
  — 12 points, même logique que /prix
  — Cercles : vert si bestMonth, rouge si worstMonth, gris sinon
  — Labels mois pairs (Jan, Mar, Mai, Jul, Sep, Nov)
  — Prix min (vert) et max (rouge)

Badges
  ✓ Meilleurs mois : {bestMonthLabels.join(" · ")}   — fond vert
  ✕ Éviter : {worstMonthLabels.join(" · ")}           — fond rouge

Note KEZA
  💡 En {cheapestMonth.monthLabel}, tes miles valent {cheapestMonth.cpm.toFixed(1)}¢/mile
  → {recLabel}

SearchForm (pré-rempli to=dest.iata)
Results (apparaît après recherche)

Routes similaires (même région, max 4)
  — liens /destinations/[iata] des autres destinations

Footer (existant)
```

### Constantes réutilisées

```typescript
const REC_COLORS: Record<DealRecommendation, string> = {
  USE_MILES: "#3b82f6",
  NEUTRAL:   "#10b981",
  USE_CASH:  "#f59e0b",
};
```

### Mini sparkline SVG

ViewBox `"0 0 400 80"`. Même algorithme que `app/prix/PriceChart.tsx` :

```typescript
const prices = history.monthlyPrices.map((m) => m.price);
const minP = Math.min(...prices);
const maxP = Math.max(...prices);
const range = maxP - minP || 1;

const points = history.monthlyPrices.map((m, i) => ({
  x: (i / 11) * 380 + 10,
  y: 70 - ((m.price - minP) / range) * 60 + 5,
  isBest: history.bestMonths.includes(i),
  isWorst: history.worstMonths.includes(i),
}));

const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
const area = `M ${points[0].x},75 ` +
  points.map((p) => `L ${p.x},${p.y}`).join(" ") +
  ` L ${points[11].x},75 Z`;
```

---

## Section 4 — Modifications

### `app/carte/WorldMap.tsx`

```typescript
// AVANT
href={`/?to=${selected.iata}`}

// APRÈS
href={`/destinations/${selected.iata}`}
```

(Deux occurrences : desktop tooltip + mobile bottom sheet)

### `app/sitemap.ts`

```typescript
for (const dest of DESTINATIONS) {
  pages.push({
    url: `${BASE_URL}/destinations/${dest.iata}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  });
}
```

---

## Section 5 — Tests

### `__tests__/app/destinations/page.test.ts`

```typescript
import { generateStaticParams } from "@/app/destinations/[iata]/page";
import { DESTINATIONS } from "@/data/destinations";

describe("generateStaticParams", () => {
  it("retourne exactement 20 params", async () => {
    const params = await generateStaticParams();
    expect(params).toHaveLength(20);
  });

  it("chaque param a un iata en minuscules sur 3 caractères", async () => {
    const params = await generateStaticParams();
    for (const p of params) {
      expect(p.iata).toMatch(/^[a-z]{3}$/);
    }
  });

  it("couvre tous les IATA de DESTINATIONS", async () => {
    const params = await generateStaticParams();
    const iatas = params.map((p) => p.iata.toUpperCase());
    for (const d of DESTINATIONS) {
      expect(iatas).toContain(d.iata);
    }
  });
});
```

### `__tests__/app/destinations/DestinationPageClient.test.tsx`

```typescript
import { render, screen } from "@testing-library/react";
import { DestinationPageClient } from "@/app/destinations/[iata]/DestinationPageClient";
import { DESTINATIONS } from "@/data/destinations";
import { computeDealRatio, classifyDeal } from "@/lib/dealsEngine";
import { getMonthlyPrices } from "@/lib/priceHistory";

const dest = DESTINATIONS.find((d) => d.iata === "CDG")!;
const cpm = computeDealRatio(dest.cashEstimateUsd, dest.milesEstimate);
const recommendation = classifyDeal(cpm);
const history = getMonthlyPrices(dest);

describe("DestinationPageClient", () => {
  it("affiche le nom de la ville", () => {
    render(<DestinationPageClient dest={dest} cpm={cpm} recommendation={recommendation} history={history} />);
    expect(screen.getByText("Paris")).toBeInTheDocument();
  });

  it("affiche le flag", () => {
    render(<DestinationPageClient dest={dest} cpm={cpm} recommendation={recommendation} history={history} />);
    expect(screen.getByText("🇫🇷")).toBeInTheDocument();
  });

  it("la sparkline SVG contient 12 cercles de données", () => {
    const { container } = render(<DestinationPageClient dest={dest} cpm={cpm} recommendation={recommendation} history={history} />);
    const circles = container.querySelectorAll("circle.data-point");
    expect(circles).toHaveLength(12);
  });

  it("le badge recommendation est présent", () => {
    render(<DestinationPageClient dest={dest} cpm={cpm} recommendation={recommendation} history={history} />);
    const badges = screen.getAllByText(/MILES|CASH|SI TU AS/i);
    expect(badges.length).toBeGreaterThan(0);
  });
});
```

---

## Décisions clés

| Décision | Choix | Raison |
|----------|-------|--------|
| Données hero | Statiques (cashEstimateUsd + milesEstimate) | Instantané, 0 latence, SSG-safe |
| Prix live | Via SearchForm existant | Réutilisation, pas de duplication |
| Sparkline | SVG inline dans DestinationPageClient | Pas besoin du plein PriceChart (trop lourd) |
| Images | Pas d'Unsplash | Évite dépendance API externe + droits |
| Routes similaires | Même région, max 4 | Maillage interne SEO ciblé |
| URL | `/destinations/[iata]` minuscules | Convention cohérente avec `/flights/[route]` |

---

## Hors scope

- Images de destination (Unsplash, Cloudinary)
- Avis utilisateurs / notes destinations
- Comparateur multi-destinations
- Programmes spécifiques par destination (déjà dans /programmes)
