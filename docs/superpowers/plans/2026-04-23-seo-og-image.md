# SEO + og:image Dynamiques — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger le og:image cassé sur toutes les pages et ajouter des cartes de partage dynamiques (1200×630) via `next/og` — style gradient indigo avec nom de ville, prix, miles et badge deal.

**Architecture:** Convention Next.js 14 `opengraph-image.tsx` — chaque fichier placé dans un dossier de route génère automatiquement l'og:image pour cette route sans modifier les objets `metadata`. Un helper partagé `lib/og-templates.tsx` fournit le layout (wrapper gradient, top bar, bottom bar). Styles inline uniquement (contrainte satori). `next/og` est bundlé dans Next.js 14 — aucun package à installer.

**Tech Stack:** Next.js 14 · `next/og` (ImageResponse/satori, bundlé) · TypeScript · Edge Runtime

---

## Fichiers

| Fichier | Action |
|---|---|
| `lib/og-templates.tsx` | Créer — helpers JSX partagés |
| `app/opengraph-image.tsx` | Créer — og:image home |
| `app/destinations/[iata]/opengraph-image.tsx` | Créer — og:image dynamique par destination |
| `app/comparer/opengraph-image.tsx` | Créer — og:image /comparer |
| `app/prix/opengraph-image.tsx` | Créer — og:image /prix |
| `app/carte/opengraph-image.tsx` | Créer — og:image /carte |
| `app/layout.tsx` | Modifier — supprimer `images: ["/og-image.png"]` cassé |
| `app/destinations/[iata]/page.tsx` | Modifier — enrichir JSON-LD TouristDestination → TravelAction |

---

## Task 1 : Shared OG template + fix root layout

**Files:**
- Create: `lib/og-templates.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1 : Créer la branche `feat/seo-og-image`**

```bash
cd /Users/DIALLO9194/Downloads/keza && git checkout -b feat/seo-og-image
```

Attendu : `Switched to a new branch 'feat/seo-og-image'`

- [ ] **Step 2 : Créer `lib/og-templates.tsx`**

```tsx
// lib/og-templates.tsx
// Shared JSX layout helpers for all opengraph-image.tsx route files.
// IMPORTANT: inline styles only — no Tailwind, no CSS modules (satori requirement).

import React from "react";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** Full-bleed gradient background with decorative circles. Wraps all three sections. */
export function ogWrapper(children: React.ReactNode): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "48px 56px",
        background:
          "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        fontFamily: "sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative circle — top-right */}
      <div
        style={{
          position: "absolute",
          right: -80,
          top: -80,
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: "rgba(99, 102, 241, 0.15)",
          display: "flex",
        }}
      />
      {/* Decorative circle — bottom-right */}
      <div
        style={{
          position: "absolute",
          right: 40,
          bottom: -100,
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: "rgba(99, 102, 241, 0.08)",
          display: "flex",
        }}
      />
      {children}
    </div>
  );
}

/** Top bar: Keza logo (left) + pill label (right) */
export function ogTopBar(tag: string): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "relative",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            background: "#6366f1",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
        >
          ✈
        </div>
        <span style={{ color: "#ffffff", fontWeight: 700, fontSize: 17 }}>
          Keza
        </span>
      </div>
      {/* Pill */}
      <div
        style={{
          display: "flex",
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(165,180,252,0.2)",
          borderRadius: 24,
          padding: "5px 16px",
        }}
      >
        <span style={{ color: "#a5b4fc", fontSize: 13 }}>{tag}</span>
      </div>
    </div>
  );
}

/** Bottom bar: left text + keza.app (right) */
export function ogBottomBar(leftText: string): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        position: "relative",
      }}
    >
      <span style={{ color: "#4b5563", fontSize: 13 }}>{leftText}</span>
      <span style={{ color: "#374151", fontSize: 13 }}>keza.app</span>
    </div>
  );
}
```

- [ ] **Step 3 : Supprimer la référence `/og-image.png` cassée dans `app/layout.tsx`**

Dans `app/layout.tsx`, le bloc `metadata` (lignes 21-42) contient deux propriétés `images` qui référencent `/og-image.png` (fichier inexistant). La convention `opengraph-image.tsx` remplace ces valeurs — elles doivent être supprimées pour éviter le conflit.

Avant (dans l'objet `metadata`) :
```typescript
  openGraph: {
    title: "KEZA — Cash ou Miles ?",
    description: "Comparez le vrai coût de chaque vol : cash, miles ou transfert. Trouvez la meilleure option en 1 clic.",
    url: SITE_URL,
    siteName: "KEZA",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "KEZA — Cash ou Miles ? Comparateur de vols",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KEZA — Cash ou Miles ?",
    description: "Cash, miles ou transfert ? KEZA compare en temps réel et vous dit quoi choisir.",
    images: ["/og-image.png"],
  },
