# Backlog Xalifly (KEZA)

> Document vivant. État au 2026-09-16. Items marqués **[Claude — analyse]** viennent de cette session (analyse/proposition uniquement, rien commité). Items marqués **[Codex]** viennent des sprints prod en cours ce soir sur `main`.

## Derniers sprints livrés
- `7bb19ed` — i18n navigation/footer : ajout de `/en/legal`, `/en/privacy`, `/en/entreprises`, correction des liens EN et test Footer.
- Sprint en cours — conformité privacy : aligner les politiques FR/EN avec auth, stockage local et Sentry.

## Backlog proposé par Codex (rappel)
1. Redis namespace par environnement + stratégie backup/export
2. Alerting automatique quand cron health = stale/degraded
3. Nettoyage des `logWarn`/`logError` bruyants
4. Migration progressive des alertes utilisateurs de Redis vers Postgres (démarré)
5. i18n URL réelle `/en` `/fr` + hreflang
6. Continuer à réduire les gros modules UI/data restants

## Nouveaux items — analyse de ce soir

### Bundle
**[Claude — analyse]** Voir résultats détaillés de `ANALYZE=true npm run build` ci-dessous (section Bundle).

### Dette structurelle — fichiers volumineux
**[Claude — analyse]** `lib/globalPrograms.ts` (837 lignes) et `app/admin/page.tsx` (704 lignes) sont les deux plus gros fichiers restants après les extractions moteur. Propositions de découpage détaillées dans `docs/architecture.md` section 5.
Priorité : basse-moyenne. Risque d'implémentation : faible pour `globalPrograms.ts` (fichier de données pures), faible-moyen pour `admin/page.tsx` (extraction de présentation autour d'un fetch de données admin).

### Bug de données trouvé en passant
**[Claude — analyse, corrigé]** `lib/globalPrograms.ts` définissait `"Finnair Plus"` deux fois. Corrigé par Claude dans `f84a88b` avec un test de non-régression (`__tests__/lib/globalPrograms.test.ts`).

## Bundle — résultats `ANALYZE=true npm run build`

**[Claude — analyse]** Build de prod avec `ANALYZE=true` exécuté le 2026-09-16, rapports générés dans `.next/analyze/{client,nodejs,edge}.html` (non commités, ignorés par git). Tailles réelles extraites du blob de données de webpack-bundle-analyzer, pas de la sortie texte de Next (plus précise que le tableau `next build`).

### Chiffres de référence (sortie `next build`)
- First Load JS partagé par toutes les pages : **228 kB**, réparti en 3 chunks (53.4 kB, 39.1 kB, 132 kB) + 3.8 kB divers
- Pages quasi-statiques (mentions légales, confidentialité, robots.txt…) : ~229-230 kB — c'est le vrai plancher incompressible de l'app aujourd'hui
- Pages les plus lourdes : `/destinations/[iata]` (314 kB), `/flights/[route]` et `/en/flights/[route]` (313 kB) — attendu, ce sont les pages avec le moteur de recherche complet (SearchForm, Results, AirportPicker) ; pas une anomalie
- Middleware : 106 kB (edge runtime, calcul CSP/geo/auth par requête)

### Constat n°1 — Sentry Session Replay pesait une part disproportionnée du bundle partagé
`@sentry-internal/replay` apparaît à **120.7 kB** dans un chunk partagé chargé sur *toutes* les pages, plus une portion supplémentaire dupliquée (78.2 kB) dans le bundle `main`. C'est, de loin, la plus grosse dépendance tierce chargée globalement — plus lourde que React-DOM lui-même sur certains découpages.

