# P4 Analytics Dashboard MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete analytics dashboard MVP for KEZA that tracks user behavior (searches, alerts, conversions) with backend APIs, Prisma database schema, and a React frontend with Recharts visualizations.

**Architecture:** 
- Install Prisma with PostgreSQL client (using PgLite or SQLite for local dev)
- Create analytics models for searches, alerts, users, conversions
- Build event tracking API (`/api/analytics/*`) to capture user actions
- Build dashboard query API (`/api/dashboard/*`) to aggregate and serve metrics
- Create dashboard pages under `/app/dashboard/*` with Recharts charts
- Implement comprehensive test suite (40+ tests) covering all layers
- Deploy to Vercel with database migrations

**Tech Stack:** 
- Prisma ORM + PostgreSQL (or SQLite locally)
- Next.js 15 API routes (TypeScript)
- React 18 + Recharts for visualizations
- Jest + React Testing Library for unit/component tests
- Playwright for E2E dashboard tests

---

## File Structure

### Database & ORM
- Create: `prisma/schema.prisma` — Prisma schema with analytics models
- Create: `prisma/migrations/[timestamp]_init_analytics/migration.sql` — Auto-generated
- Create: `lib/db.ts` — Prisma client singleton

### Event Tracking APIs
- Create: `app/api/analytics/search/route.ts` — POST endpoint for search tracking
- Create: `app/api/analytics/alert/route.ts` — POST endpoint for alert tracking
- Create: `app/api/analytics/conversion/route.ts` — POST endpoint for conversion tracking
- Create: `lib/analytics/eventService.ts` — Business logic for event recording

### Dashboard Query APIs
- Create: `app/api/dashboard/overview/route.ts` — GET KPI metrics
- Create: `app/api/dashboard/routes/route.ts` — GET route statistics
- Create: `app/api/dashboard/users/route.ts` — GET user trends
- Create: `app/api/dashboard/alerts/route.ts` — GET alert metrics
- Create: `lib/dashboard/metricsService.ts` — Query logic for all metrics

### Dashboard Frontend
- Create: `app/dashboard/page.tsx` — Overview page with KPI cards and charts
- Create: `app/dashboard/routes/page.tsx` — Routes table + volume chart
- Create: `app/dashboard/users/page.tsx` — User trends + geographic distribution
- Create: `app/dashboard/alerts/page.tsx` — Alert metrics + effectiveness
- Create: `components/dashboard/DashboardLayout.tsx` — Shared layout + navigation
- Create: `components/dashboard/KPICard.tsx` — Reusable KPI card component
- Create: `components/dashboard/Charts.tsx` — Recharts components (Line, Bar, Pie)

### Tests (40+ tests)
- Create: `__tests__/api/analytics/search.test.ts`
- Create: `__tests__/api/analytics/alert.test.ts`
- Create: `__tests__/api/analytics/conversion.test.ts`
- Create: `__tests__/api/dashboard/*.test.ts` (4 files)
- Create: `__tests__/components/dashboard/*.test.tsx` (3 files)
- Create: `e2e/dashboard.spec.ts`

---

## Implementation Tasks

### Task 1: Initialize Prisma and Install Dependencies

**Files:**
- Modify: `package.json`
- Create: `prisma/schema.prisma`
- Create: `.env.local` (update existing)

- [ ] Install Prisma, database client, and Recharts
- [ ] Initialize Prisma project
- [ ] Set up database URL in .env.local (SQLite for local dev)
- [ ] Verify Prisma installation
- [ ] Commit dependencies

---

### Task 2: Create Prisma Schema for Analytics Models

**Files:**
- Create: `prisma/schema.prisma`

- [ ] Write analytics schema with AnalyticsSearch, AnalyticsAlert, AnalyticsConversion, AnalyticsUser, AnalyticsDailyMetrics models
- [ ] Validate schema with `npx prisma validate`
- [ ] Create initial migration with `npx prisma migrate dev`
- [ ] Generate Prisma client
- [ ] Commit schema and migrations

---

### Task 3: Create Prisma Client Singleton

**Files:**
- Create: `lib/db.ts`

- [ ] Write Prisma client singleton with connection pooling
- [ ] Test import and basic functionality
- [ ] Commit to codebase

---

### Task 4: Create Event Service Business Logic

**Files:**
- Create: `lib/analytics/eventService.ts`

