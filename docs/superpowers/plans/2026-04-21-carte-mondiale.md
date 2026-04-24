# Carte Mondiale Interactive — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive SVG world map at `/carte` showing 20 destinations color-coded by KEZA recommendation (miles/cash), with a click-to-reveal tooltip and region filters.

**Architecture:** `data/destinations.ts` enriched with GPS coordinates; recommendations computed server-side via `lib/dealsEngine.ts`; `app/carte/page.tsx` (Server Component SSG) passes enriched data to `app/carte/WorldMap.tsx` ("use client"); `react-simple-maps` renders the SVG; a small link added to `DestinationsGrid` on the homepage.

**Tech Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · react-simple-maps · lib/dealsEngine (existing)

---

## File Map

| Status | Path | Role |
|--------|------|------|
| MODIFY | `data/destinations.ts` | Add `lat` + `lon` to interface + all 20 entries |
| CREATE | `__tests__/data/destinations.test.ts` | GPS coordinate integrity tests |
| INSTALL | `react-simple-maps` | SVG world map library |
| CREATE | `app/carte/WorldMap.tsx` | "use client" — map + markers + tooltip + filters |
| CREATE | `app/carte/page.tsx` | Server Component SSG — metadata + stats computation |
| MODIFY | `components/Header.tsx` | Add "Carte" nav link |
| MODIFY | `components/DestinationsGrid.tsx` | Make "Voir tout →" link to /carte |
| MODIFY | `app/sitemap.ts` | Add /carte entry |

---

## Task 1: Add GPS coordinates to `data/destinations.ts` + tests

**Files:**
- Modify: `data/destinations.ts`
- Create: `__tests__/data/destinations.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/data/destinations.test.ts
import { DESTINATIONS } from "@/data/destinations";

describe("DESTINATIONS GPS data integrity", () => {
  it("contains exactly 20 destinations", () => {
    expect(DESTINATIONS).toHaveLength(20);
  });

  it("every destination has lat and lon", () => {
    DESTINATIONS.forEach((d) => {
      expect(typeof d.lat).toBe("number");
      expect(typeof d.lon).toBe("number");
    });
  });

  it("all lat values are valid (-90 to 90)", () => {
    DESTINATIONS.forEach((d) => {
      expect(d.lat).toBeGreaterThanOrEqual(-90);
      expect(d.lat).toBeLessThanOrEqual(90);
    });
  });

  it("all lon values are valid (-180 to 180)", () => {
    DESTINATIONS.forEach((d) => {
      expect(d.lon).toBeGreaterThanOrEqual(-180);
      expect(d.lon).toBeLessThanOrEqual(180);
    });
  });

  it("all IATA codes are unique", () => {
    const codes = DESTINATIONS.map((d) => d.iata);
    expect(new Set(codes).size).toBe(DESTINATIONS.length);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/data/destinations.test.ts --no-coverage 2>&1 | tail -10
```

Expected: `Cannot find module` or `TypeError: d.lat is not defined`

- [ ] **Step 3: Update `data/destinations.ts`**

Replace the entire file content with:

