# Weekly Alert Digest — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Envoyer chaque dimanche matin un email récapitulatif aux utilisateurs ayant des alertes actives — montrant l'état de chaque alerte (prix actuel vs cible) et relançant l'engagement sans attendre une baisse de prix.

**Architecture:** Nouveau cron `GET /api/cron/digest` (dimanche 10h UTC) dans `vercel.json`. Le handler collecte les alertes actives via les fonctions Redis existantes, regroupe par email, calcule la progression vers le seuil (`lastPrice` ou `basePrice` comme fallback), et envoie un seul email récap par utilisateur. Une clé Redis `keza:digest:last:{email}` avec TTL 6 jours empêche les doublons. Pas de nouveau fichier `lib/` — tout dans le cron handler.

**Tech Stack:** Next.js 14 · Resend (`resend@6`, déjà installé) · Redis (Upstash) · TypeScript · Vercel Cron

---

## Contexte codebase

- `lib/alerts.ts` — Fonctions Redis disponibles : `getAllActiveRoutes()`, `getAlertsByRoute(from, to)`. Interface `PriceAlert` : `id`, `email`, `from`, `to`, `cabin`, `basePrice`, `targetPrice`, `lastPrice?`, `lastCheckedAt?`, `notifCount`, `active`. **Non modifié.**
- `app/api/cron/alerts/route.ts` — Pattern existant à reproduire : `isVercelCron()`, boucle sur routes, `sendPriceDropEmail`, gestion d'erreurs. Imports depuis `@/lib/alerts`.
- `lib/alerts.ts` constantes réutilisables : `FROM_EMAIL`, `BASE_URL`, `getResend()`, `CABIN_LABELS`.  **Attention** : `FROM_EMAIL`, `BASE_URL`, `CABIN_LABELS`, `getResend()` sont des constantes/fonctions **non exportées** dans `lib/alerts.ts`. Le cron digest doit redéclarer `FROM_EMAIL` et `BASE_URL` localement, ou importer `sendAlertConfirmationEmail` comme référence. **Solution retenue** : déclarer dans le cron ses propres constantes locales.
- `vercel.json` — 3 crons existants. Ajouter le digest le dimanche à 10h UTC : `"0 10 * * 0"`.
- Redis clé anti-doublon : `keza:digest:last:{email}` (string, TTL 6 jours = 518400 secondes). `redis.set(key, "1", { ex: 518400 })`.

## Fichiers

| Fichier | Action | Contenu |
|---|---|---|
| `app/api/cron/digest/route.ts` | Créer | Cron hebdomadaire — collecte alertes, envoie digest par email |
| `vercel.json` | Modifier | Ajouter `"0 10 * * 0"` pour `/api/cron/digest` |

---

## Task 1 : Créer `app/api/cron/digest/route.ts`

**Files:**
- Create: `app/api/cron/digest/route.ts`

- [ ] **Step 1 : Vérifier la branche**

```bash
cd /Users/DIALLO9194/Downloads/keza && git branch --show-current
```

Attendu : `feat/weekly-digest`

- [ ] **Step 2 : Créer `app/api/cron/digest/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAllActiveRoutes, getAlertsByRoute, type PriceAlert } from "@/lib/alerts";
import { redis } from "@/lib/redis";

// ─── Constants ───────────────────────────────────────────────────────────────

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "KEZA Alerts <onboarding@resend.dev>";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://keza-taupe.vercel.app";

const CABIN_LABELS: Record<PriceAlert["cabin"], string> = {
  economy: "Économique",
  premium: "Premium Éco",
  business: "Business",
  first: "Première",
};

// Anti-duplicate: don't send a digest to the same email more than once per 6 days
const DIGEST_LAST_KEY = (email: string) => `keza:digest:last:${email.toLowerCase()}`;
const DIGEST_COOLDOWN_SEC = 6 * 24 * 60 * 60; // 6 days

// ─── Auth ────────────────────────────────────────────────────────────────────

function isVercelCron(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Progress percentage towards the price target.
 * 0% = price hasn't moved from basePrice, 100% = price has hit targetPrice.
 * Clamped to [0, 100].
 */
function progressPct(alert: PriceAlert): number {
  const current = alert.lastPrice ?? alert.basePrice;
  const range = alert.basePrice - alert.targetPrice;
  if (range <= 0) return 100;
  const drop = alert.basePrice - current;
  return Math.min(100, Math.max(0, Math.round((drop / range) * 100)));
}

/** Aviasales deeplink for the route */
function bookingUrl(from: string, to: string): string {
  const marker = "714947";
  return `https://www.aviasales.com/search/${from}1${to}1?marker=${marker}`;
}

