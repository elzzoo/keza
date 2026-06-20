# KEZA Features Documentation

## F1 — Route Health Badge

Displays data availability and trend for each search result.

**Implementation:** `components/RouteHealthBadge.tsx`

**States:**
- ✅ **Excellent** (data from both Duffel + TP, cache fresh)
- ⚠️ **Good** (data from one provider or slightly stale)
- ⚠️ **Limited** (synthetic flight or very sparse data)
- ❌ **No Data** (route not indexed by any provider)

**Logic:**
- Duffel + TP both present → "Excellent"
- One provider or synthetic → "Good"/"Limited"
- No results → "No Data"

---

## F2 — Price Heatmap (6-Month Calendar)

Interactive calendar showing price trends across 6 months for flexible travel.

**Location:** `components/PriceHeatmap.tsx`

### How It Works

1. **Fetch** — Calls `/api/calendar?from=SIN&to=LAX&cabin=economy` for 6 months of data
2. **Cache** — SessionStorage (6x API reduction) + server-side 2h TTL
3. **Multiply** — Apply cabin multiplier to economy base price:
   - Economy: 1.0x
   - Premium: 1.8x (premium economy)
   - Business: 4.0x (long-haul premium)
   - First: 6.5x (ultra-premium)
4. **Color** — Price ratio (0-100%):
   - ✅ Green: 0-25% (excellent deal)
   - 🟢 Light green: 25-50% (good deal)
   - 🟡 Amber: 50-75% (moderate)
   - 🔴 Orange: 75%+ (expensive)

### Data Source

- **Travelpayouts API** — Calendar prices (5-7 day rolling window)
- **Fallback** — Server-cached values if TP fails

### User Flow

1. User enters from/to/cabin on SearchForm
2. Results show, heatmap loads in background
3. User can click month to re-search with that departure date
4. Heatmap persists across re-sorts/filters

### Edge Cases

- **No data for month** — Shown as grey
- **Price = $0** — Indicates data artifact, hidden
- **TP API down** — Falls back to server cache (24h old max)

---

## F3 — Portefeuille (Miles Portfolio)

User's airline miles portfolio — balance entry, recommendation engine, deal alerts.

**Location:** `/app/portefeuille/`, `lib/portfolio.ts`

### Components

- **Balance Entry** — Form to input airline + current miles balance
- **Current Holdings** — Table showing program, balance, balance value (in USD at effective rate)
- **Recommendations** — ML-powered deals from `/api/recommendations` (run daily by cron)
- **Deal Scoring** — Each result scored 0-1 based on price deviation from 90-day history

### Data Storage

**Current Implementation:** Placeholder (localStorage in client)

**TODO:** Implement real persistence:
- Save balances to user profile (Redis/Postgres)
- Run daily `/api/cron/balance-sync` to check balance changes
- Trigger alerts when balance changes by >5%

### Recommendations Algorithm

1. **Collect** — Past 90 days of search results + their prices
2. **Train** — Linear regression on (date, price) → price trend
3. **Score** — New flight: `deviation = (price - predicted) / predicted`
4. **Rank** — Score > 0.2 (20% below trend) → alert user

### Mile Value Calibration

Each program's `effectiveMileValue` stored in Redis and updated daily:

```
key: keza:pro:effective-miles:{email}:{program}
value: {cents_per_mile}  // e.g., 1.5 = 1.5¢ per mile
```

Updated by auto-calibrate engine based on user searches (private learning).

### Pro Feature

- Free users: View heuristic recommendations only
- Pro users: Full portfolio + ML recommendations + alerts

---

## Future Features (Roadmap)

### P1 — Seat Alerts
Monitor availability on specific flights; alert when seats open up in user's preferred cabin.

**Status:** Designed, pending implementation
**Location:** `lib/seatAlerts.ts`, `app/api/cron/seat-alerts/route.ts`

### P2 — Balance Sync
Auto-check airline loyalty balances daily (via partner APIs or scraping).

**Status:** Designed
**Location:** `lib/balanceSync.ts`

### P3 — Multi-Leg Optimization
Find best 2-4 leg routes using Dijkstra's algorithm on flight graph.

**Status:** Designed, graph builder + shortest-path algorithm ready
**Location:** `lib/multiLeg.ts`, `lib/graphBuilder.ts`, `lib/shortestPath.ts`

### P4 — Transfer Partner Analytics
Show best transfer ratios: "Transfer BA points to Iberia 1:1 → use on Iberia flight worth 2.5¢/point".

**Status:** Concept
