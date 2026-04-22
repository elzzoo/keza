# Alertes Prix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une page `/alertes` de gestion des alertes prix, un handler DELETE, et intégrer le formulaire d'alerte sur les fiches `/destinations/[iata]`.

**Architecture:** Le backend (Redis, Resend, cron) est entièrement construit. Ce plan ajoute uniquement : (1) le handler DELETE manquant sur `/api/alerts`, (2) la page `/alertes` cliente, (3) le formulaire `PriceAlertForm` sur les fiches destination, (4) le wiring nav + sitemap.

**Tech Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · lib/alerts (existant) · components/PriceAlertForm (existant)

---

## Fichiers

| Fichier | Action |
|---------|--------|
| `__tests__/api/alerts-delete.test.ts` | Créer |
| `app/api/alerts/route.ts` | Modifier — ajouter DELETE |
| `app/alertes/page.tsx` | Créer |
| `app/destinations/[iata]/DestinationPageClient.tsx` | Modifier — ajouter PriceAlertForm |
| `components/Header.tsx` | Modifier — ajouter "Alertes" dans nav |
| `app/sitemap.ts` | Modifier — ajouter /alertes |

---

## Task 1 : DELETE handler + test (TDD)

**Files:**
- Create: `__tests__/api/alerts-delete.test.ts`
- Modify: `app/api/alerts/route.ts`

- [ ] **Step 1 : Créer le fichier de test**

Créer `__tests__/api/alerts-delete.test.ts` :

```typescript
// Mock @/lib/alerts entièrement — évite d'initialiser Redis en test
jest.mock("@/lib/alerts", () => ({
  deactivateAlert: jest.fn(),
  createAlert: jest.fn(),
  getAlertsByEmail: jest.fn(),
}));

import { NextRequest } from "next/server";
import { DELETE } from "@/app/api/alerts/route";
import { deactivateAlert } from "@/lib/alerts";

const mockDeactivate = deactivateAlert as jest.MockedFunction<typeof deactivateAlert>;

function makeDeleteRequest(id?: string): NextRequest {
  const url = id
    ? `http://localhost/api/alerts?id=${id}`
    : `http://localhost/api/alerts`;
  return new NextRequest(url, { method: "DELETE" });
}

