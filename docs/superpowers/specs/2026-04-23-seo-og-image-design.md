# SEO + og:image Dynamiques — Design Spec

**Date :** 2026-04-23
**Statut :** Approuvé
**Branche :** `feat/seo-og-image` → merge sur main après validation Vercel preview

---

## Objectif

Corriger le og:image cassé (référence `/og-image.png` inexistante) et ajouter des cartes de partage dynamiques pour chaque route. Quand quelqu'un partage Keza sur Twitter, WhatsApp ou LinkedIn, l'aperçu doit être riche et identifiable.

**Portée après audit du code existant :**
- `app/layout.tsx` référence `/og-image.png` qui n'existe pas → à corriger en priorité
- Pages destinations : og:title/description OK, pas d'og:image propre
- Pages comparer/prix/carte : og metadata partielle, pas d'og:image
- JSON-LD `TouristDestination` existe déjà sur les destinations → à enrichir en `TravelAction`
- `next/og` (ImageResponse) est bundlé dans Next.js 14 — aucun package supplémentaire

---

## Architecture

**Convention Next.js 14 `opengraph-image.tsx`**

Un fichier `opengraph-image.tsx` dans un dossier de route génère automatiquement l'`og:image` pour cette route — aucune modification des objets `metadata` nécessaire. L'`ImageResponse` (satori) génère un PNG 1200×630 sur l'Edge Runtime.

**Contrainte satori :** styles inline uniquement, pas de Tailwind. Toutes les props de style sont des objets JavaScript `style={{...}}`.

**Style validé :** Option B (gradient indigo — `#1a1a2e → #16213e → #0f3460`), nom de ville complet, badge deal coloré.

---

## Fichiers

| Fichier | Action | Contenu |
|---|---|---|
| `lib/og-templates.tsx` | Créer | `ogWrapper`, `ogTopBar`, `ogBottomBar` — helpers JSX partagés |
| `app/opengraph-image.tsx` | Créer | og:image home — tagline "Cash ou Miles ?" |
| `app/destinations/[iata]/opengraph-image.tsx` | Créer | og:image dynamique par destination |
| `app/comparer/opengraph-image.tsx` | Créer | og:image statique /comparer |
| `app/prix/opengraph-image.tsx` | Créer | og:image statique /prix |
| `app/carte/opengraph-image.tsx` | Créer | og:image statique /carte |
| `app/layout.tsx` | Modifier | Supprimer `images: ["/og-image.png"]` cassé |
| `app/destinations/[iata]/page.tsx` | Modifier | Enrichir JSON-LD : TouristDestination → TravelAction avec prix/miles |

---

## Section 1 — `lib/og-templates.tsx`

Trois helpers exportés, retournent des `React.ReactElement` (inline styles only) :

### `ogWrapper(children: React.ReactNode): React.ReactElement`
Fond gradient indigo (`#1a1a2e → #16213e → #0f3460`), deux cercles décoratifs transparents (position absolute), padding `48px 56px`, `display: flex, flexDirection: column, justifyContent: space-between`. Prend les trois sections (top bar, contenu, bottom bar) comme children.

### `ogTopBar(tag: string): React.ReactElement`
Ligne supérieure : logo Keza (carré indigo #6366f1 + ✈ + texte "Keza") à gauche, pill transparent (`rgba(255,255,255,0.1)`) avec `tag` en `#a5b4fc` à droite.

### `ogBottomBar(leftText: string): React.ReactElement`
Ligne inférieure : `leftText` en `#4b5563` à gauche, `keza.app` en `#374151` à droite.

**Constantes exportées :**
```typescript
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
```

---

## Section 2 — og:image par route

### `app/opengraph-image.tsx` (home)
```
[Top] ✈ Keza                [Comparateur de vols]
[Mid] Cash ou Miles ?
      Compare le vrai coût de chaque vol depuis Dakar
[Bot] 20 destinations · mise à jour mensuelle    keza.app
```

### `app/destinations/[iata]/opengraph-image.tsx` (dynamique)
```
[Top] ✈ Keza               [Dakar → Tokyo]
[Mid] Japon · NRT
      Tokyo
      75 000 pts  •  ~820€  [Utilise tes miles]
[Bot] Meilleurs mois : Jan · Fév · Nov            keza.app
```

Données : `DESTINATIONS` → `computeDealRatio` → `classifyDeal` → `getMonthlyPrices`. Conversion USD→EUR : `* 0.92`. Miles formatés avec `toLocaleString("fr-FR")`. Badge deal : `USE_MILES` → indigo, `USE_CASH` → rouge, `NEUTRAL` → gris. Fallback si IATA inconnu : image home generique.

### `app/comparer/opengraph-image.tsx`
Titre : "Comparez 3 destinations" · Sous-titre : "Miles, cash et meilleure période côte-à-côte"

### `app/prix/opengraph-image.tsx`
Titre : "Prix mois par mois" · Sous-titre : "20 destinations · quand partir pour payer moins"

### `app/carte/opengraph-image.tsx`
Titre : "Explore le monde" · Sous-titre : "20 destinations depuis Dakar — miles ou cash ?"

---

## Section 3 — Corrections `app/layout.tsx`

Retirer les deux blocs `images` cassés :
```typescript
// SUPPRIMER de openGraph :
images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "..." }]

// SUPPRIMER de twitter :
images: ["/og-image.png"]
```

La convention `opengraph-image.tsx` remplace ces valeurs automatiquement.

---

## Section 4 — JSON-LD `app/destinations/[iata]/page.tsx`

Remplacer le schéma `TouristDestination` existant (lignes 52-57) par :

```json
{
  "@context": "https://schema.org",
  "@type": "TravelAction",
  "name": "Vol Dakar → {city} — Cash ou Miles ?",
  "description": "Comparer le prix cash (~{priceEur}€) versus {miles} miles pour un vol DSS → {iata}.",
  "fromLocation": { "@type": "Airport", "name": "Aéroport Blaise Diagne", "iataCode": "DSS" },
  "toLocation": { "@type": "Airport", "name": "{city}", "iataCode": "{iata}" },
  "offers": { "@type": "Offer", "price": "{priceEur}", "priceCurrency": "EUR" }
}
```

---

## Validation

- `npx tsc --noEmit` — clean
- `npx jest --no-coverage` — 79 tests passent (pas de tests unitaires pour og:image — output visuel)
- Vercel preview : inspecter chaque og:image via `https://opengraph.xyz` ou `https://cards-dev.twitter.com/validator`