Vérifié dans `instrumentation-client.ts` : `replaysSessionSampleRate` est déjà à 0.05 (5%) — donc **ce n'est pas un problème de sur-échantillonnage**. Le point important : `Sentry.replayIntegration()` est déclaré statiquement dans le tableau `integrations`, ce qui fait télécharger le code de Replay (~120 kB) à *chaque* visite, que la session soit effectivement enregistrée ou non (le taux de 5% ne contrôle que le déclenchement de l'enregistrement, pas le téléchargement du code). Avec un trafic quasi nul actuellement (0 recherche/jour au dernier relevé), le ratio coût (poids sur 100% des visites) / bénéfice (5% de sessions effectivement rejouées) est défavorable.

**Statut** : corrigé par Claude dans `c207c32` via lazy-loading de Replay. À re-mesurer avec `ANALYZE=true npm run build` lors du prochain audit bundle pour confirmer le gain exact en production.

En passant, `tracesSampleRate: 0.5` (50% des transactions tracées) est notable aussi — pas un problème de poids de bundle, mais un coût de quota Sentry potentiellement élevé pour un trafic aussi faible. À vérifier séparément, hors scope bundle.

Priorité résiduelle : basse — vérifier la capture Replay sur erreur réelle et surveiller le quota Sentry.

### Constat n°2 — `data/programs.ts` et `data/destinations.ts` dupliqués dans plusieurs chunks
`data/programs.ts` (10.3 kB) apparaît identique dans 3 chunks différents (`5295-*.js`, `7233-*.js`, `852-*.js`), et `data/destinations.ts` (8.2 kB) dans 3 autres chunks distincts. Ce sont des modules de données statiques importés par plusieurs pages indépendantes ; Next/webpack ne les a pas hissés dans un chunk commun, donc le même contenu est retéléchargé par des visiteurs qui naviguent d'une page à l'autre plutôt que d'être mis en cache une seule fois.
**Recommandation** : vérifier la config `splitChunks` dans `next.config.mjs` (seuil `minChunks` / `cacheGroups`) — ou plus simple, s'assurer que ces fichiers de données sont importés depuis un point d'entrée commun réutilisé plutôt que ré-importés indépendamment page par page.
Priorité : moyenne — gain réel mais plus petit (~20-30 kB cumulés sur la navigation, pas sur le First Load initial).

### Constat n°3 — `recharts` embarque `@reduxjs/toolkit` + `immer` en interne
`recharts` (utilisé uniquement par `components/dashboard/Charts.tsx`, routes admin `/dashboard/*`) tire avec lui `@reduxjs/toolkit` (11.4 kB) et `immer` (9.1 kB) pour sa gestion d'état interne, en plus de fragments d3 (`d3-shape`, `d3-scale`, `d3-color`…) et de `decimal.js-light` (12.6 kB). Bonne nouvelle : c'est bien isolé dans un chunk dédié (confirmé — les routes `/dashboard/*` ne pèsent que 231-234 kB, quasi le plancher de 228 kB), donc **pas d'impact sur les pages visiteurs**. C'est un constat pour info, pas une urgence : `/dashboard/*` est un outil interne à faible trafic.
Priorité : basse.

### Constat n°4 — `lib/globalPrograms.ts` ne bénéficiera pas en taille d'un découpage en fichiers
Point à clarifier avant d'implémenter le découpage proposé dans `docs/architecture.md` section 5 : les 5 consommateurs actuels importent tous `GLOBAL_PROGRAMS` (le tableau complet) ou `PROGRAMS_BY_NAME`, jamais un sous-ensemble par alliance. Un découpage en plusieurs fichiers avec ré-export via `index.ts` améliore la lisibilité/maintenabilité mais **ne réduira pas la taille du bundle** tant qu'aucun consommateur n'importe seulement une alliance spécifique. Si un futur consommateur n'a besoin que d'une alliance, le découpage proposé permettrait alors un import ciblé et un vrai tree-shaking — mais ce n'est pas le cas aujourd'hui.
Priorité : information à intégrer dans la décision d'implémentation (le découpage reste utile pour la maintenabilité, juste ne pas le vendre comme un gain de performance).
