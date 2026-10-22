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

User-entered airline miles and bank-points portfolio. Automatic airline-account retrieval and ML deal recommendations are not live.

**Location:** `app/portefeuille/PortefeuilleClient.tsx`, `app/api/profile/route.ts`

### Components

- **Balance Entry** — Form to input airline + current miles balance
- **Current Holdings** — Entered balances and indicative value by program
- **Cross-device profile** — Authenticated profile storage is available through `/api/profile`; the manual-entry flow remains distinct from airline-account sync

### Data Storage

The client uses `useProfile` for entered balances; authenticated profile persistence exists through `/api/profile`. Automatic airline balance sync is disabled in the wallet UI and returns 501 from `/api/balance/sync` unless explicitly enabled. Its credential lookup currently returns no credentials, so it must not be presented as operational.

### Not Yet Live

`/api/recommendations/deals` reads cached recommendations, but its producer has placeholder users and prices and is not scheduled in `vercel.json`. Do not promise personalized ML deals or automatic balance-change alerts as a Pro benefit. See [feature readiness audit](audits/2026-10-22-feature-readiness.md) for the evidence and release conditions.

---

## Future Features (Roadmap)

### P1 — Seat Alerts
Monitor availability on specific flights; alert when seats open up in user's preferred cabin.

**Status:** Designed, pending implementation
**Location:** `lib/seatAlerts.ts`, `app/api/cron/seat-alerts/route.ts`

### P2 — Balance Sync
Auto-check airline loyalty balances daily (via partner APIs or scraping).

**Status:** Off in the wallet UI; server integration incomplete
**Location:** `lib/balanceSync.ts`

### P3 — Multi-Leg Optimization
Find best 2-4 leg routes using Dijkstra's algorithm on flight graph.

**Status:** Experimental and off by default; itinerary inputs contain assumed times and placeholder identifiers
**Location:** `lib/multiLeg.ts`, `lib/graphBuilder.ts`, `lib/shortestPath.ts`

### P4 — Transfer Partner Analytics
Show best transfer ratios: "Transfer BA points to Iberia 1:1 → use on Iberia flight worth 2.5¢/point".

**Status:** Concept
