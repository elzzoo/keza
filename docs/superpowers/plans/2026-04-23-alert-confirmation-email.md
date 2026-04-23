# Alert Confirmation Email — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Envoyer un email de confirmation quand un utilisateur crée une alerte prix, et rendre le from address configurable via env var pour préparer le passage à un domaine custom (`alerts@keza.app`).

**Architecture:** Deux changements : (1) ajouter `sendAlertConfirmationEmail(alert)` dans `lib/alerts.ts` et extraire `FROM_EMAIL` comme constante depuis `process.env.RESEND_FROM_EMAIL`, (2) appeler la confirmation en fire-and-forget dans `POST /api/alerts/route.ts` après `createAlert` — la réponse API ne doit pas attendre l'email. Aucun nouveau fichier.

**Tech Stack:** Next.js 14 · Resend (déjà installé, `resend@6`) · TypeScript · Redis (Upstash)

---

## Contexte codebase

- `lib/alerts.ts` — 187 lignes. Contient `PriceAlert` interface, fonctions Redis, `getResend()`, `sendPriceDropEmail(alert, newPrice)`. **À modifier.**
- `app/api/alerts/route.ts` — Handler POST/GET/DELETE pour les alertes. **À modifier** (POST uniquement).
- `RESEND_API_KEY` déjà configuré dans Vercel (prod + preview + dev).
- URL de base production : `https://keza-taupe.vercel.app` (hardcodée dans `lib/alerts.ts` ligne 140-141).
- Pattern existant : `sendPriceDropEmail` retourne `Promise<boolean>`, catch l'erreur et log sans throw.

## Fichiers

| Fichier | Action |
|---|---|
| `lib/alerts.ts` | Modifier — ajouter `sendAlertConfirmationEmail`, extraire `FROM_EMAIL` constant, remplacer `from` dans `sendPriceDropEmail` |
| `app/api/alerts/route.ts` | Modifier — fire-and-forget confirmation dans POST handler |

---

## Task 1 : Ajouter `sendAlertConfirmationEmail` + `FROM_EMAIL` dans `lib/alerts.ts`

**Files:**
- Modify: `lib/alerts.ts`

- [ ] **Step 1 : Créer la branche `feat/alert-confirmation`**

```bash
cd /Users/DIALLO9194/Downloads/keza && git checkout -b feat/alert-confirmation
```

Attendu : `Switched to a new branch 'feat/alert-confirmation'`

- [ ] **Step 2 : Extraire `FROM_EMAIL` et l'appliquer dans `sendPriceDropEmail`**

Dans `lib/alerts.ts`, juste avant la fonction `getResend()` (ligne 131), ajouter :

```typescript
// Configurable via RESEND_FROM_EMAIL env var.
// Default: Resend shared domain (dev/test).
// Production: set RESEND_FROM_EMAIL="KEZA Alerts <alerts@keza.app>" in Vercel env vars.
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "KEZA Alerts <onboarding@resend.dev>";
```

Dans `sendPriceDropEmail` (ligne 146), remplacer :
```typescript
      from: "KEZA Alerts <onboarding@resend.dev>",
```
par :
```typescript
      from: FROM_EMAIL,
```

- [ ] **Step 3 : Ajouter `sendAlertConfirmationEmail` à la fin de `lib/alerts.ts`**

Ajouter après la fermeture de `sendPriceDropEmail` (après la ligne 187) :

```typescript
/** Send a confirmation email when a price alert is created. Fire-and-forget — caller should not await if it doesn't need to block. */
export async function sendAlertConfirmationEmail(alert: PriceAlert): Promise<boolean> {
  const manageUrl = `https://keza-taupe.vercel.app/alertes`;
  const unsubUrl  = `https://keza-taupe.vercel.app/api/alerts/unsubscribe?id=${alert.id}`;

  const cabinLabel: Record<PriceAlert["cabin"], string> = {
    economy:  "Économique",
    premium:  "Premium Éco",
    business: "Business",
    first:    "Première",
  };

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_EMAIL,
      to: alert.email,
      subject: `✈ Alerte active : ${alert.from} → ${alert.to} | KEZA`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0f;color:#e2e8f0;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1e3a5f,#0a0a1a);padding:24px;text-align:center;">
            <h1 style="margin:0;font-size:24px;"><span style="color:#3b82f6;">KE</span><span style="color:#e2e8f0;">ZA</span></h1>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Alerte prix</p>
          </div>

          <div style="padding:24px;">
            <p style="margin:0 0 16px;font-size:15px;color:#e2e8f0;font-weight:600;">
              Ton alerte est active ✅
            </p>

            <div style="background:#1a1a2e;border-radius:12px;padding:20px;margin-bottom:16px;">
              <p style="margin:0;font-size:14px;color:#94a3b8;letter-spacing:0.05em;">
                ${alert.from} → ${alert.to} · ${cabinLabel[alert.cabin]}
              </p>
              <p style="margin:10px 0 0;font-size:15px;color:#e2e8f0;">
                On t'écrit dès que le prix descend sous
                <strong style="color:#10b981;">$${alert.targetPrice}</strong>
              </p>
              <p style="margin:6px 0 0;font-size:12px;color:#475569;">
                Prix de référence : $${alert.basePrice} · Seuil : −10 %
              </p>
            </div>

            <a href="${manageUrl}"
               style="display:block;text-align:center;background:#1e3a5f;color:#94a3b8;text-decoration:none;padding:12px;border-radius:12px;font-size:13px;border:1px solid #2d4a6f;">
              Gérer mes alertes →
            </a>
          </div>

          <div style="padding:16px 24px;border-top:1px solid #1e293b;text-align:center;">
            <a href="${unsubUrl}" style="color:#475569;font-size:11px;text-decoration:underline;">
              Se désabonner de cette alerte
            </a>
          </div>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("[alerts] confirmation email failed:", err);
    return false;
  }
}
```

- [ ] **Step 4 : Vérifier TypeScript**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx tsc --noEmit
```

