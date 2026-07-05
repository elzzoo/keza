# KEZA P1: Miles Alert MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build email-based miles alerts so users are notified when a route reaches their target CPP (cents-per-point) threshold.

**Architecture:** Redis stores email+route+program+threshold subscriptions. Daily Inngest cron searches flights on subscribed routes, compares best CPP vs threshold, sends email via Resend when threshold is met (max 1x/24h per alert). UI adds "Set Alert" button to FlightCard + manage page at /miles-alerts for viewing/deleting subscriptions.

**Tech Stack:** TypeScript, Next.js 15 App Router, Redis (Upstash), Inngest, Resend, Jest testing.

---

## Task 1: Core CRUD Library (lib/miles-alerts.ts)

**Files:**
- Create: `lib/miles-alerts.ts`
- Test: `__tests__/lib/miles-alerts.test.ts`

**Context:** This task creates the foundational CRUD operations for miles alerts. All other tasks depend on this library.

**Implementation:** TDD approach - write failing tests first, then implement minimal code to pass. Tests should cover create, get, deactivate, and 24-hour cooldown logic.

**Key Points:**
- Use Redis with `keza:miles-alert:email:route:program` key format
- Implement 24-hour cooldown via `lastFiredAt` timestamp
- All functions should be async and handle JSON serialization

---

## Task 2: Miles Alerts API (app/api/miles-alerts/route.ts)

**Files:**
- Create: `app/api/miles-alerts/route.ts`
- Test: `__tests__/api/miles-alerts.test.ts`

**Context:** HTTP API endpoints for setting, retrieving, and deleting alerts. No authentication required (email-only).

**Implementation:** 
- POST /api/miles-alerts - Create new alert (validate email, route, program, thresholdCpp)
- GET /api/miles-alerts?email=... - Retrieve all alerts for user
- DELETE /api/miles-alerts - Delete specific alert by alertId

**Validation:**
- Email must be valid
- thresholdCpp must be 0.1-10 (cents per point)
- All fields required except lastFiredAt

---

## Task 3: Inngest Cron Job (lib/inngest-miles-alerts.ts)

**Files:**
- Create: `lib/inngest-miles-alerts.ts`
- Modify: `lib/inngest.ts`
- Test: `__tests__/inngest/miles-alerts.test.ts`

**Context:** Daily cron job that runs at 8am UTC. Fetches all alerts, searches for deals on subscribed routes, sends emails when threshold met.

**Implementation:**
1. Fetch all alerts from Redis (key pattern: keza:miles-alert:*)
2. Group by email
3. For each alert, run searchEngine() on the route
4. Find best CPP for the requested program
5. If best CPP <= threshold AND cooldown passed: send email
6. Update lastFiredAt to prevent spam

**Key Logic:**
- `shouldFireAlert()` prevents re-firing within 24 hours
- Error handling: continue to next alert on search failure
- Logging: track checked alerts and emails sent

---

## Task 4: Resend Email Template (lib/resend-client.ts)

**Files:**
- Create: `lib/resend-client.ts`

**Context:** Send formatted email notifications when miles deals are found.

**Email Details:**
- From: alerts@keza.app
- Subject: "Great deal! {route} via {program} — {cpp}cpp"
- HTML template with flight details, award cost, and links

**Template Includes:**
- Route, program, CPP (with threshold comparison)
- Award cost (miles + cash)
- Search link: https://keza.app/flights?from=FROM&to=TO
- Manage alerts link
- Unsubscribe link

---

## Task 5: Miles Alert Button & Modal (components/MilesAlertButton.tsx + MilesAlertModal.tsx)

**Files:**
- Create: `components/MilesAlertButton.tsx`
- Create: `components/MilesAlertModal.tsx`

**Context:** UI components for setting new alerts from FlightCard.

**Button:** Simple "Set Alert" button that opens modal on click

**Modal Form:**
- Email input (required)
- Program display (read-only, from props)
- Route display (read-only, from props)
- CPP threshold slider (0.5-2.0, default 1.0)
- Submit & Cancel buttons
- POST to /api/miles-alerts on submit
- Toast notifications for success/error

---

## Task 6: Wire Alert Button into FlightCard (components/FlightCard.tsx)

**Files:**
- Modify: `components/FlightCard.tsx`

**Context:** Add MilesAlertButton next to each miles option in FlightCard.

**Implementation:** For each milesOption, render MilesAlertButton with route and program props.

---

## Task 7: Manage Alerts Page (app/miles-alerts/page.tsx + MilesAlertsClient.tsx)

**Files:**
- Create: `app/miles-alerts/page.tsx`
- Create: `app/miles-alerts/MilesAlertsClient.tsx`

**Context:** User-facing page to search, view, and delete their alerts (email-only).

**Functionality:**
- SSG page with metadata
- Client component with form to search by email
- Display list of alerts with delete buttons
- Show "no alerts" message if none found
- Toast notifications for delete success/error

---

## Task 8: Add Navigation Link (components/Header.tsx)

**Files:**
- Modify: `components/Header.tsx` or root layout nav

**Context:** Add "Miles Alerts" link to main navigation.

**Placement:** Alongside other main nav items (Portefeuille, Programmes, etc.)

---

## Task 9: Update Sitemap (app/sitemap.ts)

**Files:**
- Modify: `app/sitemap.ts`

**Context:** Add /miles-alerts route to sitemap for SEO.

**Entry:**
- url: /miles-alerts
- priority: 0.7
- lastModified: new Date()

---

## Task 10: Register Inngest Cron (vercel.json or lib/inngest.ts)

**Files:**
- Modify: `vercel.json` (if using Vercel Cron) OR ensure Inngest auto-discovery

**Context:** Configure production cron schedule.

**Note:** Inngest auto-discovers functions in `lib/inngest*.ts`. If using Vercel Cron instead, add entry to vercel.json.

---

## Task 11: Full Integration Test + Build

**Context:** Verify all tests pass, TypeScript compiles, ESLint clean, smoke test manually.

**Steps:**
1. Run all tests: `npm test -- --passWithNoTests`
2. TypeScript check: `npx tsc --noEmit`
3. ESLint check: `npx eslint .`
4. Manual smoke test in dev server:
   - Search flight → click Set Alert → create alert
   - Go to /miles-alerts → search email → verify alert shows
   - Delete alert → verify gone

---

## Task 12: Deploy to Production

**Files:** None (just deployment)

**Context:** Push to main, verify Vercel deploy, test in production.

**Steps:**
1. `git push origin main`
2. Wait for Vercel deploy (3-5 min)
3. Verify: `curl https://keza-taupe.vercel.app/api/version`
4. Test endpoint: POST /api/miles-alerts with test data
5. Visit https://keza-taupe.vercel.app/miles-alerts in browser

---

## Success Criteria

- ✅ All 12 tasks completed
- ✅ 1676+ tests passing (including new miles-alerts tests)
- ✅ TypeScript + ESLint clean
- ✅ Set alert button works on FlightCard
- ✅ Manage alerts page loads and searches by email
- ✅ Cron job discovery working (Inngest or Vercel Cron)
- ✅ Alert CRUD API endpoints functional
- ✅ Deployed to production
