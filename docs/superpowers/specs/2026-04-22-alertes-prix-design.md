# Alertes Prix — Design Spec

**Date :** 2026-04-22
**Statut :** Approuvé

---

## Objectif

Rendre les alertes prix accessibles à l'utilisateur via deux points d'entrée :
1. Une page `/alertes` pour voir et supprimer ses alertes actives (sans compte, juste l'email)
2. Un formulaire d'alerte directement sur les fiches `/destinations/[iata]` (sans avoir à faire une recherche d'abord)

Le backend est déjà entièrement construit (Redis, Resend, cron job). Ce sprint ajoute uniquement la surface UI et le handler DELETE manquant.

---

## Ce qui existe déjà (ne pas modifier sauf wiring)

- `components/PriceAlertForm.tsx` — formulaire complet (POST /api/alerts)
- `app/api/alerts/route.ts` — GET + POST implémentés
- `lib/alerts.ts` — `createAlert`, `getAlertsByEmail`, `deactivateAlert` (tous exportés)
- `app/api/cron/alerts/route.ts` — cron quotidien 8h
- `vercel.json` — cron configuré

---

## Architecture

**Tech Stack :** Next.js 14 App Router · TypeScript · Tailwind CSS · Redis (Upstash) · lib/alerts (existant)

---

## Section 1 — Fichiers

| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `app/alertes/page.tsx` | Créer | Shell SSG + AlertesClient inline ("use client") |
| `app/api/alerts/route.ts` | Modifier | Ajouter handler DELETE |
| `app/destinations/[iata]/DestinationPageClient.tsx` | Modifier | Ajouter PriceAlertForm après SearchForm |
| `components/Header.tsx` | Modifier | Ajouter "Alertes" / "Alerts" dans le nav |
| `app/sitemap.ts` | Modifier | Ajouter /alertes |
| `__tests__/api/alerts-delete.test.ts` | Créer | Tests handler DELETE |

---

## Section 2 — DELETE handler (`app/api/alerts/route.ts`)

Ajouter à la fin du fichier existant :

```typescript
// DELETE /api/alerts?id=xxx — deactivate an alert
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id param" }, { status: 400 });
  }
  const { deactivateAlert } = await import("@/lib/alerts");
  const ok = await deactivateAlert(id);
  if (!ok) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
```

---

## Section 3 — Page `/alertes` (`app/alertes/page.tsx`)

Page unique avec métadonnées SSG + composant client inline.

### Metadata

```typescript
export const metadata: Metadata = {
  title: "Mes alertes prix | KEZA",
  description: "Gérez vos alertes prix KEZA — recevez un email quand un tarif baisse de 10%+.",
};
```

### UI (AlertesClient — "use client")

**State :**
```typescript
const [email, setEmail] = useState("");
const [alerts, setAlerts] = useState<PriceAlert[] | null>(null);
const [loading, setLoading] = useState(false);
const [deletingId, setDeletingId] = useState<string | null>(null);
```

**Flow :**
1. Formulaire email → `GET /api/alerts?email=xxx` → setAlerts
2. Si `alerts.length === 0` → message vide + lien calculateur
3. Si `alerts.length > 0` → liste de cartes
4. Bouton "Supprimer" → `DELETE /api/alerts?id=xxx` → retirer de la liste locale

**Layout complet :**

```
Header (lang toggle)

Hero
  🔔 Mes alertes prix            [FR] / My price alerts [EN]
  "Entre ton email pour voir et gérer tes alertes actives"

Formulaire
  [email input]  [Voir mes alertes →]

--- après soumission ---

État chargement : spinner

Liste des alertes :
  Pour chaque alerte :
  ┌────────────────────────────────────────────┐
  │ {from} → {to}  ·  {cabin label}            │
  │ Alerte si prix < ${targetPrice}             │
  │ Créée le {date formatée}    [Supprimer ✕]  │
  └────────────────────────────────────────────┘

État vide :
  "Aucune alerte active pour {email}"
  → [Rechercher un vol →]  (lien vers /)

Footer
```

