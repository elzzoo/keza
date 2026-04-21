# Carte Mondiale Interactive — Design Spec

**Date :** 2026-04-21
**Statut :** Approuvé

---

## Objectif

Créer une page `/carte` affichant les 20 destinations KEZA sur une carte SVG vectorielle mondiale. Chaque destination est représentée par un marker coloré selon la recommandation KEZA (miles / neutre / cash). Un clic ouvre un tooltip avec prix cash, miles estimés, badge recommandation, et un bouton "Rechercher ce vol →" qui renvoie vers la homepage pré-remplie.

## Architecture

Source de données : `data/destinations.ts` enrichi avec coordonnées GPS (`lat`, `lon`). Recommandation calculée statiquement via `computeDealRatio` + `classifyDeal` de `lib/dealsEngine.ts`. Page SSG Server Component à `app/carte/page.tsx`, composant interactif `"use client"` à `app/carte/WorldMap.tsx`. Bibliothèque : `react-simple-maps`.

**Tech Stack :** Next.js 14 App Router · TypeScript · Tailwind CSS · react-simple-maps · lib/dealsEngine (existant)

---

## Section 1 — Données (`data/destinations.ts`)

### Modification de l'interface

Ajouter `lat` et `lon` à l'interface `Destination` :

```typescript
export interface Destination {
  iata: string;
  city: string;
  country: string;
  flag: string;
  region: Region;
  unsplashQuery: string;
  cashEstimateUsd: number;
  milesEstimate: number;
  lat: number;   // latitude WGS84
  lon: number;   // longitude WGS84
}
```

### Coordonnées des 20 destinations

| IATA | Ville | lat | lon |
|------|-------|-----|-----|
| CDG | Paris | 49.0097 | 2.5479 |
| LHR | Londres | 51.4775 | -0.4614 |
| MAD | Madrid | 40.4983 | -3.5676 |
| FCO | Rome | 41.8003 | 12.2389 |
| IST | Istanbul | 40.9769 | 28.8146 |
| JFK | New York | 40.6413 | -73.7781 |
| MIA | Miami | 25.7959 | -80.2870 |
| YUL | Montréal | 45.4706 | -73.7408 |
| GRU | São Paulo | -23.4356 | -46.4731 |
| NRT | Tokyo | 35.7720 | 140.3929 |
| BKK | Bangkok | 13.6900 | 100.7501 |
| SIN | Singapour | 1.3644 | 103.9915 |
| DXB | Dubaï | 25.2532 | 55.3657 |
| DOH | Doha | 25.2731 | 51.6081 |
| CMN | Casablanca | 33.3675 | -7.5898 |
| CAI | Le Caire | 30.1219 | 31.4056 |
| LOS | Lagos | 6.5774 | 3.3212 |
| NBO | Nairobi | -1.3192 | 36.9275 |
| ABJ | Abidjan | 5.2613 | -3.9267 |
| SYD | Sydney | -33.9461 | 151.1772 |

---

## Section 2 — Page `/carte` (`app/carte/page.tsx`)

Server Component, SSG.

```typescript
export const metadata: Metadata = {
  title: "Carte des destinations miles | KEZA",
  description: "Explorez 20 destinations en avion depuis Dakar — carte interactive cash vs miles. Trouvez où vos points valent le plus.",
};
```

**Layout :**
```
Header (existant)
├── Hero compact
│   ├── Titre : "Explore le monde en miles"
│   └── Sous-titre : "20 destinations · clique pour voir les prix cash & miles"
├── WorldMap (client component)
│   ├── Pills filtres région
│   ├── Carte SVG (react-simple-maps)
│   └── Tooltip au clic
└── Barre de stats (Server)
    ├── Total destinations : 20
    ├── Destinations "Miles gagnent" : calculé statiquement
    └── Destinations "Cash gagne" : calculé statiquement
```

Stats calculées à la compilation (Server Component) via `computeDealRatio` + `classifyDeal` sur chaque destination.

---

## Section 3 — Composant carte (`app/carte/WorldMap.tsx`)

`"use client"` — interactivité tooltip et filtres.

### Props

