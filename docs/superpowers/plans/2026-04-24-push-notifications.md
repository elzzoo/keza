# Push Notifications — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compléter le système de push notifications : backend d'abonnement, clés VAPID configurables, envoi automatique lors des baisses de prix.

**Architecture:** Trois couches — (1) `lib/push.ts` : utilitaires VAPID + Redis pour stocker les subscriptions ; (2) `POST /api/push/subscribe` : endpoint qui persiste une PushSubscription reçue du navigateur ; (3) mise à jour du cron `GET /api/cron/alerts` pour envoyer un push à tous les abonnés quand au moins une alerte email est déclenchée. Le composant `PushNotifBanner` existant est mis à jour pour lire la clé publique VAPID depuis `process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY` et appeler l'endpoint.

**Tech Stack:** Next.js 14 · `web-push` (npm, VAPID) · Redis (Upstash, déjà installé) · TypeScript

---

## Contexte codebase

- `components/PushNotifBanner.tsx` — Composant existant avec `VAPID_PUBLIC_KEY = "YOUR_VAPID_PUBLIC_KEY_HERE"` (placeholder) et `// TODO: Send subscription to your backend`. **À modifier** : lire la clé depuis env var, envoyer subscription à l'API.
- `app/api/cron/alerts/route.ts` — Cron existant qui envoie des emails de baisse de prix. Après `if (sent) notified++`, ajouter envoi push fire-and-forget si `notified > 0` en fin de boucle principale. **À modifier**.
- `lib/alerts.ts` — Module Redis existant : `PriceAlert` interface, `FROM_EMAIL`, `BASE_URL`, `getResend()`. **Non modifié** — `lib/push.ts` est un module séparé.
- Redis clés existantes : `keza:alert:{id}`, `keza:alerts:email:{email}`, `keza:alerts:routes`. Nouvelle clé : `keza:push:subscriptions` (Redis Set de JSON strings).
- `web-push` n'est **pas installé** → à ajouter dans les dépendances.

## Génération des clés VAPID

Les clés VAPID sont générées une seule fois et ajoutées dans Vercel. Un script `scripts/generate-vapid.mjs` est fourni pour la génération.

Variables d'environnement requises :
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<clé publique>   # exposée au browser
VAPID_PRIVATE_KEY=<clé privée>                 # serveur uniquement, jamais exposée
VAPID_EMAIL=mailto:contact@keza.app            # identifiant VAPID
```

## Fichiers

| Fichier | Action | Contenu |
|---|---|---|
| `lib/push.ts` | Créer | VAPID setup, save/get subscriptions Redis, sendPushToAll() |
| `app/api/push/subscribe/route.ts` | Créer | POST endpoint pour sauvegarder une PushSubscription |
| `components/PushNotifBanner.tsx` | Modifier | Lire VAPID key depuis env var, appeler `/api/push/subscribe` |
| `app/api/cron/alerts/route.ts` | Modifier | Envoyer push fire-and-forget si alertes déclenchées |
| `scripts/generate-vapid.mjs` | Créer | Script Node.js pour générer les clés VAPID |

---

## Task 1 : `lib/push.ts` + `POST /api/push/subscribe`

**Files:**
- Create: `lib/push.ts`
- Create: `app/api/push/subscribe/route.ts`

- [ ] **Step 1 : Vérifier la branche**

```bash
cd /Users/DIALLO9194/Downloads/keza && git branch --show-current
```

Attendu : `feat/push-notif`

- [ ] **Step 2 : Installer `web-push` et ses types**

```bash
cd /Users/DIALLO9194/Downloads/keza && npm install web-push && npm install --save-dev @types/web-push && echo "INSTALLED"
```

Attendu : `INSTALLED`

- [ ] **Step 3 : Créer `lib/push.ts`**

```typescript
import "server-only";
import { redis } from "./redis";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PushSubscriptionRecord {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// ─── Redis key ──────────────────────────────────────────────────────────────

const PUSH_SUBS_KEY = "keza:push:subscriptions";

// ─── VAPID setup ────────────────────────────────────────────────────────────

function getWebPush() {
  // Dynamic require so web-push is only loaded server-side
  const webpush = require("web-push") as typeof import("web-push");
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL ?? "mailto:contact@keza.app";

  if (!publicKey || !privateKey) {
    throw new Error("[push] VAPID keys not configured — set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY");
  }

  webpush.setVapidDetails(email, publicKey, privateKey);
  return webpush;
}

// ─── Subscription storage ───────────────────────────────────────────────────

/** Persist a push subscription from the browser. Deduplicates by endpoint. */
export async function savePushSubscription(sub: PushSubscriptionRecord): Promise<void> {
  await redis.sadd(PUSH_SUBS_KEY, JSON.stringify(sub));
}

/** Retrieve all stored push subscriptions. */
export async function getPushSubscriptions(): Promise<PushSubscriptionRecord[]> {
  const raw = await redis.smembers(PUSH_SUBS_KEY);
  const subs: PushSubscriptionRecord[] = [];
  for (const item of raw) {
    try {
      subs.push(JSON.parse(item as string) as PushSubscriptionRecord);
    } catch {
      // Skip malformed entries
    }
  }
  return subs;
}

/** Remove a subscription that is no longer valid (endpoint gone). */
export async function removePushSubscription(endpoint: string): Promise<void> {
  const subs = await getPushSubscriptions();
  const toRemove = subs.find((s) => s.endpoint === endpoint);
  if (toRemove) {
    await redis.srem(PUSH_SUBS_KEY, JSON.stringify(toRemove));
  }
}

// ─── Send notifications ──────────────────────────────────────────────────────

export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

/**
 * Send a push notification to all stored subscriptions.
 * Invalid subscriptions (gone endpoints) are automatically removed.
 * Returns number of successful sends.
 */
export async function sendPushToAll(payload: PushPayload): Promise<number> {
  const subs = await getPushSubscriptions();
  if (subs.length === 0) return 0;

  let webpush: ReturnType<typeof getWebPush>;
  try {
    webpush = getWebPush();
  } catch {
    // VAPID keys not configured — skip silently
    return 0;
  }

  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        sub as Parameters<typeof webpush.sendNotification>[0],
        JSON.stringify(payload),
        { TTL: 86400 } // 24h TTL
      );
      sent++;
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 410 || status === 404) {
        // Subscription expired — clean up
        await removePushSubscription(sub.endpoint).catch(() => {});
      }
      // Other errors: log and continue
      console.error("[push] sendNotification failed:", (err as Error).message);
    }
  }

  return sent;
}
```

- [ ] **Step 4 : Créer `app/api/push/subscribe/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { savePushSubscription, type PushSubscriptionRecord } from "@/lib/push";

