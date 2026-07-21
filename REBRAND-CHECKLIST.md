# Rebrand checklist — Keza → Xalifly

Working branch: `rebrand/xalifly` (isolated worktree, **not merged to `main`, not deployed**).

## ✅ Done on this branch

- [x] `lib/brand.ts` created — single source of truth for the brand name and migration status
- [x] `lib/siteConfig.ts` — fallback `SITE_URL` now points at the real working URL (`keza-taupe.vercel.app`) instead of the broken `keza.app`. Still env-driven via `NEXT_PUBLIC_APP_URL`.
- [x] `package.json` name → `xalifly`
- [x] `app/mentions-legales/page.tsx` — brand mentions renamed; **entity name line deliberately left as "KEZA Inc." with a `TODO` comment** (see below)
- [x] `app/confidentialite/page.tsx` — brand mentions renamed, email domain untouched
- [x] 91 app/component/lib files — display text ("KEZA"/"Keza" in titles, JSX, metadata, OG tags, structured data) renamed to "Xalifly". Env var **names** and email **domains** deliberately left untouched — see below.
- [x] `components/Header.tsx` — the navbar logo mark (missed by the first sweep, caught in review): `"KE"`/`"ZA"` split-color span → `"Xali"`/`"fly"`, consistent with the hero logo mark elsewhere.
- [x] `__tests__/components/Header.test.tsx` updated to match.
- [x] **Verification: `npx tsc --noEmit` clean, `npx eslint` clean on all 96 changed files, full Jest suite green — 1881 passed, 0 failed, 13 skipped (live-API suites, unrelated to this branch).** `npm run build` running as final check.
- [x] 96 files changed total, +346/-334 lines — a pure rename, no logic changes.

## ⏳ Blocked on you — cannot be done from inside the codebase

1. **Buy `xalifly.com`** (or your preferred TLD from the shortlist). I cannot execute a purchase — real money, real registrar account.
2. **Confirm the legal entity name.** `app/mentions-legales/page.tsx` still says "Éditeur : KEZA Inc." — marked with a `TODO(rebrand)` comment at that exact line. Tell me the real registered name (or confirm "Xalifly Inc." is correct) and I'll update it — this is a legal document, so it's the one piece of text on this whole branch I refused to guess.
3. **DNS + email deliverability.** Once the domain is bought:
   - Point DNS at Vercel (custom domain on the existing Vercel project, or add it as an alias)
   - Configure SPF/DKIM/DMARC for `xalifly.com` in Resend (dashboard: resend.com/domains) — **do this before flipping any `@keza.app` address to `@xalifly.com`**, or transactional emails (price alerts, Pro receipts) will bounce or land in spam
   - Once verified, update `lib/brand.ts`'s `EMAIL_DOMAIN` and the handful of hardcoded `contact@keza.app` / `alerts@keza.app` strings (list below)
4. **Set `NEXT_PUBLIC_APP_URL=https://xalifly.com`** in Vercel project settings once DNS is live. No code change needed for this part — `lib/siteConfig.ts` already reads it.
5. **Third-party dashboards** (no API access from here, need your login):
   - **Sentry** — project is currently `kezza/keza`. Rename in Sentry settings, or create a new project and swap `SENTRY_DSN`/`SENTRY_AUTH_TOKEN`.
   - **Plausible Analytics** — the script in `app/layout.tsx` is tied to a specific site ID (`pa--f94oxZFO8yrXtN46QpIJ`) registered for the old domain. Add `xalifly.com` as a new site in Plausible and swap the script tag.
   - **Vercel project** — currently named "keza" in the dashboard; purely cosmetic to rename, doesn't block anything.
   - **GitHub repo** — currently `elzzoo/keza`. Renaming is optional (GitHub auto-redirects the old name), your call.
6. **Trademark search** — I checked domain availability (RDAP) and did a basic web search for existing products/companies named "Xalifly" (nothing found), but I have no access to INPI/USPTO trademark databases. Do this before filing anything.
7. **Social handles** (Instagram/X/TikTok/LinkedIn) — not checked, outside my tool access.
8. **Logo / visual identity** — this branch only touches text. No new logo, favicon, or app icon has been made.

## Left deliberately untouched (do not blindly rename later either)

- **Env var names** — `KEZA_EMAIL_SENDER`, `KEZA_ADMIN_TOKEN` (or similar) are real Vercel env vars already configured in production. Renaming the *identifier* in code without also renaming it in Vercel's dashboard would silently break whatever they control. If you want to rename these too, do both sides together, deliberately, separate from this branch.
- **Email addresses** (`contact@keza.app`, `alerts@keza.app`, `hello@keza.app`, `privacy@keza.app`, `noreply@keza.app`) — see blocked item #3 above.
- **Redis cache key prefix** (`keza:v30:...` in the search cache) — internal only, zero user-facing impact. Renaming it just forces a one-time cold cache; harmless but pointless to do before the rest of the cutover is ready. Bump it as part of the final cutover if you want a clean break.
- **`e2e/*.spec.ts` test files** — lower priority, cosmetic test descriptions only, not done on this pass.

## How to ship this once you're ready

1. Confirm the entity name (item #2) — I'll make that one edit.
2. Buy the domain, configure DNS + email (items #1, #3, #4).
3. Update the third-party dashboards (item #5).
4. Tell me to merge `rebrand/xalifly` → `main` and push — I'll re-run the full test suite one more time against whatever's changed on `main` since this branch was cut, resolve any conflicts, and deploy.

Until then, this branch sits untouched and `main`/production keep running under the Keza name — nothing here is live.