```typescript
interface Props {
  destinations: DestinationWithRecommendation[];
  lang: "fr" | "en";
}

interface DestinationWithRecommendation extends Destination {
  recommendation: "USE_MILES" | "NEUTRAL" | "USE_CASH";
  cpm: number;
}
```

`DestinationWithRecommendation` est calculé dans le Server Component parent et passé en prop — aucun calcul dans le Client Component.

### Couleurs des markers

| Recommandation | Couleur | Token Tailwind |
|---|---|---|
| USE_MILES | Bleu | `#3b82f6` (text-primary) |
| NEUTRAL | Vert | `#10b981` (text-success) |
| USE_CASH | Orange/Ambre | `#f59e0b` (text-warning) |

### Tooltip

Affiché au clic sur un marker. Contenu :
- Flag + Ville + Pays
- Badge recommandation (MILES GAGNENT / SI TU AS LES MILES / CASH GAGNE)
- Prix cash : `dès $XXX`
- Miles estimés : `XXX k miles`
- CPM : `X.X¢/mile`
- Bouton `<a href="/?to={iata}">Rechercher ce vol →</a>`
- Croix pour fermer

**Positionnement :** CSS `position: absolute` par rapport au conteneur de la carte. Sur mobile (< 640px) : tooltip fixé en bas de l'écran (`position: fixed; bottom: 0; left: 0; right: 0`).

### Filtres région

Pills horizontaux scrollables : Toutes / 🌍 Afrique / 🇪🇺 Europe / 🌎 Amériques / 🌏 Asie / 🕌 M-Orient / 🇦🇺 Océanie. Filtrage côté client — markers non-sélectionnés restent visibles à `opacity: 0.2` (pas cachés) pour conserver le contexte géographique.

### Projection

`react-simple-maps` projection `"naturalEarth1"` — projection équilibrée, l'Afrique y est bien proportionnée (contrairement à Mercator qui écrase les pays équatoriaux).

### GeoJSON

URL CDN : `https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json` — chargé côté client, pas bundlé.

---

## Section 4 — Wiring

| Fichier | Modification |
|---|---|
| `components/Header.tsx` | Ajouter `{ label: "Carte", href: "/carte" }` entre "Calculateur" et "Programmes" |
| `app/sitemap.ts` | Ajouter `/carte` avec `priority: 0.8`, `changeFrequency: "monthly"` |
| `app/page.tsx` | Ajouter lien "Explorer la carte →" dans la section `DestinationsGrid` (petit lien texte sous la grille) |

---

## Section 5 — Dépendance npm

```bash
npm install react-simple-maps
npm install --save-dev @types/react-simple-maps  # si nécessaire
```

`react-simple-maps` est maintenu, léger (~40 KB gzipped), TypeScript natif depuis v3.

---

## Section 6 — Tests

**`__tests__/data/destinations.test.ts`** (nouveau fichier) :
- Vérifie que chaque destination a `lat` et `lon`
- `lat` entre -90 et 90
- `lon` entre -180 et 180
- 20 destinations au total

**`__tests__/carte/worldmap.test.ts`** (test logique uniquement, pas de rendu) :
- Vérifie que `computeDealRatio` + `classifyDeal` produit une recommandation valide pour chaque destination
- Vérifie que la transformation `DestinationWithRecommendation` contient tous les champs requis

---

## Décisions clés

| Décision | Choix | Raison |
|---|---|---|
| Bibliothèque carte | react-simple-maps | Légère, SVG pur, pas de tuiles, pas d'API key |
| Projection | naturalEarth1 | Afrique bien proportionnée (audience principale) |
| Tooltip mobile | Fixed bottom | Évite le débordement hors écran sur mobile |
| Markers filtrés | Opacity 0.2 (pas cachés) | Garde le contexte géographique visible |
| Calcul recommandation | Server Component | Zéro JS client pour le calcul |
| GeoJSON | CDN | Pas de bundle, chargement différé |

---

## Hors scope

- Zoom / pan sur la carte
- Carte depuis une ville de départ autre que Dakar (DSS) — la page affiche les prix estimés depuis DSS
- Pages détail par destination
- Animations de vol entre villes
