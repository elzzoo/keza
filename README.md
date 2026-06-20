# KEZA — Flight Price Comparator (Cash vs Miles)

KEZA is a Next.js 15 flight search engine that compares the cost of paying in cash vs redeeming miles across 50+ loyalty programs. Built with streaming search, Redis caching, and machine learning deal scoring.

**Live:** https://keza-taupe.vercel.app

## Quick Start

### Setup

```bash
npm install
```

### Environment Variables

Create `.env.local`:

```env
# Flight APIs
DUFFEL_API_KEY=duffel_test_...
TP_TOKEN=travelpayouts_token_...

# Cache
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Optional: Sentry monitoring
NEXT_PUBLIC_SENTRY_DSN=...
SENTRY_AUTH_TOKEN=...
```

### Development

```bash
npm run dev
```

Open http://localhost:3000 — changes auto-reload via HMR.

### Testing

```bash
npm test                    # Run all tests (1047 tests)
npm test -- homeCarrier     # Run specific test suite
npm run lint                # ESLint check
```

Pre-push hook runs: `tsc --noEmit`, `eslint .`, `jest --passWithNoTests`

## Architecture

### Core Engine

- **`lib/engine/index.ts`** — Main orchestrator. Fetches from Duffel (real-time) + Travelpayouts (fallback), merges, applies guarantees.
- **`lib/engine/enrich.ts`** — Attaches miles options (50+ programs). Calculates cost comparison (cash vs each program).
- **`lib/costEngine.ts`** — Miles pricing. Program → airline mapping, award taxes, cabin multipliers, cabin-specific pricing.
- **`lib/engine/supplements.ts`** — Home carrier guarantees + synthetic flight injection for missing routes.

### Search Flow

1. **Cache check** (Redis, 1h TTL)
2. **Parallel fetch** from Duffel + Travelpayouts (both legs for roundtrips)
3. **Merge & deduplicate** by route key, prefer Duffel (HIGH confidence)
4. **Inject synthetics** for airlines in `ROUTE_AIRLINE_SUPPLEMENTS` not found by providers
5. **Enrich** with miles options (all 50+ programs via `buildCostOptions()`)
6. **Rank** by effective cost (cash or best miles option)
7. **Cache result** for future searches

### Performance

- **Streaming results** via SSE (`app/api/search/stream/route.ts`) — return cached results immediately, stream live updates
- **Pre-warming** hourly cron caches top 20 routes for 90 days (70%+ hit rate)
- **Redis caching** — 1h search results, 2h calendar data, 24h trial status
- **Bundle optimization** — 180KB shared JS target (dynamic imports, tree-shaking)
- **Target latency:** <5s p95 on SIN→LAX search

### Data Sources

| Source | Confidence | Use Case |
|--------|------------|----------|
| **Duffel** | HIGH | Real-time, primary ranking |
| **Travelpayouts** | LOW | Fallback, historical calendar |
| **Synthetic** | ESTIMATED | Routes missing from both providers |

Confidence penalty applied during ranking: HIGH 1.0x, LOW 1.05x, ESTIMATED 1.10x

### Features

- **F1 — Route Health** — Availability badge + trend indicator
- **F2 — Price Heatmap** — 6-month calendar with cabin multipliers (premium 1.8x, business 4x, first 6.5x)
- **F3 — Portefeuille** — User's miles portfolio + personalized recommendations
- **Trial Pro** — 7-day auto-grant on first login, email reminder before expiry
- **Pro Upgrade** — Locked features: history, multi-passenger, advanced filters

## Key Files

```
lib/
  engine/
    index.ts          - Main searchEngine() orchestrator
    enrich.ts         - Attach miles options, cost comparison
    supplements.ts    - Home carrier guarantees, synthetic flights
    constants.ts      - CONFIDENCE_PENALTY map
    travelpayouts.ts  - TP API integration
  costEngine.ts       - buildCostOptions(), award pricing
  duffelProvider.ts   - Duffel API integration
  redis.ts            - Upstash Redis client
  roundPrice.ts       - Price rounding utility (extracted)
  lemonsqueezy.ts     - Trial/Pro subscription management
  
app/api/
  search/stream/route.ts    - SSE streaming endpoint
  calendar/route.ts         - 6-month heatmap prices
  cron/                     - Scheduled jobs (trial reminders, route pre-warming)
  
components/
  SearchForm.tsx      - Trip type, dates, cabin, passengers
  Results.tsx         - Ranked flights with tabs (all/miles/cash)
  PriceHeatmap.tsx    - 6-month calendar view
  FlightCard.tsx      - Individual flight with cost breakdown
```

## Cache Strategy

**Key format:** `keza:{CACHE_VERSION}:{FROM}:{TO}:{DATE}:{TRIPTYPE}:{RETURNDATE}:{STOPS}:{CABIN}:{PASSENGERS}`

**Version:** `v29` — Bump whenever `FlightResult` shape changes or a post-processing fix needs cache invalidation.

**TTL:**
- Search results: 3600s (1h)
- Calendar data: 7200s (2h)
- Trial status: 86400s (24h)

## Loyalty Programs (50+)

Flying Blue, Singapore KrisFlyer, ANA Mileage Club, Japan Airlines Mileage Bank, Emirates Skywards, British Airways Executive Club, United MileagePlus, American AAdvantage, Delta SkyMiles, Air Canada Aeroplan, Turkish Miles&Smiles, Etihad Guest, Qatar Privilege Club, Korean Air SKYPASS, Cathay Pacific Asia Miles, Malaysia Airlines Enrich, Ethiopian Airlines ShebaMiles, and 32+ more.

**Important:** Program names must match exactly (from `costEngine.ts` `PROGRAM_TO_AIRLINE`).

## Monitoring

- **Sentry** — Error tracking, performance metrics, Duffel/Redis timeouts, subscription events
- **Pre-push hook** — Enforces: TypeScript 0 errors, ESLint 0 violations, 1047 tests passing
- **Vercel Analytics** — Core Web Vitals, deployment tracking
- **Error rate SLA** — <0.1% in production

## Deployment

```bash
git push origin main
# → Vercel auto-deploys
# → Wait 3-5 min for build
# → Verify: curl https://keza-taupe.vercel.app/api/version
```

## Contributing

1. Implement feature/fix
2. Write tests (TDD: tests first, implementation second)
3. Ensure pre-push hook passes
4. Push → Vercel auto-deploys
5. Verify production deployment

## License

Private — KEZA Inc.
