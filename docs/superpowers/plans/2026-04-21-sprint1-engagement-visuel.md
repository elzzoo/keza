# Sprint 1 — Engagement visuel : Deals, Destinations, Calculateur

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter 3 features visuelles à la homepage de KEZA — strip de deals live, grille destinations avec photos Unsplash, calculateur de valeur miles — pour augmenter l'engagement et la conversion.

**Architecture:** Les deals sont pré-calculés par un cron job (Redis cache), les photos destinations sont proxiées côté serveur via `/api/unsplash` pour protéger la clé API, le calculateur est une page statique + widget inline. La homepage reçoit les 3 nouvelles sections dans l'ordre : DealsStrip → SearchForm → DestinationsGrid + MilesCalculatorWidget.

**Tech Stack:** Next.js 14 App Router · TypeScript · Tailwind · Upstash Redis · Unsplash API · Travelpayouts API · Jest + ts-jest

---

## File Map

### Nouveaux fichiers
| Fichier | Rôle |
|---------|------|
| `data/destinations.ts` | Liste statique de 20 destinations avec métadonnées |
| `lib/dealsEngine.ts` | Calcul des ratios deals (pure, testable) |
| `app/api/deals/route.ts` | GET deals depuis Redis avec fallback statique |
| `app/api/unsplash/route.ts` | Proxy Unsplash — protège la clé API |
| `app/api/cron/deals/route.ts` | Cron job refresh deals toutes les 6h |
| `components/DealsStrip.tsx` | Strip scrollable deals du moment |
| `components/DestinationsGrid.tsx` | Grille destinations avec filtres et photos |
| `components/MilesCalculatorWidget.tsx` | Widget calculateur inline (homepage) |
| `app/calculateur/page.tsx` | Page calculateur complète `/calculateur` |
| `__tests__/lib/dealsEngine.test.ts` | Tests unitaires dealsEngine |

### Fichiers modifiés
| Fichier | Changement |
|---------|------------|
| `app/page.tsx` | Ajouter DealsStrip, DestinationsGrid, MilesCalculatorWidget |
| `components/Header.tsx` | NAV: `#calc` → `/calculateur` |
| `app/sitemap.ts` | Ajouter `/calculateur` |
| `vercel.json` | Ajouter cron `/api/cron/deals` toutes les 6h |
| `lib/analytics.ts` | Ajouter trackDealClick, trackDestinationClick |

---

## Task 1 — Données statiques : destinations + valeurs miles

**Files:**
- Create: `data/destinations.ts`

- [ ] **Créer `data/destinations.ts`** avec la liste des 20 destinations

```typescript
// data/destinations.ts

export type Region = "africa" | "europe" | "americas" | "asia" | "middle-east" | "oceania";

export interface Destination {
  iata: string;           // code aéroport destination
  city: string;
  country: string;
  flag: string;           // emoji drapeau
  region: Region;
  unsplashQuery: string;  // requête pour Unsplash API
  // prix indicatifs depuis DSS (fallback si pas de deal live)
  cashEstimateUsd: number;
  milesEstimate: number;
}

export const DESTINATIONS: Destination[] = [
  // ── Europe ──
  { iata: "CDG", city: "Paris",       country: "France",      flag: "🇫🇷", region: "europe",       unsplashQuery: "paris eiffel tower",          cashEstimateUsd: 680,  milesEstimate: 35000 },
  { iata: "LHR", city: "Londres",     country: "UK",          flag: "🇬🇧", region: "europe",       unsplashQuery: "london tower bridge",          cashEstimateUsd: 580,  milesEstimate: 30000 },
  { iata: "MAD", city: "Madrid",      country: "Espagne",     flag: "🇪🇸", region: "europe",       unsplashQuery: "madrid spain city",            cashEstimateUsd: 520,  milesEstimate: 28000 },
  { iata: "FCO", city: "Rome",        country: "Italie",      flag: "🇮🇹", region: "europe",       unsplashQuery: "rome colosseum italy",         cashEstimateUsd: 550,  milesEstimate: 30000 },
  { iata: "IST", city: "Istanbul",    country: "Turquie",     flag: "🇹🇷", region: "europe",       unsplashQuery: "istanbul turkey bosphorus",    cashEstimateUsd: 420,  milesEstimate: 22000 },
  // ── Amériques ──
  { iata: "JFK", city: "New York",    country: "USA",         flag: "🇺🇸", region: "americas",     unsplashQuery: "new york city skyline",        cashEstimateUsd: 820,  milesEstimate: 55000 },
  { iata: "MIA", city: "Miami",       country: "USA",         flag: "🇺🇸", region: "americas",     unsplashQuery: "miami beach sunset",           cashEstimateUsd: 780,  milesEstimate: 50000 },
  { iata: "YUL", city: "Montréal",    country: "Canada",      flag: "🇨🇦", region: "americas",     unsplashQuery: "montreal canada old city",     cashEstimateUsd: 760,  milesEstimate: 48000 },
  { iata: "GRU", city: "São Paulo",   country: "Brésil",      flag: "🇧🇷", region: "americas",     unsplashQuery: "sao paulo brazil aerial",      cashEstimateUsd: 950,  milesEstimate: 60000 },
  // ── Asie ──
  { iata: "NRT", city: "Tokyo",       country: "Japon",       flag: "🇯🇵", region: "asia",         unsplashQuery: "tokyo japan shibuya",          cashEstimateUsd: 1100, milesEstimate: 65000 },
  { iata: "BKK", city: "Bangkok",     country: "Thaïlande",   flag: "🇹🇭", region: "asia",         unsplashQuery: "bangkok thailand temple",      cashEstimateUsd: 850,  milesEstimate: 50000 },
  { iata: "SIN", city: "Singapour",   country: "Singapour",   flag: "🇸🇬", region: "asia",         unsplashQuery: "singapore marina bay sands",  cashEstimateUsd: 900,  milesEstimate: 55000 },
  // ── Moyen-Orient ──
  { iata: "DXB", city: "Dubaï",       country: "EAU",         flag: "🇦🇪", region: "middle-east",  unsplashQuery: "dubai burj khalifa skyline",   cashEstimateUsd: 490,  milesEstimate: 28000 },
  { iata: "DOH", city: "Doha",        country: "Qatar",       flag: "🇶🇦", region: "middle-east",  unsplashQuery: "doha qatar cityscape",         cashEstimateUsd: 460,  milesEstimate: 26000 },
  // ── Afrique ──
  { iata: "CMN", city: "Casablanca",  country: "Maroc",       flag: "🇲🇦", region: "africa",       unsplashQuery: "casablanca morocco architecture", cashEstimateUsd: 320, milesEstimate: 18000 },
  { iata: "CAI", city: "Le Caire",    country: "Égypte",      flag: "🇪🇬", region: "africa",       unsplashQuery: "cairo egypt pyramids",         cashEstimateUsd: 380,  milesEstimate: 20000 },
  { iata: "LOS", city: "Lagos",       country: "Nigeria",     flag: "🇳🇬", region: "africa",       unsplashQuery: "lagos nigeria city",           cashEstimateUsd: 450,  milesEstimate: 25000 },
  { iata: "NBO", city: "Nairobi",     country: "Kenya",       flag: "🇰🇪", region: "africa",       unsplashQuery: "nairobi kenya savanna",        cashEstimateUsd: 520,  milesEstimate: 28000 },
  { iata: "ABJ", city: "Abidjan",     country: "Côte d'Ivoire", flag: "🇨🇮", region: "africa",    unsplashQuery: "abidjan ivory coast city",     cashEstimateUsd: 480,  milesEstimate: 26000 },
  // ── Océanie ──
  { iata: "SYD", city: "Sydney",      country: "Australie",   flag: "🇦🇺", region: "oceania",      unsplashQuery: "sydney opera house harbour",   cashEstimateUsd: 1400, milesEstimate: 85000 },
];
```

