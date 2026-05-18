# KEZA — Claude Code Context

## What This App Does

KEZA is a bilingual (FR/EN) flight price comparator built for diaspora travelers (Africa ↔ Europe/Americas focus). For every flight result, it computes whether paying in cash or burning frequent-flyer miles is cheaper, using real-time prices from Duffel and cached fares from Travelpayouts/Aviasales. The UI is Next.js 15 App Router, hosted on Vercel.

## Tech Stack

- Next.js 15.3.x, App Router, TypeScript, Tailwind CSS 3.x
- Vercel (hosting + edge), Upstash Redis (`@upstash/redis`) — cache + rate limiting
- Sentry (`@sentry/nextjs`) — error tracking, Resend (`resend`) — email, Plausible — analytics
- Duffel API (`lib/duffelProvider.ts`) — real-time premium flight search (HIGH confidence)
- Travelpayouts/Aviasales v3 + v2 month-matrix (`lib/engine/travelpayouts.ts`) — budget fares (LOW confidence)
- Zod v4 — runtime validation, `react-simple-maps` — route map, `sonner` — toasts, `web-push` — push notifications

## Key Commands

```bash
npm run dev          # Start dev server (next dev)
npm run build        # tsc --noEmit && next lint && next build
npm start            # next start
npm test             # Jest (unit + component tests)
npm run test:watch   # Jest watch mode
npm run test:e2e     # Playwright e2e tests
```

Pre-push hook runs `tsc + eslint + jest` automatically (installed via `npm run prepare` → `scripts/install-hook.mjs`).

## Project Structure

```
app/
  page.tsx                    # FR homepage
  layout.tsx                  # Root layout with nonce-based CSP
  sitemap.ts                  # Auto-generated from data/popularRoutes.ts
  en/                         # EN locale mirror (pages, flights/)
  flights/[route]/            # Static flight pages (FR) — generateStaticParams from POPULAR_ROUTES
  api/
    search/route.ts           # POST — main search endpoint (rate-limited, 18s timeout)
    calendar/route.ts         # GET — flexible-date calendar prices
    alerts/                   # Price alert endpoints
    admin/                    # Admin panel API routes (ADMIN_SECRET protected)
    cron/                     # Cron jobs (CRON_SECRET protected)
    forex/route.ts            # EUR/XOF exchange rate
    track/route.ts            # Click-tracking for booking links
    push/                     # Web push notification endpoints
  admin/                      # Admin UI pages
  alertes/                    # User price alerts UI
  calculateur/                # Miles value calculator page
  programmes/                 # Loyalty program guide pages
  deals/                      # Curated deals
  destinations/               # Destination pages
  prix/                       # Price history pages

lib/
  engine/                     # Search orchestration (see below)
  costEngine.ts               # Miles vs cash calculation (main export: buildCostOptions)
  duffelProvider.ts           # Duffel API client
  redis.ts                    # Upstash Redis client singleton
  ratelimit.ts                # Rate limiting helpers
  auth.ts                     # Admin auth (safeCompare, HMAC sessions)
  autoCalibrate.ts            # Self-learning miles value observation
  promotions/                 # Promo engine (loadPromotions, applyPromotions)
  optimizer.ts                # Miles program optimizer per user
  alliances.ts                # Airline → alliance mapping
  iataAirlines.ts             # IATA code → airline name + blocklist
  zones.ts                    # Airport → geographic zone (EUROPE, AFRICA_WEST, etc.)
  milesDataService.ts         # Redis-backed effective miles price loader
  milesAcquisition.ts         # "Buy miles" acquisition cost calculation
  dynamicAwardEngine.ts       # Distance-based miles estimate for programs without hardcoded charts
  scenarioEngine.ts           # Formats MilesOption[] into typed Scenario[]

data/
  popularRoutes.ts            # POPULAR_ROUTES[] — feeds generateStaticParams + sitemap
  awardCharts.ts              # Per-program miles required (hardcoded tables)
  awardTaxes.ts               # Per-airline award taxes by cabin + route
  milesPrices.ts              # MILES_PRICE_MAP: cents/mile per program
  transferBonuses.ts          # Credit card → airline transfer partners + bonuses
  airports.ts                 # Airport coordinates (lat/lon) for dynamic engine

__tests__/                    # Jest unit + component tests
e2e/                          # Playwright e2e tests
```

## Search Engine Architecture

All engine files are under `lib/engine/`. The main export is `searchEngine()` from `lib/engine/index.ts`.

### Flow: `searchEngine(params: SearchParams)`