- [ ] Write recordSearchEvent, recordAlertEvent, recordConversionEvent functions
- [ ] Implement user upsert logic for each event type
- [ ] Add TypeScript types for all event data interfaces
- [ ] Verify compilation
- [ ] Commit event service

---

### Task 5: Create Search Event Tracking API

**Files:**
- Create: `app/api/analytics/search/route.ts`
- Create: `__tests__/api/analytics/search.test.ts`

- [ ] Write failing test for search tracking
- [ ] Implement POST /api/analytics/search endpoint with validation
- [ ] Test route format validation (XXX-YYY IATA codes)
- [ ] Verify tests pass
- [ ] Commit API and tests

---

### Task 6: Create Alert Event Tracking API

**Files:**
- Create: `app/api/analytics/alert/route.ts`
- Create: `__tests__/api/analytics/alert.test.ts`

- [ ] Write failing test for alert tracking
- [ ] Implement POST /api/analytics/alert endpoint
- [ ] Validate required userId and route fields
- [ ] Verify tests pass
- [ ] Commit API and tests

---

### Task 7: Create Conversion Event Tracking API

**Files:**
- Create: `app/api/analytics/conversion/route.ts`
- Create: `__tests__/api/analytics/conversion.test.ts`

- [ ] Write failing test for conversion tracking
- [ ] Implement POST /api/analytics/conversion endpoint
- [ ] Validate priceUSD and conversionValue fields
- [ ] Verify tests pass
- [ ] Commit API and tests

---

### Task 8: Create Dashboard Metrics Service

**Files:**
- Create: `lib/dashboard/metricsService.ts`

- [ ] Implement getKPIMetrics function (searches, conversions, alerts, users, revenue, cache hit rate)
- [ ] Implement getRouteMetrics function (top routes by volume)
- [ ] Implement getUserMetrics function (daily user trends)
- [ ] Implement getAlertMetrics function (alert effectiveness)
- [ ] Verify compilation
- [ ] Commit metrics service

---

### Task 9: Create Dashboard Overview API

**Files:**
- Create: `app/api/dashboard/overview/route.ts`
- Create: `__tests__/api/dashboard/overview.test.ts`

- [ ] Write test for KPI endpoint
- [ ] Implement GET /api/dashboard/overview with days query parameter
- [ ] Call getKPIMetrics and return JSON
- [ ] Verify tests pass
- [ ] Commit API and tests

---

### Task 10: Create Dashboard Routes API

**Files:**
- Create: `app/api/dashboard/routes/route.ts`
- Create: `__tests__/api/dashboard/routes.test.ts`

- [ ] Write test for routes endpoint
- [ ] Implement GET /api/dashboard/routes with days and limit parameters
- [ ] Call getRouteMetrics
- [ ] Verify tests pass
- [ ] Commit API and tests

---

### Task 11: Create Dashboard Users API

**Files:**
- Create: `app/api/dashboard/users/route.ts`
- Create: `__tests__/api/dashboard/users.test.ts`

- [ ] Write test for users endpoint
- [ ] Implement GET /api/dashboard/users with days parameter
- [ ] Call getUserMetrics
- [ ] Verify tests pass
- [ ] Commit API and tests

---

### Task 12: Create Dashboard Alerts API

**Files:**
- Create: `app/api/dashboard/alerts/route.ts`
- Create: `__tests__/api/dashboard/alerts.test.ts`

- [ ] Write test for alerts endpoint
- [ ] Implement GET /api/dashboard/alerts with days parameter
- [ ] Call getAlertMetrics
- [ ] Verify tests pass
- [ ] Commit API and tests

---

### Task 13: Create Dashboard Layout Component

**Files:**
- Create: `components/dashboard/DashboardLayout.tsx`
- Create: `__tests__/components/dashboard/DashboardLayout.test.tsx`

- [ ] Write failing component test for navigation and layout
- [ ] Implement DashboardLayout with sidebar navigation
- [ ] Add links to /dashboard, /dashboard/routes, /dashboard/users, /dashboard/alerts
- [ ] Style with Tailwind (light/dark mode support)
- [ ] Verify tests pass
- [ ] Commit component and tests

---

### Task 14: Create KPI Card Component

**Files:**
- Create: `components/dashboard/KPICard.tsx`
- Create: `__tests__/components/dashboard/KPICard.test.tsx`

