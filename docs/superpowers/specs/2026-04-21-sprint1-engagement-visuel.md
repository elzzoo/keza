# KEZA Sprint 1 — Engagement visuel

**Date :** 2026-04-21  
**Scope :** 3 features pour augmenter l'engagement et la conversion immédiate  
**Environnement :** Next.js 14 App Router · TypeScript · Tailwind · Upstash Redis · Unsplash API

---

## 1. Deals du moment

### Objectif
Afficher en haut de la homepage une strip scrollable des routes où les miles ont la meilleure valeur en ce moment. Crée de l'urgence et une raison de revenir chaque jour.

### Architecture

**Données**
- Un cron job `/api/cron/deals` tourne toutes les 6h (déclenché par Vercel Cron)
- Il appelle Travelpayouts pour ~20 routes populaires (DSS-CDG, JFK-LHR, LOS-LHR, CDG-NRT, CMN-CDG…)
- Pour chaque route, il calcule le ratio `miles_value = cash_price / (miles_required / 1000)` (centimes par mile)
- Il trie par ratio décroissant, garde les 10 meilleurs deals
- Il stocke le résultat en Redis : `keza:deals:live` avec TTL 7h (safety window)

**Endpoint**
- `GET /api/deals` — lit `keza:deals:live` depuis Redis, retourne `{ deals: Deal[], updatedAt: string }`
- Si Redis vide : retourne 5 deals statiques de fallback (données hardcodées)

**Composant**
- `components/DealsStrip.tsx` — client component
- Fetch au mount via `useSWR('/api/deals', ...)`  avec revalidation toutes les 30 minutes
- Affichage : strip `overflow-x: auto`, cartes avec drapeau, route, prix cash, miles requis, badge multiplicateur
- Recommandation colorée : bleu (miles gagnent) / jaune (cash gagne)
- Skeleton loader pendant le fetch