// ─── Email template ──────────────────────────────────────────────────────────

function buildDigestHtml(email: string, alerts: PriceAlert[]): string {
  const manageUrl = `${BASE_URL}/alertes`;

  const alertRows = alerts
    .map((alert) => {
      const current = alert.lastPrice ?? alert.basePrice;
      const pct = progressPct(alert);
      const barColor = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#3b82f6";
      const isTriggered = current <= alert.targetPrice;
      const unsubUrl = `${BASE_URL}/api/alerts/unsubscribe?id=${alert.id}`;

      return `
        <div style="background:#1a1a2e;border-radius:12px;padding:16px;margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
            <div>
              <p style="margin:0;font-size:14px;font-weight:700;color:#e2e8f0;">
                ${alert.from} → ${alert.to}
              </p>
              <p style="margin:2px 0 0;font-size:11px;color:#64748b;">
                ${CABIN_LABELS[alert.cabin]}
              </p>
            </div>
            <div style="text-align:right;">
              <p style="margin:0;font-size:18px;font-weight:900;color:${isTriggered ? "#10b981" : "#e2e8f0"};">
                $${current}
              </p>
              <p style="margin:0;font-size:10px;color:#64748b;">
                cible : $${alert.targetPrice}
              </p>
            </div>
          </div>

          <!-- Progress bar -->
          <div style="background:#0f172a;border-radius:99px;height:6px;margin-bottom:8px;overflow:hidden;">
            <div style="background:${barColor};height:6px;width:${pct}%;border-radius:99px;transition:width 0.3s;"></div>
          </div>
          <p style="margin:0 0 10px;font-size:11px;color:#64748b;">
            ${isTriggered
              ? "🎉 Prix sous le seuil — alerte déjà envoyée !"
              : `${pct}% vers l'objectif · ref. $${alert.basePrice}`}
          </p>

          <a href="${bookingUrl(alert.from, alert.to)}"
             style="display:inline-block;background:#1e3a5f;color:#94a3b8;text-decoration:none;padding:8px 14px;border-radius:8px;font-size:12px;border:1px solid #2d4a6f;">
            Rechercher ce vol →
          </a>
        </div>
      `;
    })
    .join("");

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;background:#0a0a0f;color:#e2e8f0;border-radius:16px;overflow:hidden;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#1e3a5f,#0a0a1a);padding:24px;text-align:center;">
        <h1 style="margin:0;font-size:24px;"><span style="color:#3b82f6;">KE</span><span style="color:#e2e8f0;">ZA</span></h1>
        <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Récap hebdomadaire</p>
      </div>

      <!-- Body -->
      <div style="padding:24px;">
        <p style="margin:0 0 20px;font-size:15px;color:#e2e8f0;font-weight:600;">
          Tes alertes cette semaine ✈
        </p>

        ${alertRows}

        <a href="${manageUrl}"
           style="display:block;text-align:center;background:#1e3a5f;color:#94a3b8;text-decoration:none;padding:12px;border-radius:12px;font-size:13px;border:1px solid #2d4a6f;margin-top:8px;">
          Gérer toutes mes alertes →
        </a>
      </div>

      <!-- Footer -->
      <div style="padding:16px 24px;border-top:1px solid #1e293b;text-align:center;">
        <p style="margin:0;font-size:10px;color:#334155;">
          Tu reçois cet email car tu as des alertes actives sur KEZA.
        </p>
      </div>
    </div>
  `;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET && !isVercelCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const routes = await getAllActiveRoutes();

  // Collect all active alerts grouped by email
  const alertsByEmail = new Map<string, PriceAlert[]>();

  for (const routeKey of routes) {
    const [from, to] = routeKey.split(":");
    if (!from || !to) continue;
    const alerts = await getAlertsByRoute(from, to);
    for (const alert of alerts) {
      if (!alert.active) continue;
      const existing = alertsByEmail.get(alert.email) ?? [];
      existing.push(alert);
      alertsByEmail.set(alert.email, existing);
    }
  }

  // Send one digest per email (skip if sent recently)
  const { Resend } = require("resend") as { Resend: new (key?: string) => { emails: { send: (p: Record<string, unknown>) => Promise<unknown> } } };
  const resend = new Resend(process.env.RESEND_API_KEY);

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [email, alerts] of alertsByEmail) {
    // Anti-duplicate check
    const lastSent = await redis.get(DIGEST_LAST_KEY(email));
    if (lastSent) { skipped++; continue; }

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `✈ Tes ${alerts.length} alerte${alerts.length > 1 ? "s" : ""} prix cette semaine | KEZA`,
        html: buildDigestHtml(email, alerts),
      });
      // Mark as sent (TTL 6 days)
      await redis.set(DIGEST_LAST_KEY(email), "1", { ex: DIGEST_COOLDOWN_SEC });
      sent++;
    } catch (err) {
      errors.push(`${email}: ${(err as Error).message}`);
    }
  }

  return NextResponse.json({
    ok: true,
    totalEmails: alertsByEmail.size,
    sent,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
    ts: new Date().toISOString(),
  });
}
```

- [ ] **Step 3 : Vérifier TypeScript**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx tsc --noEmit && echo "TSC OK"
```