- [ ] **Commit**

```bash
git add data/destinations.ts
git commit -m "feat: add destinations static data (20 cities)"
```

---

## Task 2 — lib/dealsEngine.ts (logique pure + tests)

**Files:**
- Create: `lib/dealsEngine.ts`
- Create: `__tests__/lib/dealsEngine.test.ts`

- [ ] **Écrire le test en premier**

```typescript
// __tests__/lib/dealsEngine.test.ts
import {
  computeDealRatio,
  classifyDeal,
  sortDeals,
  type RawDeal,
} from "@/lib/dealsEngine";

describe("computeDealRatio", () => {
  it("returns cents-per-mile ratio", () => {
    // $680 cash, 35000 miles → 680*100/35000 = 1.94 cpp
    expect(computeDealRatio(680, 35000)).toBeCloseTo(1.94, 1);
  });

  it("returns 0 when milesRequired is 0", () => {
    expect(computeDealRatio(500, 0)).toBe(0);
  });
});

describe("classifyDeal", () => {
  it("returns USE_MILES when ratio > 1.5 cpp", () => {
    expect(classifyDeal(1.94)).toBe("USE_MILES");
  });

  it("returns USE_CASH when ratio < 1.0 cpp", () => {
    expect(classifyDeal(0.8)).toBe("USE_CASH");
  });

  it("returns NEUTRAL when ratio between 1.0 and 1.5", () => {
    expect(classifyDeal(1.2)).toBe("NEUTRAL");
  });
});

describe("sortDeals", () => {
  it("sorts USE_MILES deals first, then by ratio desc", () => {
    const deals: RawDeal[] = [
      { from: "CDG", to: "NRT", cashPrice: 610, milesRequired: 55000, program: "Miles&Smiles", fromFlag: "🇫🇷", toFlag: "🇯🇵" },
      { from: "DSS", to: "CDG", cashPrice: 680, milesRequired: 35000, program: "Flying Blue",  fromFlag: "🇸🇳", toFlag: "🇫🇷" },
      { from: "JFK", to: "LHR", cashPrice: 520, milesRequired: 26000, program: "Aeroplan",     fromFlag: "🇺🇸", toFlag: "🇬🇧" },
    ];
    const sorted = sortDeals(deals);
    // DSS→CDG: 1.94 cpp (USE_MILES), JFK→LHR: 2.0 cpp (USE_MILES), CDG→NRT: 1.11 cpp (NEUTRAL)
    expect(sorted[0].from).toBe("JFK"); // highest ratio USE_MILES first
    expect(sorted[1].from).toBe("DSS");
    expect(sorted[2].from).toBe("CDG"); // NEUTRAL last
  });
});
```

- [ ] **Vérifier que les tests échouent**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx jest __tests__/lib/dealsEngine.test.ts --no-coverage 2>&1 | tail -10
```
Attendu : `Cannot find module '@/lib/dealsEngine'`

- [ ] **Créer `lib/dealsEngine.ts`**

```typescript
// lib/dealsEngine.ts
// Pure functions — no Redis, no API calls. Testable in isolation.

export type DealRecommendation = "USE_MILES" | "USE_CASH" | "NEUTRAL";