```typescript
// data/destinations.ts

export type Region = "africa" | "europe" | "americas" | "asia" | "middle-east" | "oceania";

export interface Destination {
  iata: string;
  city: string;
  country: string;
  flag: string;
  region: Region;
  unsplashQuery: string;
  cashEstimateUsd: number;
  milesEstimate: number;
  lat: number;   // WGS84 latitude (airport)
  lon: number;   // WGS84 longitude (airport)
}

export const DESTINATIONS: Destination[] = [
  // ── Europe ──
  { iata: "CDG", city: "Paris",       country: "France",         flag: "🇫🇷", region: "europe",      unsplashQuery: "paris eiffel tower",             cashEstimateUsd: 680,  milesEstimate: 35000, lat: 49.0097,  lon: 2.5479   },
  { iata: "LHR", city: "Londres",     country: "UK",             flag: "🇬🇧", region: "europe",      unsplashQuery: "london tower bridge",             cashEstimateUsd: 580,  milesEstimate: 30000, lat: 51.4775,  lon: -0.4614  },
  { iata: "MAD", city: "Madrid",      country: "Espagne",        flag: "🇪🇸", region: "europe",      unsplashQuery: "madrid spain city",               cashEstimateUsd: 520,  milesEstimate: 28000, lat: 40.4983,  lon: -3.5676  },
  { iata: "FCO", city: "Rome",        country: "Italie",         flag: "🇮🇹", region: "europe",      unsplashQuery: "rome colosseum italy",             cashEstimateUsd: 550,  milesEstimate: 30000, lat: 41.8003,  lon: 12.2389  },
  { iata: "IST", city: "Istanbul",    country: "Turquie",        flag: "🇹🇷", region: "europe",      unsplashQuery: "istanbul turkey bosphorus",       cashEstimateUsd: 420,  milesEstimate: 22000, lat: 40.9769,  lon: 28.8146  },
  // ── Amériques ──
  { iata: "JFK", city: "New York",    country: "USA",            flag: "🇺🇸", region: "americas",    unsplashQuery: "new york city skyline",           cashEstimateUsd: 820,  milesEstimate: 55000, lat: 40.6413,  lon: -73.7781 },
  { iata: "MIA", city: "Miami",       country: "USA",            flag: "🇺🇸", region: "americas",    unsplashQuery: "miami beach sunset",              cashEstimateUsd: 780,  milesEstimate: 50000, lat: 25.7959,  lon: -80.2870 },
  { iata: "YUL", city: "Montréal",    country: "Canada",         flag: "🇨🇦", region: "americas",    unsplashQuery: "montreal canada old city",        cashEstimateUsd: 760,  milesEstimate: 48000, lat: 45.4706,  lon: -73.7408 },
  { iata: "GRU", city: "São Paulo",   country: "Brésil",         flag: "🇧🇷", region: "americas",    unsplashQuery: "sao paulo brazil aerial",         cashEstimateUsd: 950,  milesEstimate: 60000, lat: -23.4356, lon: -46.4731 },
  // ── Asie ──
  { iata: "NRT", city: "Tokyo",       country: "Japon",          flag: "🇯🇵", region: "asia",        unsplashQuery: "tokyo japan shibuya",             cashEstimateUsd: 1100, milesEstimate: 65000, lat: 35.7720,  lon: 140.3929 },
  { iata: "BKK", city: "Bangkok",     country: "Thaïlande",      flag: "🇹🇭", region: "asia",        unsplashQuery: "bangkok thailand temple",         cashEstimateUsd: 850,  milesEstimate: 50000, lat: 13.6900,  lon: 100.7501 },
  { iata: "SIN", city: "Singapour",   country: "Singapour",      flag: "🇸🇬", region: "asia",        unsplashQuery: "singapore marina bay sands",      cashEstimateUsd: 900,  milesEstimate: 55000, lat: 1.3644,   lon: 103.9915 },
  // ── Moyen-Orient ──
  { iata: "DXB", city: "Dubaï",       country: "EAU",            flag: "🇦🇪", region: "middle-east", unsplashQuery: "dubai burj khalifa skyline",      cashEstimateUsd: 490,  milesEstimate: 28000, lat: 25.2532,  lon: 55.3657  },
  { iata: "DOH", city: "Doha",        country: "Qatar",          flag: "🇶🇦", region: "middle-east", unsplashQuery: "doha qatar cityscape",            cashEstimateUsd: 460,  milesEstimate: 26000, lat: 25.2731,  lon: 51.6081  },
  // ── Afrique ──
  { iata: "CMN", city: "Casablanca",  country: "Maroc",          flag: "🇲🇦", region: "africa",      unsplashQuery: "casablanca morocco architecture", cashEstimateUsd: 320,  milesEstimate: 18000, lat: 33.3675,  lon: -7.5898  },
  { iata: "CAI", city: "Le Caire",    country: "Égypte",         flag: "🇪🇬", region: "africa",      unsplashQuery: "cairo egypt pyramids",            cashEstimateUsd: 380,  milesEstimate: 20000, lat: 30.1219,  lon: 31.4056  },
  { iata: "LOS", city: "Lagos",       country: "Nigeria",        flag: "🇳🇬", region: "africa",      unsplashQuery: "lagos nigeria city",              cashEstimateUsd: 450,  milesEstimate: 25000, lat: 6.5774,   lon: 3.3212   },
  { iata: "NBO", city: "Nairobi",     country: "Kenya",          flag: "🇰🇪", region: "africa",      unsplashQuery: "nairobi kenya savanna",           cashEstimateUsd: 520,  milesEstimate: 28000, lat: -1.3192,  lon: 36.9275  },
  { iata: "ABJ", city: "Abidjan",     country: "Côte d'Ivoire",  flag: "🇨🇮", region: "africa",      unsplashQuery: "abidjan ivory coast city",        cashEstimateUsd: 480,  milesEstimate: 26000, lat: 5.2613,   lon: -3.9267  },
  // ── Océanie ──
  { iata: "SYD", city: "Sydney",      country: "Australie",      flag: "🇦🇺", region: "oceania",     unsplashQuery: "sydney opera house harbour",      cashEstimateUsd: 1400, milesEstimate: 85000, lat: -33.9461, lon: 151.1772 },
];
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/data/destinations.test.ts --no-coverage 2>&1 | tail -10
```

