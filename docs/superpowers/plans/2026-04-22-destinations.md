# Fiches Destination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer 20 pages statiques `/destinations/[iata]` — hero avec recommandation miles vs cash, mini sparkline saisonnière, et formulaire de recherche pré-rempli pour prix live.

**Architecture:** SSG Server Component (`page.tsx`) calcule au build time la recommandation statique + sparkline via les libs existantes, puis passe en props à `DestinationPageClient` ("use client") qui gère le lang toggle et le formulaire de recherche live. On modifie ensuite WorldMap pour linker vers ces pages et on les ajoute au sitemap.

**Tech Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · SVG pur · lib/dealsEngine · lib/priceHistory · components/SearchForm · components/Results

---

## Fichiers

| Fichier | Action |
|---------|--------|
| `app/destinations/[iata]/page.tsx` | Créer |
| `app/destinations/[iata]/DestinationPageClient.tsx` | Créer |
| `__tests__/app/destinations/page.test.ts` | Créer |
| `app/carte/WorldMap.tsx` | Modifier (2 liens) |
| `app/sitemap.ts` | Modifier (+20 entrées) |

---

## Task 1 : Tests + `page.tsx`

**Files:**
- Create: `__tests__/app/destinations/page.test.ts`
- Create: `app/destinations/[iata]/page.tsx`

- [ ] **Step 1 : Créer le dossier de test et écrire les tests en échec**

```bash
mkdir -p /path/to/keza/__tests__/app/destinations
```

Créer `__tests__/app/destinations/page.test.ts` :

```typescript
import { DESTINATIONS } from "@/data/destinations";
import { computeDealRatio, classifyDeal } from "@/lib/dealsEngine";
import { getMonthlyPrices } from "@/lib/priceHistory";

// generateStaticParams ne peut pas être importé avant que page.tsx existe —
// on teste la logique équivalente directement.

describe("destinations static generation logic", () => {
  it("DESTINATIONS contient exactement 20 destinations", () => {
    expect(DESTINATIONS).toHaveLength(20);
  });

  it("chaque destination produit un iata lowercase de 3 caractères", () => {
    const params = DESTINATIONS.map((d) => ({ iata: d.iata.toLowerCase() }));
    for (const p of params) {
      expect(p.iata).toMatch(/^[a-z]{3}$/);
    }
  });

  it("chaque destination a une recommendation valide", () => {
    const valid = ["USE_MILES", "NEUTRAL", "USE_CASH"];
    for (const dest of DESTINATIONS) {
      const cpm = computeDealRatio(dest.cashEstimateUsd, dest.milesEstimate);
      const rec = classifyDeal(cpm);
      expect(valid).toContain(rec);
    }
  });

  it("chaque destination produit exactement 12 prix mensuels", () => {
    for (const dest of DESTINATIONS) {
      const history = getMonthlyPrices(dest);
      expect(history.monthlyPrices).toHaveLength(12);
    }
  });

  it("bestMonths et worstMonths ne sont jamais vides", () => {
    for (const dest of DESTINATIONS) {
      const history = getMonthlyPrices(dest);
      expect(history.bestMonths.length).toBeGreaterThan(0);
      expect(history.worstMonths.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2 : Vérifier que les tests passent (ils testent des libs existantes)**

```bash
cd /path/to/keza
npx jest __tests__/app/destinations/page.test.ts --no-coverage
```

Expected : 5 tests PASS (les libs existent déjà).

- [ ] **Step 3 : Créer `app/destinations/[iata]/page.tsx`**

```bash
mkdir -p app/destinations/\[iata\]
```

Créer `app/destinations/[iata]/page.tsx` :

```typescript
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DESTINATIONS } from "@/data/destinations";
import { computeDealRatio, classifyDeal } from "@/lib/dealsEngine";
import { getMonthlyPrices } from "@/lib/priceHistory";
import { DestinationPageClient } from "./DestinationPageClient";

interface Props {
  params: { iata: string };
}

const BASE_URL = "https://keza-taupe.vercel.app";

export async function generateStaticParams() {
  return DESTINATIONS.map((d) => ({ iata: d.iata.toLowerCase() }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dest = DESTINATIONS.find(
    (d) => d.iata.toLowerCase() === params.iata.toLowerCase()
  );
  if (!dest) return { title: "Destination not found — KEZA" };

  const title = `Vols Dakar → ${dest.city} — Cash ou Miles ? | KEZA`;
  const description = `Vols depuis Dakar (DSS) vers ${dest.city} (${dest.iata}). KEZA calcule si tes miles valent plus que le prix cash — estimation instantanée + recherche live.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${BASE_URL}/destinations/${dest.iata}`,
    },
    alternates: {
      canonical: `${BASE_URL}/destinations/${dest.iata}`,
    },
  };
}