export interface RawDeal {
  from: string;         // IATA code
  to: string;
  cashPrice: number;    // USD
  milesRequired: number;
  program: string;      // "Flying Blue"
  fromFlag: string;     // "🇸🇳"
  toFlag: string;
}

export interface LiveDeal extends RawDeal {
  ratio: number;                    // cents per mile
  recommendation: DealRecommendation;
  multiplier: string;               // "×1.9" — display only
}

// Thresholds (cents per mile)
const MILES_WIN_THRESHOLD  = 1.5;
const CASH_WIN_THRESHOLD   = 1.0;

/**
 * Returns how many cents of value each mile delivers.
 * ratio = (cashPrice * 100) / milesRequired
 */
export function computeDealRatio(cashPrice: number, milesRequired: number): number {
  if (milesRequired <= 0) return 0;
  return Math.round((cashPrice * 100 / milesRequired) * 100) / 100;
}

export function classifyDeal(ratioCpp: number): DealRecommendation {
  if (ratioCpp >= MILES_WIN_THRESHOLD) return "USE_MILES";
  if (ratioCpp < CASH_WIN_THRESHOLD)   return "USE_CASH";
  return "NEUTRAL";
}

export function enrichDeal(raw: RawDeal): LiveDeal {
  const ratio          = computeDealRatio(raw.cashPrice, raw.milesRequired);
  const recommendation = classifyDeal(ratio);
  const multiplier     = `×${(ratio / 1.0).toFixed(1)}`;
  return { ...raw, ratio, recommendation, multiplier };
}

/** Sort: USE_MILES first, then by ratio descending */
export function sortDeals(deals: RawDeal[]): LiveDeal[] {
  return deals
    .map(enrichDeal)
    .sort((a, b) => {
      const rankA = a.recommendation === "USE_MILES" ? 0 : a.recommendation === "NEUTRAL" ? 1 : 2;
      const rankB = b.recommendation === "USE_MILES" ? 0 : b.recommendation === "NEUTRAL" ? 1 : 2;
      if (rankA !== rankB) return rankA - rankB;
      return b.ratio - a.ratio;
    });
}
```

- [ ] **Vérifier que les tests passent**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx jest __tests__/lib/dealsEngine.test.ts --no-coverage 2>&1 | tail -10
```
Attendu : `3 passed`

- [ ] **Commit**

```bash
git add lib/dealsEngine.ts __tests__/lib/dealsEngine.test.ts
git commit -m "feat: add dealsEngine pure functions + tests"
```

---

## Task 3 — API routes : /api/deals, /api/unsplash, /api/cron/deals

**Files:**
- Create: `app/api/deals/route.ts`
- Create: `app/api/unsplash/route.ts`
- Create: `app/api/cron/deals/route.ts`
- Modify: `vercel.json`

- [ ] **Créer `app/api/deals/route.ts`**

```typescript
// app/api/deals/route.ts
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import type { LiveDeal } from "@/lib/dealsEngine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const DEALS_KEY = "keza:deals:live";

// Fallback statique si le cron n'a pas encore tourné
const FALLBACK_DEALS: LiveDeal[] = [
  { from: "DSS", to: "CDG", fromFlag: "🇸🇳", toFlag: "🇫🇷", cashPrice: 680, milesRequired: 35000, program: "Flying Blue",  ratio: 1.94, recommendation: "USE_MILES", multiplier: "×1.9" },
  { from: "JFK", to: "LHR", fromFlag: "🇺🇸", toFlag: "🇬🇧", cashPrice: 520, milesRequired: 26000, program: "Aeroplan",     ratio: 2.00, recommendation: "USE_MILES", multiplier: "×2.0" },
  { from: "LOS", to: "LHR", fromFlag: "🇳🇬", toFlag: "🇬🇧", cashPrice: 490, milesRequired: 32000, program: "LifeMiles",    ratio: 1.53, recommendation: "USE_MILES", multiplier: "×1.5" },
  { from: "CMN", to: "CDG", fromFlag: "🇲🇦", toFlag: "🇫🇷", cashPrice: 320, milesRequired: 18000, program: "Flying Blue",  ratio: 1.78, recommendation: "USE_MILES", multiplier: "×1.8" },
  { from: "CDG", to: "NRT", fromFlag: "🇫🇷", toFlag: "🇯🇵", cashPrice: 610, milesRequired: 55000, program: "Miles&Smiles", ratio: 1.11, recommendation: "NEUTRAL",   multiplier: "×1.1" },
];

export async function GET() {
  try {
    const cached = await redis.get<LiveDeal[]>(DEALS_KEY);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return NextResponse.json({ deals: cached, source: "live" });
    }
  } catch {
    // Redis unavailable — use fallback silently
  }
  return NextResponse.json({ deals: FALLBACK_DEALS, source: "fallback" });
}
```

- [ ] **Créer `app/api/unsplash/route.ts`**