Expected: `Tests: 5 passed, 5 total`

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (no errors)

- [ ] **Step 6: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add data/destinations.ts __tests__/data/destinations.test.ts
git commit -m "feat: add GPS coordinates to destinations — lat/lon for world map"
```

---

## Task 2: Install `react-simple-maps`

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install the package**

```bash
cd /Users/DIALLO9194/Downloads/keza
npm install react-simple-maps 2>&1 | tail -5
```

Expected: `added N packages` with no errors.

- [ ] **Step 2: Verify TypeScript types are available**

```bash
cd /Users/DIALLO9194/Downloads/keza
node -e "require('react-simple-maps')" 2>&1
```

Expected: no output (module loads cleanly). `react-simple-maps` v3+ ships its own TypeScript types.

- [ ] **Step 3: Verify build still works**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx tsc --noEmit 2>&1 | head -10
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add package.json package-lock.json
git commit -m "chore: install react-simple-maps for world map feature"
```

---

## Task 3: Create `app/carte/WorldMap.tsx` — interactive SVG map

**Files:**
- Create: `app/carte/WorldMap.tsx`

This is the core interactive component. It receives pre-computed destination data from the server component and renders the SVG map with markers, tooltip, and region filters.

- [ ] **Step 1: Create `app/carte/WorldMap.tsx`**