```

Après :
```typescript
  openGraph: {
    title: "KEZA — Cash ou Miles ?",
    description: "Comparez le vrai coût de chaque vol : cash, miles ou transfert. Trouvez la meilleure option en 1 clic.",
    url: SITE_URL,
    siteName: "KEZA",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KEZA — Cash ou Miles ?",
    description: "Cash, miles ou transfert ? KEZA compare en temps réel et vous dit quoi choisir.",
  },
```

- [ ] **Step 4 : Vérifier TypeScript**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx tsc --noEmit
```

Attendu : aucune erreur

- [ ] **Step 5 : Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza && git add lib/og-templates.tsx app/layout.tsx && git commit -m "feat: add shared OG template helpers + fix broken og-image reference in root layout"
```

---

## Task 2 : Home og:image

**Files:**
- Create: `app/opengraph-image.tsx`

- [ ] **Step 1 : Créer `app/opengraph-image.tsx`**

```tsx
// app/opengraph-image.tsx
// og:image pour la home page (keza.app).
// Convention Next.js 14 : ce fichier auto-wire l'og:image du segment racine.

import { ImageResponse } from "next/og";
import {
  ogWrapper,
  ogTopBar,
  ogBottomBar,
  OG_WIDTH,
  OG_HEIGHT,
} from "@/lib/og-templates";

export const runtime = "edge";
export const size = { width: OG_WIDTH, height: OG_HEIGHT };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    ogWrapper(
      <>
        {ogTopBar("Comparateur de vols")}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          <span
            style={{
              color: "#ffffff",
              fontSize: 68,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: "-2px",
              marginBottom: 16,
            }}
          >
            Cash ou Miles ?
          </span>
          <span style={{ color: "#a5b4fc", fontSize: 22 }}>
            Compare le vrai coût de chaque vol depuis Dakar
          </span>
        </div>
        {ogBottomBar("20 destinations · mise à jour mensuelle")}
      </>
    ),
    { width: OG_WIDTH, height: OG_HEIGHT }
  );
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx tsc --noEmit
```

Attendu : aucune erreur

- [ ] **Step 3 : Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza && git add app/opengraph-image.tsx && git commit -m "feat: add home og:image — Keza brand card"
```

---

## Task 3 : og:image dynamique par destination

**Files:**
- Create: `app/destinations/[iata]/opengraph-image.tsx`

**Contexte fonctions disponibles :**
- `DESTINATIONS` depuis `@/data/destinations` — contient `iata`, `city`, `country`, `cashEstimateUsd`, `milesEstimate`
- `computeDealRatio(cashEstimateUsd, milesEstimate): number` — retourne cents per mile
- `classifyDeal(cpm): "USE_MILES" | "USE_CASH" | "NEUTRAL"`
- `getMonthlyPrices(dest): DestinationPriceHistory` — retourne `{ bestMonths: number[], monthlyPrices: { monthLabel: string }[] }`
- Conversion USD→EUR utilisée dans tout le codebase : `Math.round(cashEstimateUsd * 0.92)`

- [ ] **Step 1 : Créer `app/destinations/[iata]/opengraph-image.tsx`**