```typescript
// app/api/unsplash/route.ts
// Server-side proxy — keeps UNSPLASH_ACCESS_KEY out of the client bundle.
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

const CACHE_TTL = 60 * 60 * 24 * 30; // 30 jours

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();

  if (!query) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  const key = `keza:unsplash:${query.toLowerCase().replace(/\s+/g, "-")}`;

  // 1. Check Redis cache
  try {
    const cached = await redis.get<{ url: string; credit: string }>(key);
    if (cached) return NextResponse.json(cached);
  } catch { /* cache miss */ }

  // 2. Fetch from Unsplash
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json({ error: "Unsplash not configured" }, { status: 503 });
  }

  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&content_filter=high`,
      { headers: { Authorization: `Client-ID ${accessKey}` } }
    );

    if (!res.ok) throw new Error(`Unsplash ${res.status}`);

    const data = await res.json();
    const result = {
      url: data.urls?.regular as string,
      credit: `Photo by ${data.user?.name} on Unsplash`,
    };

    // 3. Cache in Redis
    try {
      await redis.set(key, result, { ex: CACHE_TTL });
    } catch { /* non-fatal */ }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/unsplash] error:", err);
    return NextResponse.json({ url: null, credit: "" });
  }
}
```

- [ ] **Créer `app/api/cron/deals/route.ts`**

```typescript
// app/api/cron/deals/route.ts
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { redis } from "@/lib/redis";
import { sortDeals, type RawDeal } from "@/lib/dealsEngine";
import { DEALS_KEY } from "@/app/api/deals/route";

const DEALS_TTL = 7 * 60 * 60; // 7h (cron tourne toutes les 6h, safety window)

function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a.padEnd(256));
  const bBuf = Buffer.from(b.padEnd(256));
  return timingSafeEqual(aBuf, bBuf) && a.length === b.length;
}

// Routes populaires mondiales avec miles estimés (economy, aller simple)
const ROUTES_TO_CHECK: RawDeal[] = [
  { from: "DSS", to: "CDG", fromFlag: "🇸🇳", toFlag: "🇫🇷", cashPrice: 0, milesRequired: 35000, program: "Flying Blue" },
  { from: "DSS", to: "LHR", fromFlag: "🇸🇳", toFlag: "🇬🇧", cashPrice: 0, milesRequired: 30000, program: "Flying Blue" },
  { from: "JFK", to: "LHR", fromFlag: "🇺🇸", toFlag: "🇬🇧", cashPrice: 0, milesRequired: 26000, program: "Aeroplan" },
  { from: "JFK", to: "CDG", fromFlag: "🇺🇸", toFlag: "🇫🇷", cashPrice: 0, milesRequired: 30000, program: "Flying Blue" },
  { from: "LOS", to: "LHR", fromFlag: "🇳🇬", toFlag: "🇬🇧", cashPrice: 0, milesRequired: 32000, program: "LifeMiles" },
  { from: "CMN", to: "CDG", fromFlag: "🇲🇦", toFlag: "🇫🇷", cashPrice: 0, milesRequired: 18000, program: "Flying Blue" },
  { from: "CDG", to: "NRT", fromFlag: "🇫🇷", toFlag: "🇯🇵", cashPrice: 0, milesRequired: 55000, program: "Turkish Miles&Smiles" },
  { from: "DXB", to: "JFK", fromFlag: "🇦🇪", toFlag: "🇺🇸", cashPrice: 0, milesRequired: 40000, program: "Emirates Skywards" },
  { from: "CDG", to: "DXB", fromFlag: "🇫🇷", toFlag: "🇦🇪", cashPrice: 0, milesRequired: 22000, program: "Flying Blue" },
  { from: "SIN", to: "LHR", fromFlag: "🇸🇬", toFlag: "🇬🇧", cashPrice: 0, milesRequired: 48000, program: "KrisFlyer" },
];