**Intégration homepage**
- Inséré dans `app/page.tsx` juste après `<TrustBar />`, visible même quand `hasSearched = true` (compact en mode résultats, masqué si l'utilisateur a déjà cherché)
- Visible uniquement si `!hasSearched`

**Structure d'un Deal**
```typescript
interface Deal {
  from: string;        // "DSS"
  to: string;          // "CDG"
  fromFlag: string;    // "🇸🇳"
  toFlag: string;      // "🇫🇷"
  cashPrice: number;   // 680 (USD)
  milesRequired: number; // 35000
  program: string;     // "Flying Blue"
  cabin: string;       // "economy"
  ratio: number;       // 1.94 (cents per mile)
  recommendation: "miles" | "cash" | "neutral";
}
```

---

## 2. Destinations à explorer

### Objectif
Section visuelle sur la homepage avec photos Unsplash par destination. L'utilisateur voit une belle photo de Paris, clique, et la ville se pre-remplit dans le moteur de recherche. Conversion directe inspiration → recherche → booking.

### Architecture

**Données statiques**
- Fichier `data/destinations.ts` — liste de 20 destinations avec : code IATA, ville, pays, drapeau emoji, région, route depuis DSS (point de départ par défaut), prix cash indicatif, miles indicatifs
- La recommandation (miles/cash/neutral) est recalculée dynamiquement côté serveur à partir des deals live

**Photos Unsplash**
- Clé API stockée dans `UNSPLASH_ACCESS_KEY` (env var)
- Endpoint Next.js `GET /api/unsplash?query=paris` — proxy côté serveur pour ne pas exposer la clé dans le bundle client
- Photos fetchées au build time via `generateStaticParams` pour les 20 destinations et stockées en Redis `keza:unsplash:{query}` avec TTL 30 jours (les photos ne changent pas souvent)
- Fallback : si Unsplash échoue, URL de placeholder neutre

**Composant**
- `components/DestinationsGrid.tsx` — server component pour le premier rendu (SSR), les photos sont déjà dans le HTML
- Props : `destinations: DestinationWithPhoto[]` passées depuis le Server Component parent
- Filtres par région : client-side (state local, pas de refetch)
- Au clic sur une carte : `setPrefillFrom` / `setPrefillTo` sur la homepage + scroll smooth vers le formulaire

**Intégration homepage**
- Remplace (ou complète) `<PopularRoutes />` dans la section `!hasSearched`
- `PopularRoutes` devient un sous-ensemble de `DestinationsGrid` (les mêmes données, vue compacte)

**Structure**
```typescript
interface Destination {
  iata: string;           // "CDG"
  city: string;           // "Paris"
  country: string;        // "France"
  flag: string;           // "🇫🇷"
  region: "africa" | "europe" | "americas" | "asia" | "middle-east";
  defaultFrom: string;    // "DSS" — ville de départ par défaut
  cashPrice?: number;     // prix indicatif USD depuis defaultFrom
  milesEstimate?: number; // miles indicatifs
  unsplashQuery: string;  // "paris eiffel tower"
}

interface DestinationWithPhoto extends Destination {
  photoUrl: string;
  photoCredit: string;    // "Photo by X on Unsplash"
  recommendation?: "miles" | "cash" | "neutral";
}
```

---

## 3. Calculateur de valeur miles

### Objectif
Page standalone `/calculateur` + widget intégré en homepage. Répond à "j'ai X miles programme Y, ça vaut combien en euros/dollars ?". Comble le lien `#calc` cassé dans le nav. Fort potentiel SEO.

### Architecture

**Données**
- Fichier `data/milesValues.ts` — table statique CPM (cents per mile) par programme et par type de rédemption
- Mise à jour manuelle trimestrielle (pas de cron nécessaire)

```typescript
// Valeurs réelles du marché, sources: ThePointsGuy, NerdWallet
const MILES_VALUES = {
  "flying-blue":   { economy: 1.1, business: 1.8, label: "Flying Blue (Air France/KLM)" },
  "aeroplan":      { economy: 1.5, business: 2.2, label: "Aeroplan (Air Canada)" },
  "lifemiles":     { economy: 1.2, business: 1.9, label: "LifeMiles (Avianca)" },
  "miles-smiles":  { economy: 1.1, business: 1.7, label: "Miles&Smiles (Turkish)" },
  "skywards":      { economy: 1.0, business: 1.8, label: "Skywards (Emirates)" },
  "avios":         { economy: 1.0, business: 1.6, label: "Avios (British Airways)" },
  "amex-mr":       { economy: 1.4, business: 2.0, label: "Amex Membership Rewards" },
}
```

**Page `/calculateur`**
- Server component avec metadata SEO ("Valeur miles Flying Blue 2026 — Calculateur KEZA")
- Client component `MilesCalculator.tsx` pour l'interactivité
- Inputs : nombre de miles (slider + input) · programme (select) · type de vol (economy/business)
- Output : valeur en USD et EUR (via le hook `useCurrency` existant) · comparaison avec prix cash moyen sur une route populaire
- Tableau récapitulatif de tous les programmes pour comparaison

**Widget homepage**
- `components/MilesCalculatorWidget.tsx` — version compacte (1 ligne) insérée dans la section `!hasSearched`
- Input inline : "J'ai [ 50 000 ] miles [Flying Blue ▾] → ≈ **550 $**" — lien "Voir le détail →" vers `/calculateur`

**Navigation**
- Lien "Calculateur" dans le Header pointe vers `/calculateur` (remplace l'ancien `#calc`)

---

## Layout homepage final

```
┌─────────────────────────────────────────────┐
│  Header (sticky)                            │
├─────────────────────────────────────────────┤
│  TrustBar                                   │
├─────────────────────────────────────────────┤
│  🔥 DealsStrip (horizontal scroll)          │  ← NOUVEAU
├─────────────────────────────────────────────┤
│  Hero title + SearchForm                    │  ← inchangé
├─────────────────────────────────────────────┤
│  [Results quand hasSearched]                │
├─────────────────────────────────────────────┤
│  si !hasSearched :                          │
│    RecentSearches                           │
│    🌍 DestinationsGrid (avec filtres)       │  ← NOUVEAU (remplace PopularRoutes)
│    🧮 MilesCalculatorWidget                 │  ← NOUVEAU
│    PromoBanner                              │
│    HowItWorks                               │
│    Recommandation légende                   │
├─────────────────────────────────────────────┤
│  Footer                                     │
└─────────────────────────────────────────────┘
```

---

## Nouvelles routes

| Route | Description |
|-------|-------------|
| `GET /api/deals` | Deals live depuis Redis |
| `GET /api/unsplash?query=...` | Proxy Unsplash (protège la clé API) |
| `GET /api/cron/deals` | Cron job refresh deals (auth: CRON_SECRET) |
| `GET /calculateur` | Page calculateur de valeur miles |

---

## Nouvelles variables d'environnement

| Variable | Description |
|----------|-------------|
| `UNSPLASH_ACCESS_KEY` | Clé API Unsplash pour les photos destinations |

---

## Gestion des erreurs

- **Deals** : si Redis vide ou API Travelpayouts KO → fallback sur 5 deals statiques hardcodés, jamais de crash
- **Photos Unsplash** : si API KO → image placeholder gradient avec initiales de la ville, jamais de broken image
- **Calculateur** : données purement statiques, pas de risque d'erreur runtime

---

## Ce qui ne change pas

- `SearchForm.tsx` — inchangé
- `Results.tsx` — inchangé
- `FlightCard.tsx` — inchangé
- Toute la logique `lib/engine.ts` — inchangée
- `PopularRoutes.tsx` — retiré de la homepage, peut rester pour les pages `/flights/[route]`

---

## Métriques de succès (à mesurer via Plausible)

- Taux de clic sur les deals (event "Deal Click")
- Taux de clic sur les destinations (event "Destination Click") → taux de conversion vers une recherche
- Pages vues `/calculateur`
- Partages du calculateur