### Cabin labels

```typescript
const CABIN_LABELS_FR: Record<string, string> = {
  economy: "Économique",
  premium: "Premium Éco",
  business: "Business",
  first: "Première",
};
const CABIN_LABELS_EN: Record<string, string> = {
  economy: "Economy",
  premium: "Premium Eco",
  business: "Business",
  first: "First",
};
```

### Format date

```typescript
new Date(alert.createdAt).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", {
  day: "numeric", month: "short", year: "numeric"
})
```

---

## Section 4 — Intégration `/destinations/[iata]`

Dans `app/destinations/[iata]/DestinationPageClient.tsx`, ajouter après le bloc `{/* Search form */}` et avant `{/* Results */}` :

```tsx
{/* Price alert */}
{!hasSearched && (
  <div className="mt-4">
    <PriceAlertForm
      from="DSS"
      to={dest.iata}
      cabin="economy"
      currentPrice={dest.cashEstimateUsd}
      lang={lang}
    />
  </div>
)}
```

Import à ajouter en haut :
```typescript
import { PriceAlertForm } from "@/components/PriceAlertForm";
```

Le formulaire est masqué une fois la recherche lancée (`!hasSearched`) pour éviter la superposition avec les résultats.

---

## Section 5 — Wiring

### `components/Header.tsx`

Dans `NAV.fr`, ajouter entre "Prix" et "Programmes" :
```typescript
{ label: "Alertes", href: "/alertes" },
```

Dans `NAV.en` :
```typescript
{ label: "Alerts", href: "/alertes" },
```

### `app/sitemap.ts`

Ajouter dans la liste des pages statiques :
```typescript
{
  url: `${BASE_URL}/alertes`,
  lastModified: now,
  changeFrequency: "monthly" as const,
  priority: 0.6,
},
```

---

## Section 6 — Tests

### `__tests__/api/alerts-delete.test.ts`

Note : ces tests nécessitent un mock de Redis. Pattern : mocker `@/lib/alerts` directement.

```typescript
import { NextRequest } from "next/server";

// Mock lib/alerts
jest.mock("@/lib/alerts", () => ({
  deactivateAlert: jest.fn(),
}));

import { DELETE } from "@/app/api/alerts/route";
import { deactivateAlert } from "@/lib/alerts";

const mockDeactivate = deactivateAlert as jest.MockedFunction<typeof deactivateAlert>;

function makeRequest(id?: string): NextRequest {
  const url = id
    ? `http://localhost/api/alerts?id=${id}`
    : `http://localhost/api/alerts`;
  return new NextRequest(url, { method: "DELETE" });
}

describe("DELETE /api/alerts", () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne 400 si id manquant", async () => {
    const res = await DELETE(makeRequest());
    expect(res.status).toBe(400);
  });

  it("retourne 404 si alerte introuvable", async () => {
    mockDeactivate.mockResolvedValue(false);
    const res = await DELETE(makeRequest("alt_unknown"));
    expect(res.status).toBe(404);
  });

  it("retourne 200 si alerte désactivée avec succès", async () => {
    mockDeactivate.mockResolvedValue(true);
    const res = await DELETE(makeRequest("alt_abc123"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
```

---

## Décisions clés

| Décision | Choix | Raison |
|----------|-------|--------|
| Auth | Email seul (pas de session) | Zéro friction, cohérent avec le reste du produit |
| Suppression | Soft delete (`active=false`) | `deactivateAlert` existe déjà, expire en 7j |
| Alerte sur destinations | `!hasSearched` conditionnel | Évite la superposition avec les résultats de recherche |
| DELETE handler | Query param `?id=` | Simple, REST-ish, cohérent avec GET `?email=` existant |

---

## Hors scope

- Authentification / compte utilisateur
- Modification d'une alerte existante (threshold, cabin)
- Alertes à la hausse
- Historique des notifications reçues
- Page de confirmation après suppression (feedback inline suffit)