async function fetchBestPrice(from: string, to: string, token: string): Promise<number | null> {
  try {
    // Date flexible : 4 semaines à partir d'aujourd'hui
    const depart = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000)
      .toISOString().split("T")[0];

    const url = `https://api.travelpayouts.com/v2/prices/month-matrix?currency=usd&origin=${from}&destination=${to}&show_to_affiliates=true&month=${depart.slice(0,7)}&token=${token}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    const data = await res.json() as { data?: { price: number }[] };
    if (!data.data?.length) return null;
    return Math.min(...data.data.map((d) => d.price));
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth   = request.headers.get("authorization");
  if (!secret || !auth || !safeCompare(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "TRAVELPAYOUTS_TOKEN not set" }, { status: 500 });
  }

  const enriched: RawDeal[] = [];

  for (const route of ROUTES_TO_CHECK) {
    const price = await fetchBestPrice(route.from, route.to, token);
    if (price && price > 50) {
      enriched.push({ ...route, cashPrice: price });
    }
  }

  if (enriched.length === 0) {
    return NextResponse.json({ ok: false, reason: "no prices fetched" });
  }

  const deals = sortDeals(enriched).slice(0, 8);
  await redis.set(DEALS_KEY, deals, { ex: DEALS_TTL });

  return NextResponse.json({ ok: true, count: deals.length });
}
```

- [ ] **Ajouter le cron deals dans `vercel.json`**

Ouvrir `vercel.json` et ajouter l'entrée dans le tableau `crons` :

```json
{
  "crons": [
    {
      "path": "/api/cron/miles-prices",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/alerts",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/deals",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

- [ ] **Commit**

```bash
git add app/api/deals/route.ts app/api/unsplash/route.ts app/api/cron/deals/route.ts vercel.json
git commit -m "feat: add /api/deals, /api/unsplash proxy, /api/cron/deals"
```

---

## Task 4 — Composant DealsStrip

**Files:**
- Create: `components/DealsStrip.tsx`
- Modify: `lib/analytics.ts`

- [ ] **Ajouter `trackDealClick` dans `lib/analytics.ts`**

Ajouter à la fin du fichier existant :

```typescript
export function trackDealClick(params: { from: string; to: string; program: string }) {
  track("Deal Click", { from: params.from, to: params.to, route: `${params.from}-${params.to}`, program: params.program });
}

export function trackDestinationClick(params: { city: string; iata: string }) {
  track("Destination Click", { city: params.city, iata: params.iata });
}
```

- [ ] **Créer `components/DealsStrip.tsx`**

```typescript
"use client";

import { useEffect, useState } from "react";
import { trackDealClick } from "@/lib/analytics";
import type { LiveDeal } from "@/lib/dealsEngine";

interface Props {
  lang: "fr" | "en";
  onDealClick?: (from: string, to: string) => void;
}

const L = {
  fr: { title: "Deals du moment", updated: "mis à jour il y a", hours: "h", all: "Voir tous →", milesWin: "Miles gagnent", cashWin: "Cash gagne" },
  en: { title: "Live deals",       updated: "updated",           hours: "h ago", all: "See all →", milesWin: "Miles win",   cashWin: "Cash wins"  },
};

export function DealsStrip({ lang, onDealClick }: Props) {
  const t = L[lang];
  const [deals, setDeals] = useState<LiveDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoursAgo, setHoursAgo] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/deals")
      .then((r) => r.json())
      .then((data: { deals: LiveDeal[] }) => {
        setDeals(data.deals ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (!loading && deals.length === 0) return null;

  return (
    <div className="py-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-bold text-muted uppercase tracking-wider">
            {t.title}
          </span>
        </div>
        <span className="text-xs text-subtle">{t.all}</span>
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="flex gap-3 overflow-x-hidden">
          {[1,2,3].map((i) => (
            <div key={i} className="flex-shrink-0 w-52 h-20 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Deals scroll */}
      {!loading && (
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          {deals.map((deal) => {
            const isMilesWin = deal.recommendation === "USE_MILES";
            return (
              <button
                key={`${deal.from}-${deal.to}`}
                onClick={() => {
                  trackDealClick({ from: deal.from, to: deal.to, program: deal.program });
                  onDealClick?.(deal.from, deal.to);
                }}
                className="flex-shrink-0 flex items-center gap-3 bg-surface hover:bg-surface-2 border border-border hover:border-primary/40 rounded-xl px-3 py-2.5 min-w-[210px] transition-all duration-150 text-left group"
              >
                {/* Flags */}
                <span className="text-xl flex-shrink-0">{deal.fromFlag}{deal.toFlag}</span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-fg truncate">
                    {deal.from} → {deal.to}
                  </div>
                  <div className="text-xs text-subtle truncate">{deal.program}</div>
                </div>

                {/* Badge */}
                <div className="flex-shrink-0 text-right">
                  <div className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                    isMilesWin
                      ? "bg-primary/15 text-blue-400 border border-primary/25"
                      : "bg-warning/10 text-warning border border-warning/25"
                  }`}>
                    {isMilesWin ? `✈ ${deal.multiplier}` : "💰"}
                  </div>
                  <div className="text-[11px] font-bold text-fg mt-0.5">
                    ${Math.round(deal.cashPrice)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add components/DealsStrip.tsx lib/analytics.ts
git commit -m "feat: add DealsStrip component + analytics events"
```

---

## Task 5 — Composant DestinationsGrid

**Files:**
- Create: `components/DestinationsGrid.tsx`

- [ ] **Créer `components/DestinationsGrid.tsx`**

```typescript
"use client";

import { useEffect, useState, useMemo } from "react";
import { DESTINATIONS, type Destination, type Region } from "@/data/destinations";
import { trackDestinationClick } from "@/lib/analytics";

interface Props {
  lang: "fr" | "en";
  onSelect: (iata: string, city: string) => void;
  fromIata?: string; // ville de départ sélectionnée (pour pré-remplir)
}

type Filter = "all" | Region;

const FILTERS: { key: Filter; labelFr: string; labelEn: string }[] = [
  { key: "all",          labelFr: "Toutes",       labelEn: "All" },
  { key: "africa",       labelFr: "🌍 Afrique",   labelEn: "🌍 Africa" },
  { key: "europe",       labelFr: "🇪🇺 Europe",   labelEn: "🇪🇺 Europe" },
  { key: "americas",     labelFr: "🌎 Amériques", labelEn: "🌎 Americas" },
  { key: "asia",         labelFr: "🌏 Asie",      labelEn: "🌏 Asia" },
  { key: "middle-east",  labelFr: "🕌 M-Orient",  labelEn: "🕌 Mid-East" },
];

const L = {
  fr: { title: "Destinations à explorer", seeAll: "Voir tout →", from: "dès", pts: "pts" },
  en: { title: "Destinations to explore", seeAll: "See all →",   from: "from", pts: "pts" },
};

function DestinationCard({
  dest,
  lang,
  onSelect,
}: {
  dest: Destination;
  lang: "fr" | "en";
  onSelect: (iata: string, city: string) => void;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const t = L[lang];

  useEffect(() => {
    fetch(`/api/unsplash?query=${encodeURIComponent(dest.unsplashQuery)}`)
      .then((r) => r.json())
      .then((data: { url?: string }) => {
        if (data.url) setPhotoUrl(data.url);
      })
      .catch(() => {});
  }, [dest.unsplashQuery]);

  const bg = photoUrl
    ? `url(${photoUrl})`
    : `linear-gradient(135deg, rgb(var(--primary)/0.3), rgb(var(--surface-2)))`;

  return (
    <button
      onClick={() => {
        trackDestinationClick({ city: dest.city, iata: dest.iata });
        onSelect(dest.iata, dest.city);
      }}
      className="relative rounded-2xl overflow-hidden aspect-[4/3] group cursor-pointer w-full text-left"
      style={{ backgroundImage: bg, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-black/90 transition-all duration-200" />
      {/* Scale on hover */}
      {photoUrl && (
        <div
          className="absolute inset-0 transition-transform duration-300 group-hover:scale-105"
          style={{ backgroundImage: `url(${photoUrl})`, backgroundSize: "cover", backgroundPosition: "center", zIndex: -1 }}
        />
      )}
      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="text-sm font-black text-white mb-1.5">
          {dest.flag} {dest.city}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold bg-white/20 backdrop-blur-sm text-white rounded-md px-2 py-0.5">
            {t.from} ${dest.cashEstimateUsd}
          </span>
          <span className="text-[11px] font-bold bg-primary/80 text-white rounded-md px-2 py-0.5">
            {(dest.milesEstimate / 1000).toFixed(0)}k {t.pts}
          </span>
        </div>
      </div>
    </button>
  );
}

export function DestinationsGrid({ lang, onSelect, fromIata }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const t = L[lang];

  const filtered = useMemo(
    () => filter === "all" ? DESTINATIONS : DESTINATIONS.filter((d) => d.region === filter),
    [filter]
  );

  // Afficher 6 par défaut (grille 2×3)
  const visible = filtered.slice(0, 6);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-black text-fg">{t.title}</h2>
        <span className="text-xs text-primary font-semibold cursor-pointer">{t.seeAll}</span>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none -mx-4 px-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
              filter === f.key
                ? "bg-primary/15 border-primary/35 text-blue-400"
                : "bg-transparent border-border text-muted hover:text-fg hover:border-border/60"
            }`}
          >
            {lang === "fr" ? f.labelFr : f.labelEn}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3">
        {visible.map((dest) => (
          <DestinationCard key={dest.iata} dest={dest} lang={lang} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add components/DestinationsGrid.tsx data/destinations.ts
git commit -m "feat: add DestinationsGrid component with Unsplash photos"
```

---

## Task 6 — Calculateur de valeur miles

**Files:**
- Create: `components/MilesCalculatorWidget.tsx`
- Create: `app/calculateur/page.tsx`

- [ ] **Créer `components/MilesCalculatorWidget.tsx`**

```typescript
"use client";

import { useState, useMemo } from "react";
import { MILES_PRICES } from "@/data/milesPrices";

interface Props {
  lang: "fr" | "en";
}

const L = {
  fr: { label: "J'ai", miles: "miles", worth: "≈", program: "programme", detail: "Voir le détail →" },
  en: { label: "I have", miles: "miles", worth: "≈", program: "program", detail: "See details →" },
};

export function MilesCalculatorWidget({ lang }: Props) {
  const t = L[lang];
  const [miles, setMiles]     = useState(50000);
  const [programIdx, setProgramIdx] = useState(0);

  const program = MILES_PRICES[programIdx];
  const valueUsd = useMemo(
    () => Math.round(miles * (program?.valueCents ?? 1.4) / 100),
    [miles, program]
  );

  return (
    <div className="bg-surface border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🧮</span>
        <span className="text-xs font-bold text-muted uppercase tracking-wider">
          {lang === "fr" ? "Valeur de tes miles" : "Your miles value"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">{t.label}</span>

        <input
          type="number"
          min={1000}
          max={1000000}
          step={1000}
          value={miles}
          onChange={(e) => setMiles(Math.max(0, parseInt(e.target.value, 10) || 0))}
          className="w-24 bg-bg border border-border rounded-lg px-2 py-1 text-fg text-sm font-bold text-center focus:outline-none focus:border-primary/50"
        />

        <select
          value={programIdx}
          onChange={(e) => setProgramIdx(parseInt(e.target.value, 10))}
          className="bg-bg border border-border rounded-lg px-2 py-1 text-sm text-fg focus:outline-none focus:border-primary/50"
        >
          {MILES_PRICES.map((p, i) => (
            <option key={p.program} value={i}>{p.program}</option>
          ))}
        </select>

        <span className="text-muted">{t.worth}</span>
        <span className="text-xl font-black text-primary">${valueUsd}</span>
      </div>

      <a
        href="/calculateur"
        className="mt-3 block text-xs text-primary/70 hover:text-primary transition-colors"
      >
        {t.detail}
      </a>
    </div>
  );
}
```

- [ ] **Créer `app/calculateur/page.tsx`**

```typescript
import type { Metadata } from "next";
import { MILES_PRICES } from "@/data/milesPrices";

export const metadata: Metadata = {
  title: "Calculateur de valeur miles — KEZA",
  description: "Combien valent vos miles Flying Blue, Aeroplan, LifeMiles en euros ? Calculateur instantané par programme de fidélité.",
};

export default function CalculateurPage() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <a href="/" className="text-xs text-muted hover:text-fg transition-colors">← Retour</a>
          <h1 className="text-3xl font-black mt-4 mb-2">
            <span className="text-primary">Calculateur</span> de valeur miles
          </h1>
          <p className="text-muted text-sm">
            Découvrez combien valent vos miles selon le programme et le type de rédemption.
          </p>
        </div>

        {/* Interactive calculator — client component */}
        <CalculateurClient programs={MILES_PRICES} />

        {/* Static comparison table */}
        <div className="mt-10 bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-bold text-fg">
              Valeur de référence par programme
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Valeurs de marché — sources : ThePointsGuy, NerdWallet, AwardWallet
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-2.5 text-xs font-bold text-muted uppercase tracking-wider">Programme</th>
                <th className="text-right px-5 py-2.5 text-xs font-bold text-muted uppercase tracking-wider">Valeur / mile</th>
                <th className="text-right px-5 py-2.5 text-xs font-bold text-muted uppercase tracking-wider">Confiance</th>
              </tr>
            </thead>
            <tbody>
              {MILES_PRICES.map((p) => (
                <tr key={p.program} className="border-b border-border/50 hover:bg-surface-2 transition-colors">
                  <td className="px-5 py-3 font-medium text-fg">{p.program}</td>
                  <td className="px-5 py-3 text-right font-bold text-primary">{p.valueCents.toFixed(1)}¢</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      p.confidence === "HIGH"   ? "bg-success/10 text-success" :
                      p.confidence === "MEDIUM" ? "bg-warning/10 text-warning" :
                                                  "bg-surface-2 text-muted"
                    }`}>
                      {p.confidence}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Client component inline (interactivité) ───────────────────────────────
"use client";

import { useState, useMemo } from "react";
import type { MilesPriceRecord } from "@/data/milesPrices";

function CalculateurClient({ programs }: { programs: MilesPriceRecord[] }) {
  const [miles, setMiles]   = useState(50000);
  const [idx, setIdx]       = useState(0);
  const program             = programs[idx];
  const valueUsd            = useMemo(() => Math.round(miles * program.valueCents / 100), [miles, program]);
  const valueEur            = useMemo(() => Math.round(valueUsd * 0.92), [valueUsd]);

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
      {/* Miles input */}
      <div>
        <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">
          Nombre de miles
        </label>
        <input
          type="range"
          min={1000}
          max={500000}
          step={1000}
          value={miles}
          onChange={(e) => setMiles(parseInt(e.target.value, 10))}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-subtle">1 000</span>
          <span className="text-sm font-black text-fg">{miles.toLocaleString()} miles</span>
          <span className="text-xs text-subtle">500 000</span>
        </div>
      </div>

      {/* Program select */}
      <div>
        <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">
          Programme
        </label>
        <select
          value={idx}
          onChange={(e) => setIdx(parseInt(e.target.value, 10))}
          className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-fg text-sm focus:outline-none focus:border-primary/50"
        >
          {programs.map((p, i) => (
            <option key={p.program} value={i}>{p.program}</option>
          ))}
        </select>
      </div>

      {/* Result */}
      <div className="bg-primary/8 border border-primary/20 rounded-xl p-5 text-center">
        <p className="text-xs text-muted mb-1">
          {miles.toLocaleString()} {program.program} miles valent environ
        </p>
        <p className="text-4xl font-black text-primary">${valueUsd}</p>
        <p className="text-sm text-muted mt-1">≈ {valueEur} €</p>
        <p className="text-xs text-subtle mt-3">
          Basé sur {program.valueCents.toFixed(1)}¢ / mile · Confiance : {program.confidence}
        </p>
      </div>
    </div>
  );
}
```

> ⚠️ Note : le `"use client"` ne peut pas être dans le même fichier qu'un Server Component avec `export const metadata`. Séparer `CalculateurClient` dans `app/calculateur/CalculateurClient.tsx` et l'importer dans `page.tsx`.

- [ ] **Corriger la structure : extraire `CalculateurClient` dans son propre fichier**

Créer `app/calculateur/CalculateurClient.tsx` :

```typescript
"use client";

import { useState, useMemo } from "react";
import type { MilesPriceRecord } from "@/data/milesPrices";

export function CalculateurClient({ programs }: { programs: MilesPriceRecord[] }) {
  const [miles, setMiles] = useState(50000);
  const [idx, setIdx]     = useState(0);
  const program           = programs[idx];
  const valueUsd          = useMemo(() => Math.round(miles * program.valueCents / 100), [miles, program]);
  const valueEur          = useMemo(() => Math.round(valueUsd * 0.92), [valueUsd]);

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
      <div>
        <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">
          Nombre de miles
        </label>
        <input
          type="range" min={1000} max={500000} step={1000}
          value={miles}
          onChange={(e) => setMiles(parseInt(e.target.value, 10))}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-subtle">1 000</span>
          <span className="text-sm font-black text-fg">{miles.toLocaleString()} miles</span>
          <span className="text-xs text-subtle">500 000</span>
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Programme</label>
        <select
          value={idx}
          onChange={(e) => setIdx(parseInt(e.target.value, 10))}
          className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-fg text-sm focus:outline-none focus:border-primary/50"
        >
          {programs.map((p, i) => (
            <option key={p.program} value={i}>{p.program}</option>
          ))}
        </select>
      </div>
      <div className="bg-primary/8 border border-primary/20 rounded-xl p-5 text-center">
        <p className="text-xs text-muted mb-1">{miles.toLocaleString()} {program.program} miles valent environ</p>
        <p className="text-4xl font-black text-primary">${valueUsd}</p>
        <p className="text-sm text-muted mt-1">≈ {valueEur} €</p>
        <p className="text-xs text-subtle mt-3">Basé sur {program.valueCents.toFixed(1)}¢ / mile · Confiance : {program.confidence}</p>
      </div>
    </div>
  );
}
```

Puis dans `app/calculateur/page.tsx`, remplacer le composant inline par l'import :

```typescript
import { CalculateurClient } from "./CalculateurClient";
// et retirer le bloc "use client" + CalculateurClient du bas du fichier
```

- [ ] **Commit**

```bash
git add components/MilesCalculatorWidget.tsx app/calculateur/page.tsx app/calculateur/CalculateurClient.tsx
git commit -m "feat: add MilesCalculatorWidget + /calculateur page"
```

---

## Task 7 — Intégration homepage

**Files:**
- Modify: `app/page.tsx`

- [ ] **Modifier `app/page.tsx` : ajouter les 3 imports**

En haut du fichier, ajouter :

```typescript
import { DealsStrip }              from "@/components/DealsStrip";
import { DestinationsGrid }        from "@/components/DestinationsGrid";
import { MilesCalculatorWidget }   from "@/components/MilesCalculatorWidget";
```

- [ ] **Ajouter DealsStrip juste après TrustBar (visible si `!hasSearched`)**

```typescript
{/* -- Deals du moment -- */}
{!hasSearched && (
  <DealsStrip
    lang={lang}
    onDealClick={(from, to) => {
      setPrefillFrom(from);
      setPrefillTo(to);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }}
  />
)}
```

Insérer ce bloc entre `<TrustBar lang={lang} />` et le bloc `<main ...>`.

- [ ] **Remplacer PopularRoutes par DestinationsGrid dans la section `!hasSearched`**

Trouver le bloc `<PopularRoutes ... />` dans la section `{!hasSearched && ...}` et le remplacer :

```typescript
{/* Destinations à explorer */}
<DestinationsGrid
  lang={lang}
  onSelect={(iata, city) => {
    trackDestinationClick({ city, iata });
    setPrefillTo(iata);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }}
/>
```

- [ ] **Ajouter MilesCalculatorWidget après DestinationsGrid**

```typescript
{/* Calculateur de valeur miles */}
<MilesCalculatorWidget lang={lang} />
```

- [ ] **Vérifier que le build passe**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx tsc --noEmit 2>&1 | head -20
```
Attendu : aucune erreur

- [ ] **Commit**

```bash
git add app/page.tsx
git commit -m "feat: integrate DealsStrip, DestinationsGrid, MilesCalculatorWidget into homepage"
```

---

## Task 8 — Header + Sitemap

**Files:**
- Modify: `components/Header.tsx`
- Modify: `app/sitemap.ts`

- [ ] **Corriger le lien Calculateur dans `components/Header.tsx`**

Remplacer dans le tableau NAV (fr ET en) :

```typescript
// Avant :
{ label: "Comment ça marche", href: "/#how" },
{ label: "Routes populaires", href: "/#routes" },
{ label: "Pour les entreprises", href: "/entreprises" },

// Après :
{ label: "Comment ça marche", href: "/#how" },
{ label: "Calculateur",        href: "/calculateur" },
{ label: "Pour les entreprises", href: "/entreprises" },
```

```typescript
// EN — Avant :
{ label: "How it works",   href: "/#how" },
{ label: "Popular routes", href: "/#routes" },
{ label: "For Business",   href: "/entreprises" },

// Après :
{ label: "How it works",  href: "/#how" },
{ label: "Calculator",     href: "/calculateur" },
{ label: "For Business",   href: "/entreprises" },
```

- [ ] **Ajouter `/calculateur` dans `app/sitemap.ts`**

Trouver le tableau de routes dans `app/sitemap.ts` et ajouter :

```typescript
{ url: `${base}/calculateur`, lastModified: new Date(), priority: 0.8 },
```

- [ ] **Commit**

```bash
git add components/Header.tsx app/sitemap.ts
git commit -m "fix: header calc link → /calculateur, add to sitemap"
```

---

## Task 9 — Build final + déploiement

- [ ] **TypeScript check**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx tsc --noEmit 2>&1
```
Attendu : aucune sortie (0 erreur)

- [ ] **Tests**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx jest --no-coverage 2>&1 | tail -15
```
Attendu : tous les tests passent (au minimum `dealsEngine.test.ts`)

- [ ] **Build Next.js local**

```bash
cd /Users/DIALLO9194/Downloads/keza && npm run build 2>&1 | tail -30
```
Attendu : `✓ Compiled successfully` + `/calculateur` dans la liste des routes

- [ ] **Commit final + push**

```bash
cd /Users/DIALLO9194/Downloads/keza && git push origin main
```

- [ ] **Déclencher manuellement le cron deals pour peupler Redis**

Une fois déployé, appeler :

```bash
curl -s -X GET "https://keza-taupe.vercel.app/api/cron/deals" \
  -H "Authorization: Bearer adcfb15ab7f0f98fb97163c1efa3d2b0979d6523072f42c14e92b457626e8d96" \
  | python3 -m json.tool
```
Attendu : `{"ok": true, "count": 8}`

---

## Self-Review

**Spec coverage :**
- ✅ Deals du moment → Tasks 2, 3, 4
- ✅ Destinations Unsplash → Tasks 1, 3, 5
- ✅ Calculateur → Task 6
- ✅ Layout homepage dans le bon ordre → Task 7
- ✅ Header #calc → /calculateur → Task 8
- ✅ Cron deals toutes les 6h → Tasks 3 + vercel.json
- ✅ Unsplash key protégée côté serveur → Task 3
- ✅ Fallbacks définis (deals statiques, photo null) → Tasks 3, 5

**Placeholders :** aucun TBD, toutes les étapes ont du code complet.

**Type consistency :**
- `LiveDeal` défini dans `lib/dealsEngine.ts`, utilisé dans `app/api/deals/route.ts` ✅
- `Destination` défini dans `data/destinations.ts`, utilisé dans `DestinationsGrid.tsx` ✅
- `MilesPriceRecord` défini dans `data/milesPrices.ts`, utilisé dans widget + page ✅
- `DEALS_KEY` exporté depuis `app/api/deals/route.ts`, importé dans `app/api/cron/deals/route.ts` ✅