```typescript
// app/carte/WorldMap.tsx
"use client";

import { useState, useCallback } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";
import type { Destination, Region } from "@/data/destinations";
import type { DealRecommendation } from "@/lib/dealsEngine";

export interface DestinationWithRec extends Destination {
  recommendation: DealRecommendation;
  cpm: number;
}

interface Props {
  destinations: DestinationWithRec[];
  lang: "fr" | "en";
}

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

type RegionFilter = "all" | Region;

const REGION_FILTERS: { key: RegionFilter; labelFr: string; labelEn: string }[] = [
  { key: "all",         labelFr: "Toutes",       labelEn: "All" },
  { key: "africa",      labelFr: "🌍 Afrique",   labelEn: "🌍 Africa" },
  { key: "europe",      labelFr: "🇪🇺 Europe",   labelEn: "🇪🇺 Europe" },
  { key: "americas",    labelFr: "🌎 Amériques", labelEn: "🌎 Americas" },
  { key: "asia",        labelFr: "🌏 Asie",      labelEn: "🌏 Asia" },
  { key: "middle-east", labelFr: "🕌 M-Orient",  labelEn: "🕌 Mid-East" },
  { key: "oceania",     labelFr: "🇦🇺 Océanie",  labelEn: "🇦🇺 Oceania" },
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

const L = {
  fr: {
    subtitle: "Clique sur une destination pour voir les prix",
    searchBtn: "Rechercher ce vol →",
    cash: "Cash",
    miles: "miles",
    cpm: "¢/mile",
    close: "✕",
  },
  en: {
    subtitle: "Click a destination to see prices",
    searchBtn: "Search this flight →",
    cash: "Cash",
    miles: "miles",
    cpm: "¢/mile",
    close: "✕",
  },
};

export function WorldMap({ destinations, lang }: Props) {
  const t = L[lang];
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("all");
  const [selected, setSelected] = useState<DestinationWithRec | null>(null);

  const handleMarkerClick = useCallback(
    (dest: DestinationWithRec) => {
      setSelected((prev) => (prev?.iata === dest.iata ? null : dest));
    },
    []
  );

  const handleMapClick = useCallback(() => {
    setSelected(null);
  }, []);

  const recLabels =
    lang === "fr" ? REC_LABELS_FR : REC_LABELS_EN;

  return (
    <div className="relative">
      {/* Region filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none -mx-4 px-4">
        {REGION_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setRegionFilter(f.key)}
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

      {/* Map container */}
      <div
        className="relative bg-surface border border-border rounded-2xl overflow-hidden"
        style={{ aspectRatio: "16/7" }}
        onClick={handleMapClick}
      >
        <ComposableMap
          projection="naturalEarth1"
          style={{ width: "100%", height: "100%" }}
          projectionConfig={{ scale: 140, center: [20, 10] }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#1e2d3d"
                  stroke="#0d1117"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fill: "#1e3a5f" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>

          {destinations.map((dest) => {
            const isFiltered =
              regionFilter !== "all" && dest.region !== regionFilter;
            const color = REC_COLORS[dest.recommendation];
            return (
              <Marker
                key={dest.iata}
                coordinates={[dest.lon, dest.lat]}
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkerClick(dest);
                }}
                style={{ cursor: "pointer" }}
              >
                {/* Pulse ring for selected marker */}
                {selected?.iata === dest.iata && (
                  <circle r={14} fill={color} opacity={0.2} />
                )}
                <circle
                  r={selected?.iata === dest.iata ? 8 : 6}
                  fill={color}
                  opacity={isFiltered ? 0.15 : 0.9}
                  stroke={selected?.iata === dest.iata ? "#fff" : "none"}
                  strokeWidth={1.5}
                  style={{ transition: "all 0.15s ease" }}
                />
              </Marker>
            );
          })}
        </ComposableMap>

        {/* Tooltip — desktop (absolute) */}
        {selected && (
          <div
            className="hidden sm:block absolute top-4 right-4 bg-surface border border-border rounded-2xl p-4 w-64 shadow-xl z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              className="absolute top-3 right-3 text-muted hover:text-fg text-xs"
            >
              {t.close}
            </button>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{selected.flag}</span>
              <div>
                <div className="font-black text-fg text-sm">{selected.city}</div>
                <div className="text-[11px] text-muted">{selected.country}</div>
              </div>
            </div>
            <div
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black mb-3"
              style={{
                backgroundColor: `${REC_COLORS[selected.recommendation]}22`,
                color: REC_COLORS[selected.recommendation],
                border: `1px solid ${REC_COLORS[selected.recommendation]}44`,
              }}
            >
              {recLabels[selected.recommendation]}
            </div>
            <div className="flex gap-3 mb-3 text-xs">
              <div>
                <div className="text-muted">{t.cash}</div>
                <div className="font-bold text-fg">${selected.cashEstimateUsd}</div>
              </div>
              <div>
                <div className="text-muted">{t.miles}</div>
                <div className="font-bold text-fg">
                  {(selected.milesEstimate / 1000).toFixed(0)}k
                </div>
              </div>
              <div>
                <div className="text-muted">CPM</div>
                <div className="font-bold text-fg">
                  {selected.cpm.toFixed(1)}{t.cpm}
                </div>
              </div>
            </div>
            <a
              href={`/?to=${selected.iata}`}
              className="block w-full text-center bg-primary text-white text-xs font-bold py-2 rounded-xl hover:bg-primary/90 transition-colors"
            >
              {t.searchBtn}
            </a>
          </div>
        )}
      </div>

      {/* Tooltip — mobile (fixed bottom) */}
      {selected && (
        <div
          className="sm:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border p-4 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{selected.flag}</span>
              <div>
                <div className="font-black text-fg text-sm">{selected.city}</div>
                <div className="text-[11px] text-muted">{selected.country}</div>
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-muted hover:text-fg text-sm px-2"
            >
              {t.close}
            </button>
          </div>
          <div className="flex gap-4 mb-3 text-xs">
            <div>
              <div className="text-muted">{t.cash}</div>
              <div className="font-bold text-fg">${selected.cashEstimateUsd}</div>
            </div>
            <div>
              <div className="text-muted">{t.miles}</div>
              <div className="font-bold text-fg">
                {(selected.milesEstimate / 1000).toFixed(0)}k
              </div>
            </div>
            <div>
              <div className="text-muted">CPM</div>
              <div className="font-bold text-fg">
                {selected.cpm.toFixed(1)}{t.cpm}
              </div>
            </div>
            <div
              className="ml-auto inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black"
              style={{
                backgroundColor: `${REC_COLORS[selected.recommendation]}22`,
                color: REC_COLORS[selected.recommendation],
              }}
            >
              {recLabels[selected.recommendation]}
            </div>
          </div>
          <a
            href={`/?to=${selected.iata}`}
            className="block w-full text-center bg-primary text-white text-xs font-bold py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
          >
            {t.searchBtn}
          </a>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        {(["USE_MILES", "NEUTRAL", "USE_CASH"] as DealRecommendation[]).map((rec) => (
          <div key={rec} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: REC_COLORS[rec] }}
            />
            <span className="text-[11px] text-muted">
              {lang === "fr" ? REC_LABELS_FR[rec] : REC_LABELS_EN[rec]}
            </span>
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

Expected: no output (no errors). If `react-simple-maps` types are missing, run `npm install --save-dev @types/react-simple-maps` first.

- [ ] **Step 3: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add app/carte/WorldMap.tsx
git commit -m "feat: add WorldMap component — SVG world map with markers, tooltip, region filters"
```

