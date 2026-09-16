# Architecture Xalifly (KEZA)

> Document d'architecture — état au 2026-09-16. Rédigé en analyse seule (pas de code touché) pendant que Codex travaille sur `main` en parallèle sur crons/observabilité/Postgres.

## 1. Vue d'ensemble

Xalifly est un comparateur de vols cash-vs-miles (Next.js 15 App Router, TypeScript, Vercel). Un utilisateur cherche un vol ; le moteur interroge plusieurs fournisseurs de prix cash, calcule le coût équivalent en miles pour ~50 programmes de fidélité, et recommande la meilleure façon de payer.

```
Utilisateur
   │
   ▼
SearchForm (client) ──► /api/search (classique) ou /api/search/stream (SSE)
                              │
                              ▼
                     lib/engine/index.ts (classique)
                     lib/engine/stream.ts (streaming)
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         Duffel API     Travelpayouts    Synthétique
        (temps réel,    (fallback,       (garanties home-
         jamais activé   confiance        carrier, injecté
         en Live — voir   basse)          si absent)
         section 4)
              │               │               │
              └───────┬───────┴───────┬───────┘
                      ▼               ▼
              lib/engine/providers.ts (merge/normalisation — partagé)
                      │
                      ▼
              enrich() — attache les options miles (33+ programmes)
                      │
                      ▼
              lib/engine/scoring.ts (scoring P5.2 — partagé)
              lib/engine/homeCarrierGuarantees.ts (partagé)
              lib/engine/observations.ts (partagé)
                      │
                      ▼
                 FlightResult[] ──► Redis cache (lib/searchCacheKey.ts)
                      │
                      ▼
                 Réponse utilisateur
```

**Changement récent important** : jusqu'à ce soir, `lib/engine/index.ts` (recherche classique) et `lib/engine/stream.ts` (SSE) dupliquaient indépendamment le scoring, les garanties home-carrier, l'enregistrement des observations et le merge des providers. Codex a extrait ces quatre responsabilités dans des modules partagés (`scoring.ts`, `homeCarrierGuarantees.ts`, `observations.ts`, `providers.ts`) avec un test de parité classic/stream (`__tests__/lib/engine-parity.test.ts`). C'est le changement d'architecture le plus significatif du moteur depuis son écriture initiale — les deux chemins de recherche ne peuvent plus diverger silencieusement.

## 2. Couches

| Couche | Rôle | Fichiers clés |
|---|---|---|
| UI | Formulaire de recherche, résultats, alertes, onboarding | `components/`, `app/*/page.tsx` |
| Contexte client | Profil utilisateur, devise, langue — persisté en `localStorage` (`keza_profile`) + sync serveur optionnel si authentifié | `contexts/ProfileContext.tsx`, `lib/userProfile.ts` |
| API routes | Next.js Route Handlers, validation d'entrée, orchestration | `app/api/**/route.ts` |
| Moteur | Fusion multi-provider, scoring, garanties, cache | `lib/engine/` |
| Données statiques | Catalogue des programmes de fidélité, routes, supplements | `lib/globalPrograms.ts`, `lib/engine/supplements.ts` |
| Persistance | Redis (Upstash) — cache recherche, alertes, admin stats, cron state ; Postgres (en cours de migration par Codex pour les alertes prix) | `lib/redis.ts`, `prisma/schema.prisma` |
| Auth | NextAuth (Google) pour compte utilisateur ; secret partagé + cookie signé pour `/admin` | `lib/auth.ts`, `app/api/admin/session/route.ts` |
| Cron | Jobs quotidiens (prewarm, digest, backfill) dispatchés depuis `/api/cron/daily`, état enregistré dans Redis et exposé via `/api/admin/cron/status` | `lib/cronJobs.ts`, `lib/cronState.ts` |

## 3. Ce qui a changé récemment (contexte pour situer ce document)