```tsx
// app/destinations/[iata]/opengraph-image.tsx
// og:image dynamique par destination.
// Affiche : ville, pays/IATA, miles, prix EUR, badge deal, meilleurs mois.
// Edge runtime — accès données statiques uniquement (DESTINATIONS, priceHistory).

import { ImageResponse } from "next/og";
import { DESTINATIONS } from "@/data/destinations";
import { computeDealRatio, classifyDeal } from "@/lib/dealsEngine";
import { getMonthlyPrices } from "@/lib/priceHistory";
import {
  ogWrapper,
  ogTopBar,
  ogBottomBar,
  OG_WIDTH,
  OG_HEIGHT,
} from "@/lib/og-templates";

export const runtime = "edge";
export const size = { width: OG_WIDTH, height: OG_HEIGHT };
export const contentType = "image/png";

type Props = { params: { iata: string } };

/** Badge colors per deal recommendation */
const BADGE_STYLES = {
  USE_MILES: {
    text: "Utilise tes miles",
    bg: "rgba(99,102,241,0.2)",
    border: "rgba(99,102,241,0.4)",
    color: "#818cf8",
  },
  USE_CASH: {
    text: "Utilise le cash",
    bg: "rgba(239,68,68,0.2)",
    border: "rgba(239,68,68,0.4)",
    color: "#f87171",
  },
  NEUTRAL: {
    text: "Neutre",
    bg: "rgba(107,114,128,0.2)",
    border: "rgba(107,114,128,0.4)",
    color: "#9ca3af",
  },
} as const;

export default async function Image({ params }: Props) {
  const dest = DESTINATIONS.find(
    (d) => d.iata.toLowerCase() === params.iata.toLowerCase()
  );

  // Fallback to brand image if destination not found
  if (!dest) {
    return new ImageResponse(
      ogWrapper(
        <>
          {ogTopBar("Comparateur de vols")}
          <div
            style={{ display: "flex", flexDirection: "column", position: "relative" }}
          >
            <span
              style={{
                color: "#ffffff",
                fontSize: 68,
                fontWeight: 900,
                lineHeight: 1.1,
              }}
            >
              Cash ou Miles ?
            </span>
          </div>
          {ogBottomBar("keza.app")}
        </>
      ),
      { width: OG_WIDTH, height: OG_HEIGHT }
    );
  }

  const cpm = computeDealRatio(dest.cashEstimateUsd, dest.milesEstimate);
  const recommendation = classifyDeal(cpm);
  const history = getMonthlyPrices(dest);
  const bestMonthLabels = history.bestMonths
    .slice(0, 3)
    .map((i) => history.monthlyPrices[i].monthLabel);

  const priceEur = Math.round(dest.cashEstimateUsd * 0.92);
  // toLocaleString not reliable in Edge — format manually
  const milesFormatted =
    dest.milesEstimate >= 1000
      ? Math.floor(dest.milesEstimate / 1000) +
        " " +
        String(dest.milesEstimate % 1000).padStart(3, "0")
      : String(dest.milesEstimate);

  const badge = BADGE_STYLES[recommendation];

  return new ImageResponse(
    ogWrapper(
      <>
        {ogTopBar("Dakar \u2192 " + dest.city)}
        <div
          style={{ display: "flex", flexDirection: "column", position: "relative" }}
        >
          <span style={{ color: "#6b7280", fontSize: 14, marginBottom: 8 }}>
            {dest.country} · {dest.iata}
          </span>
          <span
            style={{
              color: "#ffffff",
              fontSize: 72,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-2px",
              marginBottom: 20,
            }}
          >
            {dest.city}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ color: "#a5b4fc", fontSize: 22 }}>
              {milesFormatted} pts
            </span>
            <span style={{ color: "#4b5563", fontSize: 18 }}>·</span>
            <span style={{ color: "#a5b4fc", fontSize: 22 }}>~{priceEur}€</span>
            <div
              style={{
                display: "flex",
                background: badge.bg,
                border: "1px solid " + badge.border,
                borderRadius: 8,
                padding: "5px 14px",
                marginLeft: 8,
              }}
            >
              <span style={{ color: badge.color, fontSize: 14 }}>
                {badge.text}
              </span>
            </div>
          </div>
        </div>
        {ogBottomBar(
          bestMonthLabels.length > 0
            ? "Meilleurs mois : " + bestMonthLabels.join(" · ")
            : "keza.app"
        )}
      </>
    ),
    { width: OG_WIDTH, height: OG_HEIGHT }
  );
}
```

**Note sur `milesFormatted` :** `toLocaleString()` n'est pas fiable sur l'Edge Runtime. Le formatage manuel `75 000` est implémenté directement (fonctionne pour les valeurs < 1 000 000 — toutes les destinations de KEZA ont des estimations dans cette plage).