1. **Cache check** — looks up `keza:{CACHE_VERSION}:{from}:{to}:{date}:{tripType}:{returnDate}:{stops}:{cabin}:{passengers}` in Upstash Redis. On hit, re-stamps a fresh `searchId` UUID (per-session click tracking) and returns immediately.

2. **Parallel fetch** — `Promise.all([fetchFromTravelpayouts(...), fetchFromDuffel(...)])` for outbound (and return leg if roundtrip). Both fire simultaneously:
   - `fetchFromDuffel` (`lib/duffelProvider.ts`) → real-time, cabin-aware, tagged `source: "DUFFEL"`, `priceConfidence: "HIGH"`, `cabinResolved: true`
   - `fetchFromTravelpayouts` (`lib/engine/travelpayouts.ts`) → Aviasales v3 API then v2 month-matrix fallback, tagged `source: "TP"`, `priceConfidence: "LOW"`, `cabinResolved: false`

3. **Merge** — `mergeFlights(tpFlights, duffelFlights)` deduplicates by `(sorted airlines, stops)` key. Duffel always wins over TP for the same key (price confidence), but TP booking links are preserved when Duffel has none.

4. **Direct-flight recovery** — if `stops=any` but all merged results have stops, a second TP query with `direct=true` is fired to surface nonstops TP may have ranked lower.

5. **Synthetic flights** — airlines in `ROUTE_AIRLINE_SUPPLEMENTS` (`lib/engine/supplements.ts`) that aren't covered by any provider get placeholder `NormalizedFlight` entries tagged `source: "SYNTHETIC"`, `priceConfidence: "ESTIMATED"`. Price is derived from the cheapest real result. Synthetics are kept in a separate array — they never enter the miles engine and are appended AFTER the sorted real results.

6. **Promotions** — `loadPromotions()` + `applyPromotions()` from `lib/promotions/engine.ts` applied to both legs.

7. **Roundtrip pairing** — best-matching return leg is chosen per outbound flight: prefers same-carrier overlap, falls back to cheapest return.

8. **Enrich** — `enrich()` (`lib/engine/enrich.ts`) runs per flight:
   - Applies `CABIN_MULTIPLIER` (`economy:1.0`, `premium:1.8`, `business:4.0`, `first:6.5`) when `cabinResolved=false` (TP/synthetic only — Duffel already prices the real cabin)
   - Sets `priceIsEstimate = !cabinResolved && cabin !== "economy"` — when true, `recommendation` is forced to `IF_HAVE_MILES` so the UI won't show a confident savings claim
   - Calls `buildCostOptions()` (`lib/costEngine.ts`) to compute `cashCost`, `milesCost`, `bestOption`, `milesOptions`, `recommendation`
   - Builds the booking link: Duffel link > TP roundtrip Aviasales search URL > TP one-way deep link > generic Aviasales search fallback

9. **Sort** — by effective cost with confidence penalty: `HIGH×1.00`, `LOW×1.05`, `ESTIMATED×1.10` (affects ranking only, not displayed price). Synthetics always appended last.

10. **Auto-calibrate** — `recordObservation()` (`lib/autoCalibrate.ts`) is called fire-and-forget for HIGH-confidence Duffel results to self-update miles valuations in Redis.

11. **Cache write** — `redis.set(cacheKey, allResults, { ex: 3600 })` — 1 hour TTL.

### Source Confidence

| `priceConfidence` | `source`    | Meaning |
|-------------------|-------------|---------|
| `HIGH`            | `DUFFEL`    | Real-time Duffel API, exact cabin price |
| `LOW`             | `TP`        | Travelpayouts cached fares, economy only |
| `ESTIMATED`       | `SYNTHETIC` | Synthetic placeholder, price derived from cheapest TP fare |

### Cache Strategy

- **Key schema**: `keza:{CACHE_VERSION}:{from}:{to}:{date}:{tripType}:{returnDate}:{stops}:{cabin}:{passengers}`
- **Current version**: `CACHE_VERSION = "v21"` (single source of truth in `lib/engine/index.ts`, re-exported and imported by `app/api/search/route.ts`)
- **TTL**: 1 hour (`ex: 3600`)
- **Fallback chain** (on search timeout): `v21 → v20 → v19 → v18` — prevents empty results when the version was just bumped
- **Bump rule**: increment `CACHE_VERSION` any time `FlightResult` shape changes

### Cabin Multipliers (`CABIN_MULTIPLIER` in `lib/engine/types.ts`)

Applied only when `cabinResolved=false` (Travelpayouts + synthetics):
- `economy: 1.0`, `premium: 1.8`, `business: 4.0`, `first: 6.5`

