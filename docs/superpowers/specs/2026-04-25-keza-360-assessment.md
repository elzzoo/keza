# KEZA 360° Assessment — Action Plan

> **Scope:** Pre-launch integrity pass. Fixes critical trust/credibility issues and lays
> the foundation for sustainable growth. Not a feature sprint — a honesty sprint.

**Date:** 2026-04-25  
**Context:** App is pre-launch, personal use only, 0 real B2B clients, affiliation + SaaS B2B + freemium revenue model planned.

---

## Assessment Findings Summary

### What's Already Good ✅

- Analytics **are** wired: `trackBookClick` (FlightCard), `trackSearch` (SearchForm), `trackAlertCreated` (PriceAlertForm), `trackAlertDeleted` (AlertesClient), `trackDealsFilter` + `trackDealShare` (DealsPageClient)
- Redis race conditions fixed (D2 — atomic SET ops)
- OG images added to all major pages (S27)
- Unit tests cover validate.ts (22 tests)
- CI stable: E2E soft-fail, Node 20 warnings suppressed
- Push notifications, magic-link alert management, PWA manifest — all functional

---

## P0 — Fix Before Any Public Sharing

### P0-1: Remove false social proof from B2B page

**Problem:** `app/entreprises/page.tsx` displays fabricated metrics with 0 real clients:
- `spTitle`: "12 entreprises font déjà confiance à KEZA"
- `spSub`: "De la startup au grand groupe, sur 4 continents."
- `m2Value`: "12" / `m2Label`: "entreprises embarquées" (FR) + "companies onboarded" (EN)

If a corporate prospect googles KEZA or asks for references, this destroys credibility instantly. This is the highest-risk item in the entire codebase.

**Fix:** Replace fabricated numbers with honest positioning that still sells:
- Remove the social proof section entirely OR replace with a "Soyez parmi les premiers" (early adopter) framing
- Replace the metric "12 entreprises embarquées" with a real metric (routes analysées, or simply remove)
- Keep the pricing and contact form — they're legitimate

**Files to change:**
- `app/entreprises/page.tsx` — both `fr` and `en` i18n blocks

---

### P0-2: Verify production email sender domain

**Problem:** `RESEND_FROM_EMAIL` env var must point to a verified domain in Resend. If it's still set to a test address or an unverified domain, all alert emails (creation confirmation, manage-link) fail silently.

**Fix:** In Vercel dashboard, confirm:
1. `RESEND_FROM_EMAIL` = `alertes@keza-app.com` (or equivalent real domain)
2. That domain is verified in Resend (DNS records: SPF, DKIM)
3. Send a test alert through the prod UI and confirm delivery + deliverability (no spam folder)

**No code change required** — this is a deploy config verification.

---

## P1 — Pre-Launch Quality

### P1-1: Homepage onboarding copy

**Problem:** A new visitor landing on the homepage has no clear 2-sentence explanation of what KEZA does and who it's for. The hero copy assumes familiarity with miles/points optimization.

**Fix:** Add a brief orienting sentence under or above the SearchForm:
> "KEZA compare le coût réel d'un vol en cash vs en miles — pour chaque programme de fidélité. Trouve l'option la moins chère selon ta situation."

Or English equivalent. Should appear before the search form so users know what they're about to search for.

**Files:**
- `app/page.tsx` or the homepage Hero component

---

### P1-2: Error tracking (Sentry or equivalent)

**Problem:** Currently, API errors, Redis failures, and client-side exceptions are invisible unless the user reports them. With no error tracking, silent failures (failed alert registrations, broken OG image renders, etc.) go undetected.

**Fix:** Integrate Sentry (free tier, sufficient for pre-launch):
1. `npm install @sentry/nextjs`
2. `npx @sentry/wizard@latest -i nextjs` — generates `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
3. Add `SENTRY_DSN` to Vercel env vars
4. Wrap key API routes in try/catch that calls `Sentry.captureException`

**Files:**
- `sentry.client.config.ts` (new)
- `sentry.server.config.ts` (new)
- `next.config.ts` (Sentry plugin)
- `.env.local` + Vercel env (`SENTRY_DSN`)

---

### P1-3: Pick ONE launch target

**Problem:** The app is simultaneously targeting:
- Individual travelers (comparateur, alertes)
- Loyalty program enthusiasts (programmes page)
- Corporate travel managers (entreprises page)

These audiences have different copy needs, different success metrics, and different acquisition channels. Trying to speak to all three pre-launch means speaking clearly to none.

**Decision needed from the founder:**
- **Option A: Individual frequent flyer** — optimize for organic SEO (route-specific pages), Plausible events, alert funnel
- **Option B: Miles enthusiast** — deepen programmes page, add valuations, partner with travel bloggers
- **Option C: Corporate** — remove the B2B page until you have at least 1 paying customer to reference

**Recommendation:** Go with A (individual frequent flyer). It's already the strongest product surface, the alert funnel gives you an email list, and affiliation revenue scales with traffic. The B2B angle can be resurrected after 3 real clients.

**No code change required** — this is a founder decision that should inform all future copy/feature work.

---

## Business Model Assessment

| Model | Readiness | Notes |
|-------|-----------|-------|
| **Affiliation** (Travelpayouts) | ✅ Now | Already integrated. First revenue on day 1. Ceiling ~10–20€/booking. |
| **Freemium consumer** | 🟡 After 100 MAU | Alert + premium features unlock. Needs scale first. |
| **SaaS B2B** | 🔴 Post-PMF only | Long sales cycle. Requires real case studies. Don't fake it. |

**Recommended sequence:**
1. Launch → affiliation revenue + consumer traction
2. 100 active users → introduce freemium tier (unlimited alerts, multi-device, history)
3. First 3 real B2B inquiries → pilot manually, then productize

---

## Implementation Priority Order

1. **P0-1** — Remove false B2B social proof (30 min, high trust impact)
2. **P0-2** — Verify Resend production config (15 min, operational)
3. **P1-1** — Homepage onboarding copy (1h, conversion impact)
4. **P1-2** — Sentry integration (2h, operational visibility)
5. **P1-3** — Commit to one launch target (founder decision, unblocks all marketing copy)

---

## Out of Scope (Backlog)

- Core Web Vitals deep optimization (F2) — after traffic
- Deals page (F1) — after consumer PMF
- Unit tests for alertTokens.ts (T2) — next test sprint
- Carte mondiale (F3) — post-launch feature