- [ ] **Step 2 : Vérifier TypeScript**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx tsc --noEmit
```

Attendu : aucune erreur

- [ ] **Step 3 : Vérifier que les tests passent toujours**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx jest --no-coverage 2>&1 | tail -5
```

Attendu :
```
Test Suites: 12 passed, 12 total
Tests:       79 passed, 79 total
```

- [ ] **Step 4 : Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza && git add app/destinations/\[iata\]/opengraph-image.tsx && git commit -m "feat: add dynamic og:image per destination — city, miles, price, deal badge"
```

---

## Task 4 : og:image statiques — comparer, prix, carte

**Files:**
- Create: `app/comparer/opengraph-image.tsx`
- Create: `app/prix/opengraph-image.tsx`
- Create: `app/carte/opengraph-image.tsx`

- [ ] **Step 1 : Créer `app/comparer/opengraph-image.tsx`**

```tsx
// app/comparer/opengraph-image.tsx
// og:image statique pour la page /comparer.

import { ImageResponse } from "next/og";
import {
  ogWrapper,
  ogTopBar,
  ogBottomBar,
  OG_WIDTH,
  OG_HEIGHT,
} from "@/lib/og-templates";

export const runtime = "edge";
export const size = { width: OG_WIDTH, height: OG_HEIGHT };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    ogWrapper(
      <>
        {ogTopBar("Comparateur de destinations")}
        <div
          style={{ display: "flex", flexDirection: "column", position: "relative" }}
        >
          <span
            style={{
              color: "#ffffff",
              fontSize: 64,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: "-2px",
              marginBottom: 16,
            }}
          >
            Comparez 3 destinations
          </span>
          <span style={{ color: "#a5b4fc", fontSize: 22 }}>
            Miles, cash et meilleure période côte-à-côte
          </span>
        </div>
        {ogBottomBar("keza.app/comparer")}
      </>
    ),
    { width: OG_WIDTH, height: OG_HEIGHT }
  );
}
```

- [ ] **Step 2 : Créer `app/prix/opengraph-image.tsx`**

```tsx
// app/prix/opengraph-image.tsx
// og:image statique pour la page /prix.

import { ImageResponse } from "next/og";
import {
  ogWrapper,
  ogTopBar,
  ogBottomBar,
  OG_WIDTH,
  OG_HEIGHT,
} from "@/lib/og-templates";

export const runtime = "edge";
export const size = { width: OG_WIDTH, height: OG_HEIGHT };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    ogWrapper(
      <>
        {ogTopBar("Meilleur moment pour voyager")}
        <div
          style={{ display: "flex", flexDirection: "column", position: "relative" }}
        >
          <span
            style={{
              color: "#ffffff",
              fontSize: 64,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: "-2px",
              marginBottom: 16,
            }}
          >
            Prix mois par mois
          </span>
          <span style={{ color: "#a5b4fc", fontSize: 22 }}>
            20 destinations · quand partir pour payer moins
          </span>
        </div>
        {ogBottomBar("keza.app/prix")}
      </>
    ),
    { width: OG_WIDTH, height: OG_HEIGHT }
  );
}
```

- [ ] **Step 3 : Créer `app/carte/opengraph-image.tsx`**

```tsx
// app/carte/opengraph-image.tsx
// og:image statique pour la page /carte.

import { ImageResponse } from "next/og";
import {
  ogWrapper,
  ogTopBar,
  ogBottomBar,
  OG_WIDTH,
  OG_HEIGHT,
} from "@/lib/og-templates";

export const runtime = "edge";
export const size = { width: OG_WIDTH, height: OG_HEIGHT };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    ogWrapper(
      <>
        {ogTopBar("Carte des destinations")}
        <div
          style={{ display: "flex", flexDirection: "column", position: "relative" }}
        >
          <span
            style={{
              color: "#ffffff",
              fontSize: 64,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: "-2px",
              marginBottom: 16,
            }}
          >
            Explore le monde
          </span>
          <span style={{ color: "#a5b4fc", fontSize: 22 }}>
            20 destinations depuis Dakar — miles ou cash ?
          </span>
        </div>
        {ogBottomBar("keza.app/carte")}
      </>
    ),
    { width: OG_WIDTH, height: OG_HEIGHT }
  );
}
```

- [ ] **Step 4 : Vérifier TypeScript**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx tsc --noEmit
```