When `priceIsEstimate = true` (non-economy + TP/synthetic), `recommendation` is forced to `IF_HAVE_MILES`.

### lib/engine/ Files

| File | Purpose |
|------|---------|
| `index.ts` | `searchEngine()` orchestrator, `CACHE_VERSION`, re-exports |
| `types.ts` | `SearchParams`, `FlightResult`, `CABIN_MULTIPLIER`, `CalendarDay` |
| `enrich.ts` | `enrich()`, `enrichSynthetic()`, `mergeFlights()`, `filterByStops()` |
| `travelpayouts.ts` | `fetchFromTravelpayouts()`, `fetchV3()`, `fetchMonthMatrix()`, `fetchCalendarPrices()`, `rebrandRoute()`, `withRetry()` |
| `supplements.ts` | `ROUTE_AIRLINE_SUPPLEMENTS` map, `discoverRouteAirlines()`, `enrichSynthetic()` |

### Travelpayouts Provider Details (`lib/engine/travelpayouts.ts`)

- **Pass 1**: Aviasales v3 `prices_for_dates` — has airline codes + deep links
- **Pass 2**: v2 `month-matrix` (broader coverage, no airline codes) + `discoverRouteAirlines()` call to attach airlines
- Metro-code fallback: `DSS → DKR`, `CDG → PAR`, etc. via `lib/metroCodes.ts` — up to 4 (origin, destination) pairs tried in order
- `rebrandRoute()` rewrites metro codes back to user-requested airport codes in booking links
- `MIN_REALISTIC_PRICE_USD = 30` — filters out data artifacts ($1–$10 flash deals)
- `withRetry()` — 3 attempts, 500ms/1000ms backoff, retries only on network errors or 5xx

## Cost Engine (`lib/costEngine.ts`)

Main export: `buildCostOptions(flight: FlightInput, effectivePrices: Map<string, number>): CostComparison`

### How it works

1. **Program resolution** — `getProgramsForAirline(airlines[])` resolves loyalty programs via:
   - Direct match: program's own airline is in the flight's airline list
   - Alliance match: same alliance as the primary airline
   - Airline-based guarantees: `FLYING_BLUE_AIRLINES`, `AEROPLAN_GUARANTEE_AIRLINES`, `KRISFLYER_GUARANTEE_AIRLINES`, `BA_AVIOS_GUARANTEE_AIRLINES` sets
   - Operator-based flagship injection via `OPERATOR_TO_PROGRAM` map

2. **Corridor guarantees** — `getCorridorGuarantees(originZone, destZone)` ensures flagship programs always appear on primary corridors (e.g. Flying Blue on Europe↔Africa, KrisFlyer/ANA/JAL on Asia↔North America). Corridor-guaranteed options are sorted to the top of the display list.

3. **Miles required** — `getMilesRequired(program, originZone, destZone, cabin, tripType, passengers)` from `data/awardCharts.ts` (hardcoded tables). Falls back to `estimateMilesRequired()` from `lib/dynamicAwardEngine.ts` (distance-based) for programs not in the hardcoded charts.

4. **Award taxes** — `getAwardTaxes(airline, cabin, passengers, from, to, originZone, destZone)` from `data/awardTaxes.ts`. Always uses the matched/inferred airline, not necessarily `airlines[0]`.

5. **Per-option cost formula**:
   ```
   milesCost = (milesRequired × valuePerMile) / 100   // valuePerMile in cents
   totalMilesCost = milesCost + taxes
   savings = cashTotal - totalMilesCost
   ```
   `valuePerMile` comes from `effectivePrices` (Redis-backed auto-calibrated) → `MILES_PRICE_MAP` → `DEFAULT_MILE_VALUE_CENTS` fallback chain.

6. **Transfer options** — `TRANSFER_BONUSES` from `data/transferBonuses.ts` (credit card → airline transfers). `getEffectiveRatio()` handles promo multipliers. Transfer type uses source currency's market value (opportunity cost).

7. **Acquisition options** — "Buy miles" path via `calculateAcquisitionCost()` (`lib/milesAcquisition.ts`). Only suggested when cheaper than cash. Appears as `type: "TRANSFER"` with `via: "Achat {source}"`.

8. **Recommendation**:
   - `USE_MILES` — best miles option saves ≥ $10 vs cash
   - `USE_CASH` — cash is cheaper, or savings < $10
   - `IF_HAVE_MILES` — forced when `priceIsEstimate=true` (non-economy TP/synthetic)

9. **bestOption** — cheapest option where `accessibilityScore ≤ 2` (accessible programs first). Falls back to raw cheapest if no accessible option exists. Max 12 options returned, corridor-guaranteed programs always in top positions.

