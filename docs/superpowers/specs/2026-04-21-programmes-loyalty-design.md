# Classement des Programmes de Fidélité — Design Spec

**Date :** 2026-04-21
**Statut :** Approuvé

---

## Objectif

Créer un classement exhaustif des 33 principaux programmes de fidélité (airlines, hôtels, cartes de transfert) à portée internationale, accessible via une page dédiée `/programmes` et un widget compact sur la homepage. Données entièrement statiques, mises à jour manuellement via `data/programs.ts`.

## Architecture

Source unique de données dans `data/programs.ts`. Page `/programmes` en SSG (Server Component) avec un composant client `ProgramsTable.tsx` pour les filtres interactifs. Widget `ProgramsWidget.tsx` sur la homepage affichant le top 5. Aucune API, aucun Redis, aucun cron.

**Tech Stack :** Next.js 14 App Router · TypeScript · Tailwind CSS · tokens custom existants

---

## Section 1 — Structure des données (`data/programs.ts`)

### Types

```ts
type Alliance = "star" | "oneworld" | "skyteam";
type ProgramType = "airline" | "hotel" | "transfer";

interface LoyaltyProgram {
  id: string;                 // slug kebab-case ex. "flying-blue"
  name: string;               // "Flying Blue"
  company: string;            // "Air France / KLM"
  type: ProgramType;
  alliance?: Alliance;        // undefined pour hôtels et transfert
  regions: string[];          // ["europe", "africa"]
  cpmCents: number;           // valeur estimée en centimes/mile ex. 1.4
  transferPartners: string[]; // ["amex", "chase", "citi", "capital-one"]
  bestUse: string;            // "Cabines premium transatlantiques"
  flag: string;               // emoji drapeau ex. "🇫🇷"
  score: number;              // 0–100
}
```

### Score KEZA — formule de calcul

```
score = round(
  (cpmCents / 3.0) * 50        // CPM pondéré 50% (max ~3.0 cts)
  + min(transferPartners.length / 6, 1) * 30  // Partenaires pondérés 30%
  + flexibilityScore * 20      // Flexibilité manuelle 20% (0.0–1.0)
)
```

`flexibilityScore` est un champ interne non exposé dans l'interface, calculé manuellement par programme (0.0 = rigide, 1.0 = très flexible).

### Liste des 33 programmes

**Star Alliance (7)**
- United MileagePlus · Air Canada Aeroplan · Lufthansa Miles&More · Singapore KrisFlyer · Turkish Miles&Smiles · ANA Mileage Club · Ethiopian ShebaMiles

**Oneworld (7)**
- British Airways Avios · American AAdvantage · Qatar Privilege Club · Cathay Asia Miles · Iberia Plus · JAL Mileage Bank · Alaska Mileage Plan

**SkyTeam (4)**
- Flying Blue (AF/KLM) · Delta SkyMiles · Korean Air SkyPass · Aeromexico Club Premier

**Indépendants (5)**
- Emirates Skywards · Etihad Guest · Qantas Frequent Flyer · Virgin Atlantic Flying Club · Southwest Rapid Rewards

**Hôtels (5)**
- Marriott Bonvoy · Hilton Honors · World of Hyatt · IHG One Rewards · Accor ALL

**Transfert cartes (5)**
- Amex Membership Rewards · Chase Ultimate Rewards · Capital One Miles · Citi ThankYou Points · Bilt Rewards

Total : **33 programmes**

---

## Section 2 — Page `/programmes`

**Fichiers :**
- `app/programmes/page.tsx` — Server Component, SSG, metadata SEO
- `app/programmes/ProgramsTable.tsx` — "use client", filtres + tri interactifs

### Metadata SEO

```ts
export const metadata: Metadata = {
  title: "Meilleurs programmes miles & points 2026 | KEZA",
  description: "Comparez les 33 meilleurs programmes de fidélité : Flying Blue, Aeroplan, Avios... Score KEZA, valeur du mile, partenaires de transfert.",
};
```

### Layout de la page