- [ ] Write failing test for KPI card rendering
- [ ] Implement KPICard with title, value, icon, trend, format support
- [ ] Add formatValue function (currency, percentage, number formats)
- [ ] Support trend indicators (up/down arrows with percentages)
- [ ] Verify tests pass
- [ ] Commit component and tests

---

### Task 15: Create Dashboard Chart Components

**Files:**
- Create: `components/dashboard/Charts.tsx`
- Create: `__tests__/components/dashboard/Charts.test.tsx`

- [ ] Write failing tests for LineChart, BarChart, PieChart components
- [ ] Implement LineChartComponent (search volume over time)
- [ ] Implement BarChartComponent (top routes by volume)
- [ ] Implement PieChartComponent (currency/program distribution)
- [ ] Use Recharts library with dark mode support
- [ ] Verify tests pass
- [ ] Commit component and tests

---

### Task 16: Create Dashboard Overview Page

**Files:**
- Create: `app/dashboard/page.tsx`

- [ ] Implement /dashboard page with KPI cards (8 cards: searches, conversions, alerts, revenue, users, conversion rate, cache hit rate, search duration)
- [ ] Fetch data from /api/dashboard/overview and /api/dashboard/routes
- [ ] Display LineChart for search trends and BarChart for top routes
- [ ] Add loading and error states
- [ ] Verify build succeeds
- [ ] Commit page

---

### Task 17: Create Dashboard Routes Page

**Files:**
- Create: `app/dashboard/routes/page.tsx`

- [ ] Implement /dashboard/routes page
- [ ] Display BarChart of top 10 routes
- [ ] Display routes table with search count, conversions, revenue, top program
- [ ] Fetch from /api/dashboard/routes
- [ ] Add loading and error states
- [ ] Verify build succeeds
- [ ] Commit page

---

### Task 18: Create Dashboard Users Page

**Files:**
- Create: `app/dashboard/users/page.tsx`

- [ ] Implement /dashboard/users page
- [ ] Display summary stats (total users, new users, searches, conversions)
- [ ] Display LineChart for active users over time
- [ ] Display LineChart for conversions trend
- [ ] Display daily breakdown table
- [ ] Fetch from /api/dashboard/users
- [ ] Verify build succeeds
- [ ] Commit page

---

### Task 19: Create Dashboard Alerts Page

**Files:**
- Create: `app/dashboard/alerts/page.tsx`

- [ ] Implement /dashboard/alerts page
- [ ] Display alert metrics cards (total alerts, alerts fired, active alerts, conversion rate)
- [ ] Display top route and top program
- [ ] Add health indicator bars (active ratio, conversion effectiveness)
- [ ] Fetch from /api/dashboard/alerts
- [ ] Verify build succeeds
- [ ] Commit page

---

### Task 20: Write Integration and E2E Tests

**Files:**
- Create: `e2e/dashboard.spec.ts`

- [ ] Write E2E test for dashboard page load
- [ ] Write tests for navigation between dashboard pages
- [ ] Write tests for routes table and charts display
- [ ] Write tests for user metrics display
- [ ] Write tests for alert metrics display
- [ ] Write tests for event tracking endpoints (POST /api/analytics/*)
- [ ] Write tests for API error handling
- [ ] Write tests for form validation
- [ ] Commit E2E tests

---

### Task 21: Run All Tests and Verify Coverage

**Files:**
- Verify test suite

- [ ] Run all unit and component tests for analytics and dashboard
- [ ] Run full test suite with coverage
- [ ] Verify build succeeds with no errors
- [ ] Commit test results

---

### Task 22: Deploy to Vercel

**Files:**
- Verify deployment configuration

- [ ] Set up database URL in Vercel environment
- [ ] Run Prisma migrations on production database
- [ ] Push to main branch
- [ ] Verify Vercel auto-deploys
- [ ] Test production endpoints
- [ ] Final commit

---

## Testing Summary

This plan includes **40+ tests** across:

- **API Tests (15 tests):** Search, alert, conversion tracking; all dashboard endpoints
- **Component Tests (10 tests):** DashboardLayout, KPICard, Charts
- **Metrics Service Tests (8 tests):** KPI, route, user, alert metrics
- **E2E Tests (12 tests):** Dashboard navigation, data display, event tracking

Run with: `npm test` (unit/component) and `npm run test:e2e` (E2E)