Attendu : aucune erreur

- [ ] **Step 5 : Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza && git add app/comparer/opengraph-image.tsx app/prix/opengraph-image.tsx app/carte/opengraph-image.tsx && git commit -m "feat: add static og:image for comparer, prix, carte pages"
```

---

## Task 5 : Enrichir JSON-LD sur les pages destinations

**Files:**
- Modify: `app/destinations/[iata]/page.tsx`

**Contexte :** Le fichier contient déjà un schéma `TouristDestination` (lignes 52-64) et passe déjà `cpm`, `recommendation`, `history` calculés à `DestinationPageClient`. Il suffit de remplacer le contenu de l'objet `schema`.

- [ ] **Step 1 : Remplacer le schéma JSON-LD dans `app/destinations/[iata]/page.tsx`**

Trouver ce bloc (lignes ~48-64) :
```tsx
  const cpm = computeDealRatio(dest.cashEstimateUsd, dest.milesEstimate);
  const recommendation = classifyDeal(cpm);
  const history = getMonthlyPrices(dest);

  const schema = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: dest.city,
    description: `Vols depuis Dakar vers ${dest.city} — comparaison cash vs miles KEZA`,
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
```

Le remplacer par :
```tsx
  const cpm = computeDealRatio(dest.cashEstimateUsd, dest.milesEstimate);
  const recommendation = classifyDeal(cpm);
  const history = getMonthlyPrices(dest);
  const priceEur = Math.round(dest.cashEstimateUsd * 0.92);

  const schema = {
    "@context": "https://schema.org",
    "@type": "TravelAction",
    name: `Vol Dakar \u2192 ${dest.city} \u2014 Cash ou Miles ?`,
    description: `Comparer le prix cash (~${priceEur}\u20ac) versus ${dest.milesEstimate.toLocaleString("fr-FR")} miles pour un vol Dakar (DSS) \u2192 ${dest.city} (${dest.iata}).`,
    fromLocation: {
      "@type": "Airport",
      name: "A\u00e9roport International Blaise Diagne",
      iataCode: "DSS",
    },
    toLocation: {
      "@type": "Airport",
      name: dest.city,
      iataCode: dest.iata,
    },
    offers: {
      "@type": "Offer",
      price: priceEur,
      priceCurrency: "EUR",
    },
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
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx tsc --noEmit
```

Attendu : aucune erreur

- [ ] **Step 3 : Vérifier que les tests passent**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx jest --no-coverage 2>&1 | tail -5
```

Attendu :
```
Test Suites: 12 passed, 12 total
Tests:       79 passed, 79 total
```

- [ ] **Step 4 : Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza && git add app/destinations/\[iata\]/page.tsx && git commit -m "feat: upgrade JSON-LD TouristDestination → TravelAction with price and miles data"
```

---

## Task 6 : Push + validation Vercel preview

**Files:** aucun fichier source — uniquement git push

- [ ] **Step 1 : Pousser la branche vers origin**

```bash
cd /Users/DIALLO9194/Downloads/keza && git push -u origin feat/seo-og-image
```

Attendu : branche poussée sur origin (créée en Task 1 Step 1), Vercel déclenche un déploiement preview.

- [ ] **Step 2 : Récupérer l'URL Vercel preview**

```bash
cd /Users/DIALLO9194/Downloads/keza && vercel inspect $(vercel ls 2>/dev/null | head -1) 2>/dev/null | grep "feat-seo-og-image"
```

URL attendue : `https://keza-git-feat-seo-og-image-elzzoo-6820s-projects.vercel.app`

- [ ] **Step 3 : Valider les og:image**

Tester chaque URL sur https://opengraph.xyz :
- `[preview-url]/` — image home
- `[preview-url]/destinations/nrt` — image destination Tokyo
- `[preview-url]/destinations/cdg` — image destination Paris
- `[preview-url]/comparer` — image comparateur
- `[preview-url]/prix` — image prix
- `[preview-url]/carte` — image carte

- [ ] **Step 4 : Reporter l'URL preview à l'utilisateur**