Attendu : `TSC OK`

- [ ] **Step 4 : Vérifier que les tests passent**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx jest --no-coverage 2>&1 | tail -5
```

Attendu : tests passent

- [ ] **Step 5 : Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza && git add app/api/cron/digest/route.ts && git commit -m "feat: add weekly alert digest cron (GET /api/cron/digest)"
```

---

## Task 2 : Ajouter le cron dans `vercel.json`

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1 : Mettre à jour `vercel.json`**

Remplacer le contenu entier par :

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
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/digest",
      "schedule": "0 10 * * 0"
    }
  ]
}
```

`"0 10 * * 0"` = chaque dimanche à 10h UTC.

- [ ] **Step 2 : Vérifier TypeScript**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx tsc --noEmit && echo "TSC OK"
```

- [ ] **Step 3 : Vérifier que les tests passent**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx jest --no-coverage 2>&1 | tail -5
```

- [ ] **Step 4 : Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza && git add vercel.json && git commit -m "chore: add weekly digest cron (sundays 10h UTC)"
```

---

## Task 3 : Push + validation

- [ ] **Step 1 : Pousser la branche**

```bash
cd /Users/DIALLO9194/Downloads/keza && git push -u origin feat/weekly-digest
```

- [ ] **Step 2 : Tester manuellement**

```bash
cd /Users/DIALLO9194/Downloads/keza && curl -s -X GET http://localhost:3000/api/cron/digest \
  -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2)" | python3 -m json.tool
```

Attendu : `{ "ok": true, "totalEmails": N, "sent": N, "skipped": 0 }`

- [ ] **Step 3 : Merger sur main**

```bash
cd /Users/DIALLO9194/Downloads/keza && git checkout main && git merge feat/weekly-digest --no-edit && git push origin main
```