---

## Task 4: Create `app/carte/page.tsx` — SSG page

**Files:**
- Create: `app/carte/page.tsx`

The Server Component computes recommendations for all 20 destinations at build time and passes enriched data to `WorldMap`.

- [ ] **Step 1: Create `app/carte/page.tsx`**

```typescript
// app/carte/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { DESTINATIONS } from "@/data/destinations";
import { computeDealRatio, classifyDeal } from "@/lib/dealsEngine";
import { WorldMap, type DestinationWithRec } from "./WorldMap";

export const metadata: Metadata = {
  title: "Carte des destinations miles | KEZA",
  description:
    "Explorez 20 destinations en avion — carte interactive cash vs miles. Trouvez où vos points valent le plus.",
  openGraph: {
    title: "Carte des destinations miles | KEZA",
    description: "20 destinations sur une carte interactive. Points colorés par recommandation KEZA : miles gagnent, cash gagne.",
    url: "https://keza-taupe.vercel.app/carte",
  },
};

// Compute recommendations server-side at build time
const DESTINATIONS_WITH_REC: DestinationWithRec[] = DESTINATIONS.map((d) => {
  const cpm = computeDealRatio(d.cashEstimateUsd, d.milesEstimate);
  return { ...d, recommendation: classifyDeal(cpm), cpm };
});

// Stats for display
const MILES_COUNT = DESTINATIONS_WITH_REC.filter(
  (d) => d.recommendation === "USE_MILES"
).length;
const NEUTRAL_COUNT = DESTINATIONS_WITH_REC.filter(
  (d) => d.recommendation === "NEUTRAL"
).length;
const CASH_COUNT = DESTINATIONS_WITH_REC.filter(
  (d) => d.recommendation === "USE_CASH"
).length;

export default function CartePage() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Back link */}
        <Link href="/" className="text-xs text-muted hover:text-fg transition-colors">
          ← Retour
        </Link>

        {/* Hero */}
        <div className="mt-6 mb-6">
          <h1 className="text-3xl sm:text-4xl font-black leading-tight">
            <span className="bg-gradient-to-br from-blue-300 via-primary to-blue-500 bg-clip-text text-transparent">
              Explore
            </span>
            <span className="text-fg"> le monde en miles</span>
          </h1>
          <p className="text-sm text-muted mt-2">
            {DESTINATIONS.length} destinations · clique pour voir les prix cash &amp; miles
          </p>
        </div>

        {/* Map */}
        <WorldMap destinations={DESTINATIONS_WITH_REC} lang="fr" />

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-surface border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-primary">{MILES_COUNT}</div>
            <div className="text-[11px] text-muted mt-0.5">Miles gagnent</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-success">{NEUTRAL_COUNT}</div>
            <div className="text-[11px] text-muted mt-0.5">Si tu as les miles</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-warning">{CASH_COUNT}</div>
            <div className="text-[11px] text-muted mt-0.5">Cash gagne</div>
          </div>
        </div>

        {/* CTA back to search */}
        <div className="mt-6 text-center">
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
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add app/carte/page.tsx
git commit -m "feat: add /carte SSG page — world map with server-computed recommendations"
```