```
Header
├── Hero compact
│   ├── Titre : "Quel programme vaut vraiment le coup ?"
│   └── Sous-titre : "Mis à jour : avril 2026 · 33 programmes analysés"
├── Filtres (pills horizontaux scrollables)
│   ├── Type  : [Tous] [Airline ✈] [Hôtel 🏨] [Transfert 💳]
│   └── Alliance : [Star Alliance] [Oneworld] [SkyTeam]
├── Tableau desktop (≥ sm)
│   └── Rang │ Flag+Nom │ Type │ Score KEZA │ CPM │ Partenaires │ Meilleur usage
├── Cards mobile (< sm)
│   └── Une card par programme, stack vertical
├── Note éditoriale
│   └── "Comment KEZA calcule le score" (accordéon)
└── Footer
```

### Tri

- Par défaut : Score KEZA décroissant
- Colonne "Score" et "CPM" cliquables pour trier (ascendant/descendant)

### Filtres

Les filtres Type et Alliance sont combinables. Exemple : Airline + Star Alliance = tous les programmes airline Star Alliance.

**Règle alliance + non-airline :** sélectionner un filtre Alliance (Star/Oneworld/SkyTeam) force implicitement le type à "Airline" — les hôtels et cartes transfert (sans alliance) sont masqués. Si l'utilisateur a sélectionné "Hôtel" et clique ensuite sur "Star Alliance", le filtre Type repasse à "Tous" automatiquement.

---

## Section 3 — Widget homepage (`components/ProgramsWidget.tsx`)

- Affichage : top 5 programmes par score KEZA
- Pas de filtre (compact)
- Bouton "Voir tout →" → `/programmes`
- Clic sur un programme → `/programmes#<id>`
- Intégré dans la section `!hasSearched` de `app/page.tsx`
- Position dans la grille homepage : après `MilesCalculatorWidget`, avant `PromoBanner`

### Layout du widget

```
┌─────────────────────────────────┐
│ 🏆 Top programmes   [Voir tout →]│
├─────────────────────────────────┤
│ #1  🇫🇷 Flying Blue      92/100  │
│     💳 Amex · Chase              │
│     "Premium transatlantique"    │
├─────────────────────────────────┤
│ #2  🇨🇦 Aeroplan         89/100  │
│ #3  🇬🇧 Virgin Flying Club 86    │
│ #4  🇺🇸 Amex MR           84    │
│ #5  🇸🇬 KrisFlyer         83    │
└─────────────────────────────────┘
```

---

## Section 4 — Architecture des fichiers

```
data/
  programs.ts                     ← CRÉER — source unique, 33 programmes

app/
  programmes/
    page.tsx                      ← CRÉER — Server Component SSG + metadata
    ProgramsTable.tsx             ← CRÉER — "use client", filtres + tri

components/
  ProgramsWidget.tsx              ← CRÉER — top 5 widget homepage

app/
  page.tsx                        ← MODIFIER — intégrer ProgramsWidget

components/
  Header.tsx                      ← MODIFIER — ajouter lien "Programmes" dans nav

app/
  sitemap.ts                      ← MODIFIER — ajouter /programmes (priority: 0.9)

lib/
  analytics.ts                    ← MODIFIER — ajouter trackProgramClick
```

---

## Section 5 — Tests

**`__tests__/data/programs.test.ts`**
- Vérifie que `PROGRAMS` contient exactement 33 entrées
- Vérifie que chaque programme a tous les champs requis (id, name, company, type, cpmCents, score, etc.)
- Vérifie que tous les scores sont entre 0 et 100
- Vérifie que tous les CPM sont > 0 et < 5
- Vérifie que les ids sont uniques
- Vérifie que le top programme par score a score ≥ 80

**`__tests__/components/ProgramsWidget.test.ts`**
- Vérifie que le widget affiche exactement 5 programmes
- Vérifie que les 5 sont triés par score décroissant
- Vérifie que le lien "Voir tout" pointe vers `/programmes`

---

## Décisions clés

| Décision | Choix | Raison |
|---|---|---|
| Source des données | Statique `data/programs.ts` | CPM change 2-4x/an, static = maintenable et versionné |
| Rendu | SSG + client pour filtres | SEO maximal + interactivité |
| Score | Calculé manuellement | Pas de source live fiable pour les valuations miles |
| Sweet spots | Hors scope v1 | Trop de contenu à maintenir, prévu pour pages détail |
| Pages détail `/programmes/[id]` | Hors scope v1 | Scope séparé, Sprint 3 |

---

## Hors scope (Sprint 3)

- Pages détail par programme (`/programmes/flying-blue`)
- Sweet spots éditoriaux par programme
- Comparateur côte-à-côte (2 programmes sélectionnés)
- Mise à jour dynamique des CPM via API externe
