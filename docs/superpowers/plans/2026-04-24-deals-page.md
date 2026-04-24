# Deals Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer une page publique `/deals` qui affiche tous les deals cash vs miles en temps réel, avec filtres par recommandation et un CTA vers la recherche.

**Architecture:** Page Next.js 14 hybride — `app/deals/page.tsx` (Server Component) pour le metadata + fetch Redis, `app/deals/DealsPageClient.tsx` (Client Component) pour les filtres interactifs. OG image via `app/deals/opengraph-image.tsx`. Le `DealsStrip` "Voir tous →" pointe désormais vers `/deals`. `/deals` ajouté au sitemap.

**Tech Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · Redis (Upstash) · ImageResponse (OG)

---

## Contexte codebase

- `lib/dealsEngine.ts` — Types exportés : `LiveDeal`, `DealRecommendation`. Fonctions : `enrichDeal`, `sortDeals`. Interface `LiveDeal` : `from`, `to`, `fromFlag`, `toFlag`, `cashPrice`, `milesRequired`, `program`, `ratio`, `recommendation`, `multiplier`.
- `lib/redis.ts` — `import { redis } from "@/lib/redis"` — client Upstash.
- `lib/redisKeys.ts` — `DEALS_KEY` string constant (clé Redis pour les deals).
- `app/api/deals/route.ts` — Pattern existant : `redis.get<LiveDeal[]>(DEALS_KEY)` + fallback statique. **Reproduire ce pattern directement dans le Server Component.**
- `app/deals/` — Dossier à créer.
- `components/DealsStrip.tsx` — Le span `{t.all}` ("Voir tous →") est actuellement non-lié. À remplacer par un `<Link href="/deals">`.
- `app/sitemap.ts` — Ajouter `/deals` avec `priority: 0.9`, `changeFrequency: "daily"`.
- `app/comparer/page.tsx` — Référence de structure pour une page avec metadata + Client Component.
- Design tokens : `bg-surface`, `bg-surface-2`, `border-border`, `text-fg`, `text-muted`, `text-subtle`. Couleur primaire : `#3b82f6`. Miles = `text-blue-400`, Cash = `text-warning`.

## Fichiers

| Fichier | Action | Contenu |
|---|---|---|
| `app/deals/page.tsx` | Créer | Server Component — metadata, fetch Redis, passe deals à DealsPageClient |
| `app/deals/DealsPageClient.tsx` | Créer | Client Component — filtres tabs, grille de cards |
| `app/deals/opengraph-image.tsx` | Créer | OG image 1200×630 |
| `components/DealsStrip.tsx` | Modifier | "Voir tous →" → `<Link href="/deals">` |
| `app/sitemap.ts` | Modifier | Ajouter `/deals` |

---

## Task 1 : Créer `app/deals/DealsPageClient.tsx`

**Files:**
- Create: `app/deals/DealsPageClient.tsx`

- [ ] **Step 1 : Vérifier la branche**

```bash
cd /Users/DIALLO9194/Downloads/keza && git branch --show-current
```

Attendu : `feat/deals-page`

