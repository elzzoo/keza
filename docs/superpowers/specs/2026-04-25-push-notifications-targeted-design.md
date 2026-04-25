# Push Notifications — Targeted Design

## Contexte

Le système de push notifications KEZA est à 95% implémenté (VAPID, Redis, SW, API subscribe, cron). Le seul problème : les subscriptions sont anonymes et `sendPushToAll()` broadcastait à tous les abonnés quelle que soit l'alerte déclenchée. Ce spec corrige cela.

**Objectif :** envoyer le push uniquement à l'utilisateur dont l'alerte prix vient de se déclencher — même trigger que l'email (prix ≤ cible).

**Scope :** activation uniquement depuis `/alertes` (email disponible via magic link). Pas de banner homepage.

---

## Architecture

### Data model Redis

**Avant :** un Set global `keza:push:subscriptions` avec des objets anonymes `{endpoint, keys}`.

**Après :** un Set **par email** :

```
keza:push:subs:{email_lowercase}  →  Set of JSON strings: "{endpoint, keys}"
```

- TTL : 90 jours (aligné sur les alertes, auto-expiration)
- Déduplication native par Redis Set (même endpoint ne peut pas être ajouté deux fois)
- Suppression du Set global `keza:push:subscriptions`

### Sécurité

Toute opération sur `keza:push:subs:{email}` exige un token validé par `verifyManageAlertsToken(email, token)` — même mécanique que `GET /api/alerts` et `DELETE /api/alerts`. Sans token valide : 401.

---

## Composants

### `lib/push.ts` — 4 nouvelles fonctions

| Fonction | Rôle |
|---|---|
| `savePushSubscriptionForEmail(email, sub)` | `sadd keza:push:subs:{email}`, TTL 90j |
| `getPushSubscriptionsForEmail(email)` | `smembers` + parse JSON, ignore malformed |
| `removePushSubscriptionForEmail(email, endpoint)` | `srem` du JSON matchant l'endpoint |
| `sendPushToEmail(email, payload)` | Fetch subs de cet email → `webpush.sendNotification()` pour chacune, auto-remove sur 410/404 |

`sendPushToAll()` est dépréciée (supprimée ou marquée `@deprecated`).

### `POST /api/push/subscribe`

**Body :** `{ subscription: PushSubscription, email: string, token: string }`

**Flux :**
1. Valide `email` format + `verifyManageAlertsToken(email, token)` → 401 si invalide
2. Valide `subscription.endpoint` (HTTPS) + présence `keys.p256dh` + `keys.auth`
3. Rate-limit : 20 req/heure/IP
4. `savePushSubscriptionForEmail(email, subscription)`
5. Retourne `201 { ok: true }`

### `DELETE /api/push/unsubscribe` *(nouveau)*

**Query params :** `?email=xxx&token=yyy&endpoint=zzz`

**Flux :**
1. Valide token → 401 si invalide
2. `removePushSubscriptionForEmail(email, endpoint)`
3. Retourne `200 { ok: true }`

Rate-limit : 20 req/heure/IP.

### `/api/cron/alerts` — changement minimal

Remplace :
```ts
sendPushToAll({ title: "...", body: "..." })
```

Par :
```ts
sendPushToEmail(alert.email, {
  title: `✈ Prix atteint — ${alert.from} → ${alert.to}`,
  body: `$${current} — votre cible de $${alert.targetPrice} est atteinte !`,
  url: `${BASE_URL}/alertes?email=${encodeURIComponent(alert.email)}&token=${manageToken}`
})
```

Chaque utilisateur reçoit sa propre notification avec les détails de son alerte.

### `PushAlertButton.tsx` — enrichissement

Props ajoutées : `token: string` (déjà disponible dans l'URL de `/alertes`).

Trois états UI :
- **`idle`** : bouton "🔔 Activer les notifications"
- **`subscribed`** : "✓ Notifications activées" + bouton discret "Désactiver"
- **`denied`** : message "Permission refusée — activez-la dans les réglages de votre navigateur"

L'état est persisté en `localStorage` (clé `keza:push:status:{email}`) pour éviter de re-demander la permission à chaque visite.

Le POST envoie `{ subscription, email, token }`.
Le DELETE (désactivation) envoie `endpoint` + `email` + `token`.

### `PushNotifBanner.tsx` — supprimée

Le banner homepage est retiré (sans email, impossible de cibler). Le fichier est supprimé et ses imports dans `app/page.tsx` retirés.

### `public/sw.js` — payload enrichi

Le handler `push` utilise `event.data.json()` pour extraire `{ title, body, url }`. Le click sur la notification navigue vers `url` (qui inclut le `?email=...&token=...` pour ouvrir directement la page de gestion des alertes de l'utilisateur).

---

## Flux complet

```
/alertes (magic link)
  → PushAlertButton visible avec email + token
  → User clique "Activer"
  → Notification.requestPermission()
  → navigator.serviceWorker.register('/sw.js')
  → pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC })
  → POST /api/push/subscribe { subscription, email, token }
  → savePushSubscriptionForEmail(email, subscription)
  → 201 OK — bouton passe à l'état "subscribed"

cron 8h UTC
  → /api/cron/alerts vérifie tous les prix
  → prix ≤ cible pour user@example.com
  → sendAlertEmail(alert) + sendPushToEmail("user@example.com", payload)
  → getPushSubscriptionsForEmail("user@example.com")
  → webpush.sendNotification(sub, payload) pour chaque device
  → auto-remove si 410/404 (subscription expirée)

User reçoit notif push
  → SW affiche "✈ Prix atteint — DKR → CDG — $312"
  → Click → navigate vers /alertes?email=...&token=...
```

---

## Tests

- `lib/push.test.ts` : ajouter tests pour `savePushSubscriptionForEmail`, `getPushSubscriptionsForEmail`, `removePushSubscriptionForEmail`, `sendPushToEmail`
- `api/push-subscribe.test.ts` : ajouter tests validation email+token (401 sans token, 201 avec token valide)
- `api/push-unsubscribe.test.ts` : nouveau fichier — 200 sur DELETE valide, 401 sans token

---

## Non-périmètre

- Notifications pour les updates de prix non-critiques (>50% du chemin) — décidé hors scope
- Banner homepage — supprimé
- Analytics de delivery push — hors scope (déjà dans les logs Sentry)
- Plusieurs devices par utilisateur — supporté nativement (Set Redis, pas de limite explicite)