### Effective Prices

`getEffectivePrices()` (bottom of `costEngine.ts`) delegates to `lib/milesDataService.ts` → Redis-backed auto-calibrated values → static `MILES_PRICE_MAP` fallback. Never throws.

## Security Notes

- `ADMIN_SECRET` and `CRON_SECRET` are separate env vars — `hasAdminSecret()` and `hasCronSecret()` in `lib/auth.ts` must never fall back to each other
- `safeCompare(a, b)` in `lib/auth.ts` uses Node's `timingSafeEqual` — constant-time comparison, always check length first
- Admin sessions: HMAC-SHA256 signed `{exp}.{sig}` cookie (`keza_admin_session`), 8-hour TTL, verified by `verifyAdminSessionToken()`
- CSP uses per-request nonces injected via `middleware.ts` — no `unsafe-inline` in production
- Rate limiting: `checkRateLimit()` / `rateLimitResponse()` in `lib/ratelimit.ts` wraps Upstash with atomic `SET NX EX` + `INCR`. Rate limit keys: `keza:ratelimit:{namespace}:{ip}`
- `/api/search` rate limit: 30 req/60s per IP
- All public POST endpoints must call `rateLimitResponse()` before processing

## Cache Keys

| Purpose | Key pattern |
|---------|-------------|
| Search results | `keza:{CACHE_VERSION}:{from}:{to}:{date}:{tripType}:{returnDate}:{stops}:{cabin}:{passengers}` |
| Rate limiting | `keza:ratelimit:{namespace}:{ip}` |
| Miles prices | Managed by `lib/milesDataService.ts` |
| Forex rate | Managed by `lib/autoCalibrate.ts` |

Bump `CACHE_VERSION` in `lib/engine/index.ts` whenever `FlightResult` shape changes. The search route (`app/api/search/route.ts`) imports it automatically — both sides stay in sync.

## Adding New Features

**New API route**: call `rateLimitResponse()` from `lib/ratelimit.ts` before any processing. Return `null` = allowed, non-null = 429 response.

**New page**: add `generateMetadata()` with `title`, `description`, `openGraph`, `twitter`, and `alternates.canonical`. Follow the pattern in existing pages.

**New EN page**: create under `app/en/`, add `hreflang` alternates to the corresponding FR page's `generateMetadata()`, add to `app/sitemap.ts`.

**New engine provider**: implement as a new file under `lib/engine/`, export from `lib/engine/index.ts`, tag results with appropriate `source` and `priceConfidence`, pass to `mergeFlights()`.

**New route supplement**: add to `ROUTE_AIRLINE_SUPPLEMENTS` in `lib/engine/supplements.ts`. Use airline names exactly as they appear in `lib/iataAirlines.ts`. Both directions must be listed.

**New popular route**: add to `POPULAR_ROUTES` in `data/popularRoutes.ts` — `generateStaticParams` in `app/flights/[route]/page.tsx`, `app/en/flights/[route]/page.tsx`, and `app/sitemap.ts` all consume it automatically.

**New loyalty program**: add to `data/awardCharts.ts` (miles table), `data/milesPrices.ts` (value), `lib/costEngine.ts` (`PROGRAM_TO_AIRLINE` + `OPERATOR_TO_PROGRAM`), and `lib/globalPrograms.ts`.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DUFFEL_API_KEY` | Duffel live flight search API |
| `TRAVELPAYOUTS_TOKEN` | Travelpayouts/Aviasales v3 + month-matrix API |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `ADMIN_SECRET` | Admin panel bearer token (never share with CRON_SECRET) |
| `CRON_SECRET` | Cron job bearer token (never share with ADMIN_SECRET) |
| `RESEND_API_KEY` | Transactional email via Resend |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error tracking (public, browser + server) |
| `SENTRY_AUTH_TOKEN` | Sentry source map upload (build time) |
| `VAPID_PUBLIC_KEY` | Web push VAPID public key |
| `VAPID_PRIVATE_KEY` | Web push VAPID private key |
| `VAPID_SUBJECT` | Web push VAPID subject (mailto: URL) |

## Tests

- **Unit tests**: `__tests__/` — Jest with `ts-jest`, jsdom environment for components
- **Component tests**: `__tests__/components/` — React Testing Library
- **E2E**: `e2e/` — Playwright (`@playwright/test`)
- **Run**: `npm test` (all Jest suites), `npm run test:e2e` (Playwright)
- Pre-push hook runs `tsc + eslint + jest` — fix all three before pushing
- Jest config in `jest.config.ts` (or `jest.config.js`) at root