- [ ] **Step 2 : Créer `app/deals/DealsPageClient.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import type { LiveDeal, DealRecommendation } from "@/lib/dealsEngine";

type Filter = "all" | DealRecommendation;

const FILTER_LABELS: Record<Filter, string> = {
  all:        "Tous",
  USE_MILES:  "✈ Miles gagnent",
  USE_CASH:   "💰 Cash gagne",
  NEUTRAL:    "Neutre",
};

const RECOMMENDATION_COLORS: Record<DealRecommendation, { badge: string; border: string }> = {
  USE_MILES: { badge: "bg-blue-500/15 text-blue-400 border-blue-500/25",  border: "border-blue-500/20" },
  USE_CASH:  { badge: "bg-amber-500/15 text-amber-400 border-amber-500/25", border: "border-amber-500/20" },
  NEUTRAL:   { badge: "bg-slate-500/15 text-slate-400 border-slate-500/25", border: "border-slate-500/20" },
};

function DealCard({ deal }: { deal: LiveDeal }) {
  const colors = RECOMMENDATION_COLORS[deal.recommendation];
  const searchUrl = `/?from=${deal.from}&to=${deal.to}`;

  return (
    <div className={`bg-surface border ${colors.border} rounded-2xl p-5 flex flex-col gap-4 hover:bg-surface-2 transition-colors`}>
      {/* Header: flags + route */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{deal.fromFlag}{deal.toFlag}</span>
          </div>
          <p className="text-base font-bold text-fg">{deal.from} → {deal.to}</p>
          <p className="text-xs text-subtle">{deal.program}</p>
        </div>
        <div className={`text-[11px] font-black px-2.5 py-1 rounded-lg border ${colors.badge} flex-shrink-0`}>
          {deal.recommendation === "USE_MILES"
            ? `✈ ${deal.multiplier} / mile`
            : deal.recommendation === "USE_CASH"
            ? "💰 Cash optimal"
            : "≈ Équivalent"}
        </div>
      </div>

      {/* Prices */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0a0a0f] rounded-xl p-3">
          <p className="text-[10px] text-subtle uppercase tracking-wider mb-1">Cash</p>
          <p className="text-lg font-black text-fg">${deal.cashPrice}</p>
        </div>
        <div className="bg-[#0a0a0f] rounded-xl p-3">
          <p className="text-[10px] text-subtle uppercase tracking-wider mb-1">Miles</p>
          <p className="text-lg font-black text-fg">{deal.milesRequired.toLocaleString("fr-FR")}</p>
        </div>
      </div>

      {/* CPM ratio */}
      <div className="flex items-center justify-between text-xs text-subtle">
        <span>Valeur / mile</span>
        <span className="font-bold text-fg">{deal.ratio.toFixed(2)} ¢/mile</span>
      </div>

      {/* CTA */}
      <Link
        href={searchUrl}
        className="block text-center bg-primary/10 hover:bg-primary/20 text-blue-400 border border-primary/20 rounded-xl py-2.5 text-sm font-semibold transition-colors"
      >
        Analyser ce vol →
      </Link>
    </div>
  );
}

export function DealsPageClient({ initialDeals }: { initialDeals: LiveDeal[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = filter === "all"
    ? initialDeals
    : initialDeals.filter((d) => d.recommendation === filter);

  const filters: Filter[] = ["all", "USE_MILES", "USE_CASH", "NEUTRAL"];

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
              filter === f
                ? "bg-primary text-white border-primary"
                : "bg-surface text-muted border-border hover:border-primary/40"
            }`}
          >
            {FILTER_LABELS[f]}
            {f !== "all" && (
              <span className="ml-1.5 text-xs opacity-70">
                ({initialDeals.filter((d) => d.recommendation === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-muted text-sm text-center py-12">Aucun deal dans cette catégorie.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((deal) => (
            <DealCard key={`${deal.from}-${deal.to}`} deal={deal} />
          ))}
        </div>
      )}

      {/* Alert CTA */}
      <div className="mt-12 bg-surface border border-border rounded-2xl p-6 text-center">
        <p className="text-fg font-semibold mb-1">Un vol vous intéresse ?</p>
        <p className="text-sm text-subtle mb-4">
          Créez une alerte prix — KEZA vous prévient dès qu&apos;il baisse de 10 %.
        </p>
        <Link
          href="/"
          className="inline-block bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Créer une alerte →
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3 : Vérifier TypeScript**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx tsc --noEmit && echo "TSC OK"
```

- [ ] **Step 4 : Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza && git add app/deals/DealsPageClient.tsx && git commit -m "feat: add DealsPageClient with filter tabs and deal cards"
```

---

## Task 2 : Créer `app/deals/page.tsx`

**Files:**
- Create: `app/deals/page.tsx`

- [ ] **Step 1 : Créer `app/deals/page.tsx`**

```tsx
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DealsPageClient } from "./DealsPageClient";
import { redis } from "@/lib/redis";
import { DEALS_KEY } from "@/lib/redisKeys";
import { sortDeals } from "@/lib/dealsEngine";
import type { LiveDeal, RawDeal } from "@/lib/dealsEngine";

export const revalidate = 3600; // Re-fetch every hour

export const metadata: Metadata = {
  title: "Deals cash vs miles du moment | KEZA",
  description:
    "Comparez les meilleurs deals vols en cash et en miles. KEZA calcule en temps réel quand payer cash ou utiliser vos miles.",
  openGraph: {
    title: "Deals cash vs miles | KEZA",
    description: "Les meilleurs deals vols — cash ou miles — mis à jour en continu.",
    images: [{ url: "/deals/opengraph-image" }],
  },
};

// Fallback statique si le cron n'a pas encore tourné
const FALLBACK_DEALS: RawDeal[] = [
  { from: "DSS", to: "CDG", fromFlag: "🇸🇳", toFlag: "🇫🇷", cashPrice: 680, milesRequired: 35000, program: "Flying Blue" },
  { from: "JFK", to: "LHR", fromFlag: "🇺🇸", toFlag: "🇬🇧", cashPrice: 520, milesRequired: 26000, program: "Aeroplan" },
  { from: "LOS", to: "LHR", fromFlag: "🇳🇬", toFlag: "🇬🇧", cashPrice: 490, milesRequired: 32000, program: "LifeMiles" },
  { from: "CMN", to: "CDG", fromFlag: "🇲🇦", toFlag: "🇫🇷", cashPrice: 320, milesRequired: 18000, program: "Flying Blue" },
  { from: "CDG", to: "NRT", fromFlag: "🇫🇷", toFlag: "🇯🇵", cashPrice: 610, milesRequired: 55000, program: "Miles&Smiles" },
  { from: "ABJ", to: "CDG", fromFlag: "🇨🇮", toFlag: "🇫🇷", cashPrice: 590, milesRequired: 30000, program: "Flying Blue" },
];

async function getDeals(): Promise<LiveDeal[]> {
  try {
    const cached = await redis.get<LiveDeal[]>(DEALS_KEY);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
  } catch {
    // Redis unavailable — use fallback
  }
  return sortDeals(FALLBACK_DEALS);
}

export default async function DealsPage() {
  const deals = await getDeals();

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Header lang="fr" />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-muted uppercase tracking-wider">Live</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-fg mb-2">
            Deals cash vs miles du moment
          </h1>
          <p className="text-sm text-subtle max-w-xl">
            KEZA calcule en temps réel la valeur de vos miles sur chaque route.
            Payez au meilleur prix — cash ou miles.
          </p>
        </div>

        <DealsPageClient initialDeals={deals} />
      </main>

      <Footer lang="fr" />
    </div>
  );
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx tsc --noEmit && echo "TSC OK"
```