describe("DELETE /api/alerts", () => {
  beforeEach(() => jest.clearAllMocks());

  it("retourne 400 si le param id est manquant", async () => {
    const res = await DELETE(makeDeleteRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("retourne 404 si l'alerte est introuvable", async () => {
    mockDeactivate.mockResolvedValue(false);
    const res = await DELETE(makeDeleteRequest("alt_unknown_123"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("retourne 200 et ok:true si l'alerte est désactivée", async () => {
    mockDeactivate.mockResolvedValue(true);
    const res = await DELETE(makeDeleteRequest("alt_abc_456"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent (DELETE n'existe pas encore)**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/api/alerts-delete.test.ts --no-coverage
```

Expected : FAIL avec `DELETE is not a function` ou `not exported`.

- [ ] **Step 3 : Ajouter le handler DELETE dans `app/api/alerts/route.ts`**

Ouvrir `app/api/alerts/route.ts`. À la fin du fichier (après la fonction GET), ajouter :

```typescript
// DELETE /api/alerts?id=xxx — deactivate an alert
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id param" }, { status: 400 });
  }
  try {
    const { deactivateAlert } = await import("@/lib/alerts");
    const ok = await deactivateAlert(id);
    if (!ok) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[api/alerts] DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

Note : l'import dynamique `await import("@/lib/alerts")` est volontaire — il permet à `jest.mock` d'intercepter correctement le module.

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/api/alerts-delete.test.ts --no-coverage
```

Expected : 3 tests PASS.

- [ ] **Step 5 : Vérifier TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected : 0 erreurs.

- [ ] **Step 6 : Commit**

```bash
git add __tests__/api/alerts-delete.test.ts app/api/alerts/route.ts
git commit -m "feat: add DELETE /api/alerts handler — deactivate alert by id"
```

---

## Task 2 : Page `/alertes`

**Files:**
- Create: `app/alertes/page.tsx`

- [ ] **Step 1 : Créer `app/alertes/page.tsx`**

```bash
mkdir -p /Users/DIALLO9194/Downloads/keza/app/alertes
```

Créer `app/alertes/page.tsx` avec le contenu exact suivant :

```typescript
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AlertesClient } from "./AlertesClient";

export const metadata: Metadata = {
  title: "Mes alertes prix | KEZA",
  description:
    "Gérez vos alertes prix KEZA — recevez un email quand un tarif baisse de 10%+.",
};

export default function AlertesPage() {
  return (
    <AlertesClient />
  );
}
```

- [ ] **Step 2 : Créer `app/alertes/AlertesClient.tsx`**

Créer `app/alertes/AlertesClient.tsx` avec le contenu exact suivant :

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import type { PriceAlert } from "@/lib/alerts";

// ─── Cabin labels ─────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string, lang: "fr" | "en"): string {
  return new Date(iso).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AlertesClient() {
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [email, setEmail] = useState("");
  const [alerts, setAlerts] = useState<PriceAlert[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fr = lang === "fr";

  const cabinLabels = fr ? CABIN_LABELS_FR : CABIN_LABELS_EN;

  async function handleFetch(e: React.FormEvent) {
    e.preventDefault();
    if (!email || loading) return;
    setLoading(true);
    setFetchError(false);
    setAlerts(null);
    try {
      const res = await fetch(`/api/alerts?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      // Only show active alerts
      setAlerts((data.alerts as PriceAlert[]).filter((a) => a.active));
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setAlerts((prev) => prev?.filter((a) => a.id !== id) ?? null);
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header lang={lang} onLangChange={setLang} />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pb-12">
        {/* Hero */}
        <div className="pt-8 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🔔</span>
            <h1 className="text-2xl font-black text-fg">
              {fr ? "Mes alertes prix" : "My price alerts"}
            </h1>
          </div>
          <p className="text-sm text-muted">
            {fr
              ? "Entre ton email pour voir et gérer tes alertes actives."
              : "Enter your email to view and manage your active alerts."}
          </p>
        </div>

        {/* Email form */}
        <form onSubmit={handleFetch} className="flex gap-2 mb-8">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={fr ? "ton@email.com" : "your@email.com"}
            className="flex-1 bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-primary/50 transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary/90 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {loading
              ? (fr ? "Chargement…" : "Loading…")
              : (fr ? "Voir mes alertes →" : "View my alerts →")}
          </button>
        </form>

        {/* Error */}
        {fetchError && (
          <p className="text-sm text-red-400 mb-4">
            {fr ? "Erreur de chargement, réessaie." : "Loading error, please retry."}
          </p>
        )}

        {/* Results */}
        {alerts !== null && (
          alerts.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-muted text-sm">
                {fr
                  ? `Aucune alerte active pour ${email}.`
                  : `No active alerts for ${email}.`}
              </p>
              <Link
                href="/"
                className="inline-block text-sm text-primary hover:underline"
              >
                {fr ? "Rechercher un vol →" : "Search a flight →"}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted mb-2">
                {alerts.length} {fr ? "alerte(s) active(s)" : "active alert(s)"}
              </p>
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-surface border border-border rounded-2xl p-4 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-fg text-sm">
                        {alert.from} → {alert.to}
                      </span>
                      <span className="text-[11px] text-muted bg-surface-2 px-2 py-0.5 rounded-lg">
                        {cabinLabels[alert.cabin] ?? alert.cabin}
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      {fr ? "Alerte si prix <" : "Alert if price <"}{" "}
                      <span className="text-success font-bold">
                        ${alert.targetPrice}
                      </span>
                    </p>
                    <p className="text-[11px] text-subtle">
                      {fr ? "Créée le" : "Created"} {formatDate(alert.createdAt, lang)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    disabled={deletingId === alert.id}
                    aria-label={fr ? "Supprimer l'alerte" : "Delete alert"}
                    className="flex-shrink-0 text-muted hover:text-red-400 transition-colors text-lg disabled:opacity-40 pt-0.5"
                  >
                    {deletingId === alert.id ? "…" : "✕"}
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </main>

      <Footer lang={lang} />
    </div>
  );
}
```

- [ ] **Step 3 : Vérifier TypeScript**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx tsc --noEmit 2>&1 | head -20
```

Expected : 0 erreurs.

- [ ] **Step 4 : Vérifier que tous les tests existants passent encore**

```bash
npx jest --no-coverage
```

Expected : tous les tests PASS (y compris le DELETE test du Task 1).

- [ ] **Step 5 : Commit**

```bash
git add app/alertes/page.tsx app/alertes/AlertesClient.tsx
git commit -m "feat: add /alertes page — list and delete active price alerts by email"
```

---

## Task 3 : Wire up — destination + Header + sitemap

**Files:**
- Modify: `app/destinations/[iata]/DestinationPageClient.tsx`
- Modify: `components/Header.tsx`
- Modify: `app/sitemap.ts`

- [ ] **Step 1 : Ajouter `PriceAlertForm` dans `DestinationPageClient.tsx`**

Ouvrir `app/destinations/[iata]/DestinationPageClient.tsx`.

Ajouter l'import en haut du fichier (après les imports existants) :
```typescript
import { PriceAlertForm } from "@/components/PriceAlertForm";
```

Trouver le bloc `{/* Search form */}` et ajouter juste après, avant `{/* Results */}` :

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

- [ ] **Step 2 : Ajouter "Alertes" dans le nav du Header**

Ouvrir `components/Header.tsx`.

Dans `NAV.fr`, ajouter entre `{ label: "Prix", href: "/prix" }` et `{ label: "Programmes", href: "/programmes" }` :
```typescript
{ label: "Alertes", href: "/alertes" },
```

Dans `NAV.en`, ajouter entre `{ label: "Prices", href: "/prix" }` et `{ label: "Programs", href: "/programmes" }` :
```typescript
{ label: "Alerts", href: "/alertes" },
```

- [ ] **Step 3 : Ajouter `/alertes` dans le sitemap**

Ouvrir `app/sitemap.ts`.

Dans la liste des pages statiques (avant la boucle ROUTES), ajouter :
```typescript
    {
      url: `${BASE_URL}/alertes`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
```

- [ ] **Step 4 : Vérifier TypeScript**

```bash
cd /Users/DIALLO9194/Downloads/keza
npx tsc --noEmit 2>&1 | head -20
```

Expected : 0 erreurs.

- [ ] **Step 5 : Build final**

```bash
npx next build 2>&1 | tail -20
```

Expected : build propre, `/alertes` dans les pages générées.

- [ ] **Step 6 : Vérifier les tests**

```bash
npx jest --no-coverage
```

Expected : tous les tests PASS.

- [ ] **Step 7 : Commit et push**

```bash
git add app/destinations/\[iata\]/DestinationPageClient.tsx components/Header.tsx app/sitemap.ts
git commit -m "feat: wire up alertes — PriceAlertForm on destinations, nav link, sitemap"
git push origin main
```

- [ ] **Step 8 : Vérifier le déploiement**

```bash
until curl -s -o /dev/null -w "%{http_code}" https://keza-taupe.vercel.app/alertes | grep -q "200"; do sleep 5; done && echo "DEPLOYED"
```

Expected : `DEPLOYED` affiché quand le déploiement est prêt (~90 secondes).