// POST /api/push/subscribe — save a Web Push subscription from the browser
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate structure
    if (
      typeof body?.endpoint !== "string" ||
      typeof body?.keys?.p256dh !== "string" ||
      typeof body?.keys?.auth !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid subscription object" },
        { status: 400 }
      );
    }

    const sub: PushSubscriptionRecord = {
      endpoint: body.endpoint,
      keys: {
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
      },
    };

    await savePushSubscription(sub);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[api/push/subscribe] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 5 : Créer `scripts/generate-vapid.mjs`**

```mjs
// scripts/generate-vapid.mjs
// Usage: node scripts/generate-vapid.mjs
// Generates VAPID key pair to add to Vercel environment variables.

import { generateVAPIDKeys } from "web-push";

const keys = generateVAPIDKeys();

console.log("\n✅ VAPID Keys generated — add these to Vercel env vars:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_EMAIL=mailto:contact@keza.app`);
console.log("\n⚠️  VAPID_PRIVATE_KEY must be kept secret — never commit it.\n");
```

- [ ] **Step 6 : Vérifier TypeScript**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx tsc --noEmit && echo "TSC OK"
```

Attendu : `TSC OK`

- [ ] **Step 7 : Vérifier que les tests passent**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx jest --no-coverage 2>&1 | tail -5
```

Attendu : tests passent

- [ ] **Step 8 : Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza && git add lib/push.ts app/api/push/subscribe/route.ts scripts/generate-vapid.mjs package.json package-lock.json && git commit -m "feat: add push notification backend (lib/push.ts, POST /api/push/subscribe)"
```

---

## Task 2 : Mettre à jour `PushNotifBanner` + cron

**Files:**
- Modify: `components/PushNotifBanner.tsx`
- Modify: `app/api/cron/alerts/route.ts`

**Contexte :**
- `PushNotifBanner` a `VAPID_PUBLIC_KEY = "YOUR_VAPID_PUBLIC_KEY_HERE"` → lire depuis `process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Si la variable n'est pas définie (dev), ne pas afficher la bannière.
- Le TODO `// TODO: Send subscription to your backend` doit appeler `POST /api/push/subscribe`.
- Le cron envoie des emails, puis doit envoyer un push global fire-and-forget **une seule fois en fin de boucle** si `notified > 0`.

- [ ] **Step 1 : Mettre à jour `components/PushNotifBanner.tsx`**

Remplacer le fichier entier par :