- [ ] **Step 3 : Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza && git add app/deals/page.tsx && git commit -m "feat: add /deals server page with metadata and Redis fetch"
```

---

## Task 3 : OG image + DealsStrip link + sitemap

**Files:**
- Create: `app/deals/opengraph-image.tsx`
- Modify: `components/DealsStrip.tsx`
- Modify: `app/sitemap.ts`

- [ ] **Step 1 : Créer `app/deals/opengraph-image.tsx`**

```tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Deals cash vs miles | KEZA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a1a 0%, #1e3a5f 100%)",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", fontSize: 52, fontWeight: 900, marginBottom: 24 }}>
          <span style={{ color: "#3b82f6" }}>KE</span>
          <span style={{ color: "#e2e8f0" }}>ZA</span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 44,
            fontWeight: 800,
            color: "#e2e8f0",
            textAlign: "center",
            lineHeight: 1.2,
            maxWidth: 800,
            marginBottom: 16,
          }}
        >
          Deals cash vs miles du moment
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: 22, color: "#94a3b8", textAlign: "center", maxWidth: 600 }}>
          Payez au meilleur prix — cash ou miles — sur chaque vol
        </div>

        {/* Live badge */}
        <div
          style={{
            marginTop: 40,
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(59,130,246,0.15)",
            border: "1px solid rgba(59,130,246,0.3)",
            borderRadius: 99,
            padding: "10px 24px",
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#ef4444",
            }}
          />
          <span style={{ color: "#94a3b8", fontSize: 18, fontWeight: 600 }}>
            Mis à jour en temps réel
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
```

- [ ] **Step 2 : Modifier `components/DealsStrip.tsx` — lier "Voir tous →" à `/deals`**

Lire le fichier. Trouver le span avec `{t.all}` :

```tsx
<span className="text-xs text-subtle">{t.all}</span>
```

Remplacer par :

```tsx
<Link href="/deals" className="text-xs text-subtle hover:text-primary transition-colors">
  {t.all}
</Link>
```

Ajouter l'import `Link` en haut du fichier :

```tsx
import Link from "next/link";
```

- [ ] **Step 3 : Modifier `app/sitemap.ts` — ajouter `/deals`**

Lire le fichier. Dans le tableau `pages`, après l'entrée `/alertes`, ajouter :

```ts
{
  url: `${BASE_URL}/deals`,
  lastModified: now,
  changeFrequency: "daily" as const,
  priority: 0.9,
},
```

- [ ] **Step 4 : Vérifier TypeScript**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx tsc --noEmit && echo "TSC OK"
```

- [ ] **Step 5 : Vérifier tests**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx jest --no-coverage 2>&1 | tail -5
```

- [ ] **Step 6 : Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza && git add app/deals/opengraph-image.tsx components/DealsStrip.tsx app/sitemap.ts && git commit -m "feat: add OG image, link DealsStrip to /deals, add to sitemap"
```

---

## Task 4 : Push + merge

- [ ] **Step 1 : Pousser la branche**

```bash
cd /Users/DIALLO9194/Downloads/keza && git push -u origin feat/deals-page
```

- [ ] **Step 2 : Merger sur main**

```bash
cd /Users/DIALLO9194/Downloads/keza && git checkout main && git merge feat/deals-page --no-edit && git push origin main
```