---

## Task 5: Wire up — Header, DestinationsGrid, Sitemap

**Files:**
- Modify: `components/Header.tsx`
- Modify: `components/DestinationsGrid.tsx`
- Modify: `app/sitemap.ts`

- [ ] **Step 1: Add "Carte" nav link to `components/Header.tsx`**

Read `components/Header.tsx`. Find the `NAV` constant and replace it with:

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

- [ ] **Step 2: Make "Voir tout →" in `DestinationsGrid` link to `/carte`**

Read `components/DestinationsGrid.tsx`. Find this line (around line 100):

```tsx
        <span className="text-xs text-primary font-semibold cursor-pointer">{t.seeAll}</span>
```

Replace it with:

```tsx
        <a href="/carte" className="text-xs text-primary font-semibold hover:text-primary/80 transition-colors">{t.seeAll}</a>
```

- [ ] **Step 3: Add `/carte` to `app/sitemap.ts`**

Read `app/sitemap.ts`. Find the `/programmes` entry and add `/carte` immediately after it:

```typescript
    {
      url: `${BASE_URL}/programmes`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/carte`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
```

- [ ] **Step 4: Verify TypeScript compiles and all tests pass**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx tsc --noEmit 2>&1 | head -10
npx jest --no-coverage 2>&1 | tail -10
```

Expected: no TypeScript errors, all tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza
git add components/Header.tsx components/DestinationsGrid.tsx app/sitemap.ts
git commit -m "feat: wire up /carte — nav link, DestinationsGrid seeAll, sitemap"
```

---

## Final Verification

```bash
cd /Users/DIALLO9194/Downloads/keza
npx next build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` with `/carte` listed as a static page (`○`).