```tsx
"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "keza_push_enabled";
const DISMISSED_KEY = "keza_push_dismissed";

// Read VAPID public key from env (set NEXT_PUBLIC_VAPID_PUBLIC_KEY in Vercel).
// If not set, the banner will not appear.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotifBanner({ lang }: { lang: "fr" | "en" }) {
  const [visible, setVisible] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Hide if VAPID key not configured
    if (!VAPID_PUBLIC_KEY) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission === "granted" && localStorage.getItem(STORAGE_KEY) === "true") return;
    if (Notification.permission === "denied") return;
    if (localStorage.getItem(DISMISSED_KEY) === "true") return;

    setVisible(true);
  }, []);

  const handleEnable = async () => {
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setVisible(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      });

      // Send subscription to backend
      const raw = subscription.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: raw.endpoint,
          keys: {
            p256dh: raw.keys?.p256dh ?? "",
            auth: raw.keys?.auth ?? "",
          },
        }),
      });

      localStorage.setItem(STORAGE_KEY, "true");
      setVisible(false);
    } catch (err) {
      console.error("[KEZA] Push subscription failed:", err);
    } finally {
      setSubscribing(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between gap-3 animate-fade-up">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg">
          {lang === "fr"
            ? "Recevez des alertes de baisse de prix en temps réel"
            : "Get real-time price drop alerts"}
        </p>
        <p className="text-xs text-muted mt-0.5">
          {lang === "fr"
            ? "Soyez notifié quand un vol que vous suivez baisse de prix."
            : "Get notified when a flight you track drops in price."}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleEnable}
          disabled={subscribing}
          className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {subscribing
            ? "..."
            : lang === "fr"
              ? "Activer les notifications"
              : "Enable notifications"}
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-surface transition-colors"
          aria-label={lang === "fr" ? "Fermer" : "Dismiss"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Mettre à jour `app/api/cron/alerts/route.ts`**

Ajouter `sendPushToAll` dans les imports :

```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  getAllActiveRoutes,
  getAlertsByRoute,
  updateAlertAfterCheck,
  sendPriceDropEmail,
} from "@/lib/alerts";
import { sendPushToAll } from "@/lib/push";
import { fetchCalendarPrices } from "@/lib/engine";
```

Puis, juste avant le `return NextResponse.json({...})` final, ajouter le push fire-and-forget :

```typescript
  // Fire-and-forget push notification if any email was sent this run
  if (notified > 0) {
    sendPushToAll({
      title: "KEZA — Baisse de prix ✈",
      body: lang === "fr"
        ? `${notified} baisse${notified > 1 ? "s" : ""} de prix détectée${notified > 1 ? "s" : ""}. Vérifiez vos alertes.`
        : `${notified} price drop${notified > 1 ? "s" : ""} detected. Check your alerts.`,
      url: "/alertes",
    }).catch((err: unknown) => console.error("[cron/alerts] push failed:", err));
  }

  return NextResponse.json({
```

**Note importante :** La variable `lang` n'existe pas dans le cron — c'est une erreur du plan. Utiliser directement du texte français + anglais inline ou une string simple. Remplacer le bloc push par :

```typescript
  // Fire-and-forget push notification if any email was sent this run
  if (notified > 0) {
    sendPushToAll({
      title: "KEZA — Baisse de prix ✈",
      body: `${notified} baisse${notified > 1 ? "s" : ""} de prix détectée${notified > 1 ? "s" : ""}`,
      url: "/alertes",
    }).catch((err: unknown) => console.error("[cron/alerts] push failed:", err));
  }

  return NextResponse.json({
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
cd /Users/DIALLO9194/Downloads/keza && git add components/PushNotifBanner.tsx app/api/cron/alerts/route.ts && git commit -m "feat: wire push notifications — env-var VAPID key, subscribe endpoint, cron integration"
```

---

## Task 3 : Push + validation

- [ ] **Step 1 : Pousser la branche**

```bash
cd /Users/DIALLO9194/Downloads/keza && git push -u origin feat/push-notif
```

- [ ] **Step 2 : Générer les clés VAPID et les configurer**

```bash
cd /Users/DIALLO9194/Downloads/keza && node scripts/generate-vapid.mjs
```

Copier les 3 variables dans Vercel → Settings → Environment Variables → Production + Preview + Development.

- [ ] **Step 3 : Tester en local**

```bash
cd /Users/DIALLO9194/Downloads/keza && NEXT_PUBLIC_VAPID_PUBLIC_KEY=<ta_clé> VAPID_PRIVATE_KEY=<ta_clé> npm run dev
```

Ouvrir http://localhost:3000 → la bannière "Activer les notifications" doit apparaître → cliquer → permission navigateur → s'abonner. Vérifier dans Vercel Logs ou en appelant `/api/cron/alerts` manuellement.

- [ ] **Step 4 : Reporter l'URL preview**

URL Vercel preview : `https://keza-git-feat-push-notif-elzzoo-6820s-projects.vercel.app`

---

## Note : Configuration VAPID dans Vercel

Après déploiement, ajouter dans Vercel → Settings → Environment Variables :

| Variable | Scope | Valeur |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Production + Preview + Development | sortie du script |
| `VAPID_PRIVATE_KEY` | Production + Preview + Development | sortie du script — **confidentiel** |
| `VAPID_EMAIL` | Production + Preview + Development | `mailto:contact@keza.app` |

La bannière n'apparaîtra qu'une fois `NEXT_PUBLIC_VAPID_PUBLIC_KEY` configuré.