Sur les dernières 48h, en plus de la convergence moteur ci-dessus, `main` a reçu (par Codex, en autonomie) :
- Durcissement de la validation d'entrée sur `/api/search/stream`, `/api/metrics/redis`, `/api/health/*`, `/api/pro/waitlist`
- Centralisation de l'auth cron (`hasCronSecret`) et de la génération de clé de cache (`lib/searchCacheKey.ts`)
- Observabilité cron : `lib/cronState.ts`, `lib/cronJobs.ts`, route `/api/admin/cron/status`, health synthétique (ok/running/stale/degraded/unknown) affiché dans le dashboard admin
- `/api/version` enrichi (app, version, sha, branch, env, deploymentUrl, buildAt)
- Début de migration des alertes prix de Redis vers Postgres (endpoint de backfill + runbook `docs/PRICE_ALERTS_POSTGRES_RUNBOOK.md`)
- Consolidation de l'onboarding (suppression d'un second système d'onboarding mort, jamais entièrement branché) et simplification de la navigation du Header
- Lazy-loading de Sentry Replay (`c207c32`) pour éviter de charger Replay sur 100% des visites
- Suppression du doublon `Finnair Plus` dans `GLOBAL_PROGRAMS` (`f84a88b`) avec test de non-régression

## 4. Dette technique connue (constat, pas de fix appliqué)

### 4.1 Duffel jamais activé en Live
Le compte Duffel tourne toujours en mode Test (compagnie fictive "Duffel Airways"/ZZ). Aucun prix cash réel n'a jamais transité par le moteur en production. C'est un blocage produit documenté dans l'audit stratégique (voir conversation), pas un problème de code — l'activation nécessite une vérification d'identité (Stripe Connect) côté dashboard Duffel, jamais lancée.

### 4.2 Données programmes
Le doublon `Finnair Plus` précédemment détecté dans `GLOBAL_PROGRAMS` est corrigé (`f84a88b`). Le risque restant sur ce fichier est surtout maintenabilité : le catalogue reste volumineux et manuel, donc les futurs ajouts doivent conserver des tests de non-duplication et de cohérence des partenaires de transfert.

### 4.3 Fichiers volumineux
Deux fichiers dépassent largement la taille confortable pour édition/relecture (voir section 5) :
- `lib/globalPrograms.ts` — 837 lignes, ~53 programmes en un seul tableau
- `app/admin/page.tsx` — 704 lignes, mélange fetch de données + composants de présentation + une page entière de JSX

### 4.4 Bundle — voir section 6

## 5. Propositions de découpage (analyse — non implémentées)

Voir le détail complet dans les propositions séparées ci-dessous. Résumé :

**`lib/globalPrograms.ts`** → éclater en `lib/globalPrograms/{types,bankPointValues,data/*,lookups,index}.ts`, l'`index.ts` ré-exportant tout pour que les 5 fichiers consommateurs existants n'aient rien à changer. Risque très faible : fichier de données pures, aucune logique métier, aucun effet de bord.

**`app/admin/page.tsx`** → extraire les fonctions de fetch (`fetchStats`, `fetchB2BLeads`, `fetchBackupStatus`) dans `app/admin/data.ts`, les helpers de formatage (`formatTtl`, `formatDate`, `cronHealthLabel/Color`) dans `app/admin/format.ts`, et découper le JSX en composants de section (`StatsOverview`, `CronObservability`, `EmailEngagement`, `AffiliateRevenue`, `EngineObservability`, `SystemDetails`, `B2BLeadsTable`) sous `app/admin/sections/`. Le `page.tsx` final devient un orchestrateur fin (~80 lignes) : auth check, fetch parallèle, composition des sections. Risque faible mais non nul : le fichier lit `verifyAdminSessionToken` (auth) — la proposition ne touche pas cette logique, seulement l'extraction de présentation autour, mais Codex traite l'auth ce soir donc ce chantier doit attendre confirmation qu'il n'y touche pas en parallèle.

## 6. Bundle — résultats de l'audit

Voir `BACKLOG.md` section "Bundle" pour les résultats de `ANALYZE=true npm run build` et les recommandations issues de cette analyse.