Attendu : aucune erreur

- [ ] **Step 5 : Vérifier que les tests passent**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx jest --no-coverage 2>&1 | tail -5
```

Attendu : 79 passed, 12 total

- [ ] **Step 6 : Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza && git add lib/alerts.ts && git commit -m "feat: add sendAlertConfirmationEmail + configurable FROM_EMAIL via env var"
```

---

## Task 2 : Déclencher la confirmation dans `POST /api/alerts/route.ts`

**Files:**
- Modify: `app/api/alerts/route.ts`

**Contexte :** La route POST crée l'alerte et retourne immédiatement `{ ok: true, alert }`. L'email de confirmation doit être envoyé **sans bloquer la réponse** (fire-and-forget via `.catch(console.error)`).

- [ ] **Step 1 : Importer `sendAlertConfirmationEmail` et déclencher l'envoi**

Dans `app/api/alerts/route.ts`, la ligne courante d'import est :
```typescript
import { createAlert, getAlertsByEmail } from "@/lib/alerts";
```

La remplacer par :
```typescript
import { createAlert, getAlertsByEmail, sendAlertConfirmationEmail } from "@/lib/alerts";
```

Puis, dans le handler POST, trouver le bloc qui retourne la réponse (actuellement) :
```typescript
    const alert = await createAlert({
      email,
      from,
      to,
      cabin: cabin || "economy",
      currentPrice: Number(currentPrice),
    });

    return NextResponse.json({ ok: true, alert }, { status: 201 });
```

Le remplacer par :
```typescript
    const alert = await createAlert({
      email,
      from,
      to,
      cabin: cabin || "economy",
      currentPrice: Number(currentPrice),
    });

    // Fire-and-forget: confirmation email — do not await, must not block the response
    sendAlertConfirmationEmail(alert).catch(console.error);

    return NextResponse.json({ ok: true, alert }, { status: 201 });
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx tsc --noEmit
```

Attendu : aucune erreur

- [ ] **Step 3 : Vérifier que les tests passent**

```bash
cd /Users/DIALLO9194/Downloads/keza && npx jest --no-coverage 2>&1 | tail -5
```

Attendu : 79 passed, 12 total

- [ ] **Step 4 : Commit**

```bash
cd /Users/DIALLO9194/Downloads/keza && git add app/api/alerts/route.ts && git commit -m "feat: send confirmation email on alert creation (fire-and-forget)"
```

---

## Task 3 : Push + validation

**Files:** aucun fichier source

- [ ] **Step 1 : Pousser la branche**

```bash
cd /Users/DIALLO9194/Downloads/keza && git push -u origin feat/alert-confirmation
```

- [ ] **Step 2 : Tester manuellement (optionnel en local)**

```bash
cd /Users/DIALLO9194/Downloads/keza && curl -s -X POST http://localhost:3000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{"email":"ton@email.com","from":"DSS","to":"CDG","cabin":"economy","currentPrice":500}' | python3 -m json.tool
```

Attendu : `{ "ok": true, "alert": { ... } }` + email de confirmation reçu dans la boîte.

- [ ] **Step 3 : Reporter l'URL preview à l'utilisateur**

URL Vercel preview : `https://keza-git-feat-alert-confirmation-elzzoo-6820s-projects.vercel.app`

---

## Note : passer à un domaine custom

Pour remplacer `onboarding@resend.dev` par `alerts@keza.app` en production :

1. Aller sur [resend.com/domains](https://resend.com/domains) → ajouter `keza.app`
2. Ajouter les 3 enregistrements DNS dans le gestionnaire de keza.app (SPF, DKIM, DMARC)
3. Dans Vercel → Settings → Environment Variables → ajouter :
   ```
   RESEND_FROM_EMAIL = KEZA Alerts <alerts@keza.app>
   ```
4. Redéployer. Aucun changement de code nécessaire.