export default function DestinationPage({ params }: Props) {
  const dest = DESTINATIONS.find(
    (d) => d.iata.toLowerCase() === params.iata.toLowerCase()
  );
  if (!dest) notFound();

  const cpm = computeDealRatio(dest.cashEstimateUsd, dest.milesEstimate);
  const recommendation = classifyDeal(cpm);
  const history = getMonthlyPrices(dest);

  // Schema.org TouristDestination
  const schema = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: dest.city,
    description: `Vols depuis Dakar vers ${dest.city} — comparaison cash vs miles KEZA`,
    touristType: "Voyageur miles",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <DestinationPageClient
        dest={dest}
        cpm={cpm}
        recommendation={recommendation}
        history={history}
      />
    </>
  );
}
```

- [ ] **Step 4 : Vérifier que le fichier compile (TypeScript)**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected : erreur sur `DestinationPageClient` (pas encore créé) — c'est normal à ce stade.

- [ ] **Step 5 : Commit**

```bash
git add __tests__/app/destinations/page.test.ts app/destinations/\[iata\]/page.tsx
git commit -m "feat: add destinations SSG page — generateStaticParams + metadata + data pipeline"
```

---

## Task 2 : `DestinationPageClient.tsx`

**Files:**
- Create: `app/destinations/[iata]/DestinationPageClient.tsx`

- [ ] **Step 1 : Créer `DestinationPageClient.tsx`**

Créer `app/destinations/[iata]/DestinationPageClient.tsx` :

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchForm } from "@/components/SearchForm";
import { Results } from "@/components/Results";
import type { Destination } from "@/data/destinations";
import { DESTINATIONS } from "@/data/destinations";
import type { DealRecommendation } from "@/lib/dealsEngine";
import type { DestinationPriceHistory } from "@/lib/priceHistory";
import type { FlightResult } from "@/lib/engine";

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  dest: Destination;
  cpm: number;
  recommendation: DealRecommendation;
  history: DestinationPriceHistory;
}

// ─── Constants ───────────────────────────────────────────────────────────────

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

// ─── Sparkline builder ───────────────────────────────────────────────────────

export function buildSparklinePoints(history: DestinationPriceHistory) {
  const prices = history.monthlyPrices.map((m) => m.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  const points = history.monthlyPrices.map((m, i) => ({
    x: (i / 11) * 380 + 10,
    y: 70 - ((m.price - minP) / range) * 60 + 5,
    isBest: history.bestMonths.includes(i),
    isWorst: history.worstMonths.includes(i),
    label: m.monthLabel,
    price: m.price,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  const area =
    `M ${points[0].x},75 ` +
    points.map((p) => `L ${p.x},${p.y}`).join(" ") +
    ` L ${points[11].x},75 Z`;

  return { points, polyline, area, minP, maxP };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DestinationPageClient({ dest, cpm, recommendation, history }: Props) {
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [results, setResults] = useState<FlightResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const fr = lang === "fr";

  const recLabels = fr ? REC_LABELS_FR : REC_LABELS_EN;
  const color = REC_COLORS[recommendation];

  // Sparkline
  const { points, polyline, area, minP, maxP } = buildSparklinePoints(history);
  const minIdx = points.findIndex((p) => p.price === minP);
  const maxIdx = points.findIndex((p) => p.price === maxP);

  // Best/worst month labels
  const bestLabels = history.bestMonths.map((i) => history.monthlyPrices[i].monthLabel);
  const worstLabels = history.worstMonths.map((i) => history.monthlyPrices[i].monthLabel);

  // KEZA note — cheapest month
  const cheapestMonth = history.monthlyPrices.reduce((min, m) =>
    m.price < min.price ? m : min
  );

  // Related destinations — same region, max 4
  const related = DESTINATIONS
    .filter((d) => d.iata !== dest.iata && d.region === dest.region)
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header lang={lang} onLangChange={setLang} />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pb-12">
        {/* Breadcrumb */}
        <nav className="pt-4 pb-2 text-xs text-muted">
          <Link href="/" className="hover:text-fg transition-colors">KEZA</Link>
          <span className="mx-1.5">/</span>
          <Link href="/carte" className="hover:text-fg transition-colors">
            {fr ? "Destinations" : "Destinations"}
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-fg">{dest.city}</span>
        </nav>

        {/* Hero */}
        <div className="pt-4 pb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">{dest.flag}</span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-fg leading-tight">
                {dest.city}
              </h1>
              <p className="text-sm text-muted">{dest.country}</p>
            </div>
          </div>

          {/* Recommendation badge */}
          <div
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black mb-3"
            style={{
              backgroundColor: `${color}22`,
              color,
              border: `1px solid ${color}44`,
            }}
          >
            {recLabels[recommendation]}
          </div>

          <p className="text-sm text-muted">
            {fr
              ? `Vols depuis Dakar estimés à $${dest.cashEstimateUsd} · ${(dest.milesEstimate / 1000).toFixed(0)}k miles`
              : `Flights from Dakar estimated at $${dest.cashEstimateUsd} · ${(dest.milesEstimate / 1000).toFixed(0)}k miles`
            }
          </p>
        </div>

        {/* Deal card */}
        <div className="bg-surface border border-border rounded-2xl p-4 mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-muted mb-1">{fr ? "Cash" : "Cash"}</div>
              <div className="text-xl font-black text-fg">${dest.cashEstimateUsd}</div>
            </div>
            <div>
              <div className="text-xs text-muted mb-1">{fr ? "Miles" : "Miles"}</div>
              <div className="text-xl font-black text-fg">
                {(dest.milesEstimate / 1000).toFixed(0)}k
              </div>
            </div>
            <div>
              <div className="text-xs text-muted mb-1">CPM</div>
              <div className="text-xl font-black text-fg">
                {cpm.toFixed(1)}¢
              </div>
            </div>
          </div>
        </div>

        {/* Sparkline */}
        <div className="bg-surface border border-border rounded-2xl p-4 mb-4">
          <h2 className="text-sm font-bold text-fg uppercase tracking-wide mb-3">
            {fr ? "Prix estimés sur 12 mois" : "Estimated prices over 12 months"}
          </h2>

          <svg
            viewBox="0 0 400 90"
            className="w-full"
            aria-label={fr ? "Graphique de saisonnalité" : "Seasonality chart"}
          >
            <defs>
              <linearGradient id={`grad-${dest.iata}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={color} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Area fill */}
            <path d={area} fill={`url(#grad-${dest.iata})`} />

            {/* Line */}
            <polyline
              points={polyline}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {points.map((p, i) => (
              <circle
                key={i}
                className="data-point"
                cx={p.x}
                cy={p.y}
                r={3}
                fill={
                  p.isBest ? "#10b981" :
                  p.isWorst ? "#ef4444" :
                  "#6b7280"
                }
              />
            ))}

            {/* Month labels — every other month */}
            {points
              .filter((_, i) => i % 2 === 0)
              .map((p, i) => (
                <text
                  key={i}
                  x={p.x}
                  y={88}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#6b7280"
                >
                  {p.label}
                </text>
              ))}

            {/* Min price label */}
            <text
              x={points[minIdx].x}
              y={points[minIdx].y - 6}
              textAnchor="middle"
              fontSize="8"
              fill="#10b981"
              fontWeight="bold"
            >
              ${minP}
            </text>

            {/* Max price label */}
            <text
              x={points[maxIdx].x}
              y={points[maxIdx].y - 6}
              textAnchor="middle"
              fontSize="8"
              fill="#ef4444"
              fontWeight="bold"
            >
              ${maxP}
            </text>
          </svg>

          {/* Best / worst badges */}
          <div className="flex flex-wrap gap-2 mt-3">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-400">
              ✓ {bestLabels.join(" · ")}
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] font-semibold text-red-400">
              ✕ {worstLabels.join(" · ")}
            </div>
          </div>

          {/* KEZA note */}
          <p className="text-xs text-muted mt-3 border-t border-border pt-3">
            💡 {fr
              ? `En ${cheapestMonth.monthLabel}, tes miles valent ${cheapestMonth.cpm.toFixed(1)}¢/mile → ${REC_LABELS_FR[cheapestMonth.recommendation]}`
              : `In ${cheapestMonth.monthLabel}, your miles are worth ${cheapestMonth.cpm.toFixed(1)}¢/mile → ${REC_LABELS_EN[cheapestMonth.recommendation]}`
            }
          </p>
        </div>

        {/* Search form */}
        <div className="mb-2">
          <p className="text-xs text-muted mb-3">
            {fr
              ? "Prix live — entre tes dates pour une comparaison exacte :"
              : "Live prices — enter your dates for an exact comparison:"
            }
          </p>
          <SearchForm
            onResults={(r) => { setResults(r); setHasSearched(true); }}
            onLoading={setLoading}
            lang={lang}
            initialFrom="DSS"
            initialTo={dest.iata}
          />
        </div>

        {/* Results */}
        {(hasSearched || loading) && (
          <div className="mt-6">
            <Results
              results={results}
              loading={loading}
              lang={lang}
              onBack={() => { setResults([]); setHasSearched(false); }}
            />
          </div>
        )}

        {/* Related destinations */}
        {related.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">
              {fr ? "Destinations similaires" : "Similar destinations"}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {related.map((d) => (
                <Link
                  key={d.iata}
                  href={`/destinations/${d.iata}`}
                  className="bg-surface border border-border rounded-xl px-4 py-3 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{d.flag}</span>
                    <div>
                      <div className="text-sm font-bold text-fg">{d.city}</div>
                      <div className="text-[11px] text-muted">{d.country}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer lang={lang} />
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier que TypeScript compile**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected : 0 erreurs. Si erreur sur `FlightResult` — vérifier l'export dans `lib/engine.ts` :
```bash
grep "export.*FlightResult" lib/engine.ts
```

- [ ] **Step 3 : Lancer les tests**

```bash
npx jest __tests__/app/destinations/ --no-coverage
```

Expected : 5 tests PASS.

- [ ] **Step 4 : Build de vérification**

```bash
npx next build 2>&1 | tail -20
```

Expected : `✓ Generating static pages (X/X)` sans erreur. Les 20 pages `/destinations/[iata]` doivent apparaître dans la liste.

- [ ] **Step 5 : Commit**

```bash
git add app/destinations/\[iata\]/DestinationPageClient.tsx
git commit -m "feat: add DestinationPageClient — hero, deal card, sparkline, SearchForm, related destinations"
```

---

## Task 3 : Wire up — WorldMap + sitemap

**Files:**
- Modify: `app/carte/WorldMap.tsx` (2 occurrences du lien)
- Modify: `app/sitemap.ts`

- [ ] **Step 1 : Mettre à jour les liens dans WorldMap.tsx**

Dans `app/carte/WorldMap.tsx`, remplacer les deux occurrences du lien "Rechercher ce vol" :

```typescript
// AVANT (ligne ~222, tooltip desktop)
href={`/?to=${selected.iata}`}

// APRÈS
href={`/destinations/${selected.iata}`}
```

```typescript
// AVANT (ligne ~280, bottom sheet mobile)
href={`/?to=${selected.iata}`}

// APRÈS
href={`/destinations/${selected.iata}`}
```

Vérifier avec grep qu'il ne reste aucune occurrence :
```bash
grep "/?to=" app/carte/WorldMap.tsx
```
Expected : aucune sortie.

- [ ] **Step 2 : Mettre à jour le texte du bouton dans WorldMap.tsx**

Mettre à jour les labels dans `L` (objet i18n en haut du fichier) :

```typescript
// AVANT
const L = {
  fr: {
    searchBtn: "Rechercher ce vol →",
    ...
  },
  en: {
    searchBtn: "Search this flight →",
    ...
  },
};

// APRÈS
const L = {
  fr: {
    searchBtn: "Voir la destination →",
    ...
  },
  en: {
    searchBtn: "View destination →",
    ...
  },
};
```

- [ ] **Step 3 : Ajouter les 20 destinations au sitemap**

Dans `app/sitemap.ts`, après la boucle `for (const route of ROUTES)`, ajouter :

```typescript
import { DESTINATIONS } from "@/data/destinations";

// ... (dans la fonction sitemap, après la boucle ROUTES)
for (const dest of DESTINATIONS) {
  pages.push({
    url: `${BASE_URL}/destinations/${dest.iata}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  });
}
```

L'import `DESTINATIONS` doit être ajouté en haut du fichier avec les autres imports.

- [ ] **Step 4 : Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected : 0 erreurs.

- [ ] **Step 5 : Build final**

```bash
npx next build 2>&1 | tail -20
```

Expected : build propre, 20 pages `/destinations/[iata]` générées statiquement.

- [ ] **Step 6 : Commit et push**

```bash
git add app/carte/WorldMap.tsx app/sitemap.ts
git commit -m "feat: wire up destinations — WorldMap links to /destinations/[iata], sitemap +20 entries"
git push origin main
```

- [ ] **Step 7 : Vérifier le déploiement Vercel**

```bash
# Attendre ~90 secondes puis :
curl -s -o /dev/null -w "%{http_code}" https://keza-taupe.vercel.app/destinations/CDG
```

Expected : `200`

```bash
curl -s https://keza-taupe.vercel.app/destinations/CDG | grep -o '<h1[^>]*>[^<]*</h1>'
```

Expected : `<h1 ...>Paris</h1>` (ou similaire avec les classes Tailwind).
