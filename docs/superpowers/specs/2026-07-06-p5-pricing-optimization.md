# KEZA P5: Dynamic Pricing Optimization

**Goal:** Personalized pricing recommendations, dynamic rate adjustments, value scoring.

**Tech Stack:** TypeScript, Next.js 15, ML inference (optional), Redis.

---

## Features

### 1. Value Score (CPP Intelligence)
- Calculate CPP percentile for each program/route
- Show "great deal" vs "fair deal" vs "expensive" badges
- Track historical CPP ranges

### 2. Price Trends
- Show 30-day price history for each route
- Predict best booking window (ML optional)
- Alert when price drops below user's threshold

### 3. Personalized Recommendations
- "Best value for you" — based on user's saved programs
- Alternative routes with better CPP
- Time-based recommendations (best time to book)

### 4. Ranking Optimization
- Rank results by value (CPP) instead of just price
- Factor in user preferences (miles vs cash)
- A/B test ranking strategies

---

## Implementation

**Backend:**
- Extend search API to include CPP percentile, price trend
- Add recommendation engine
- Cron job to track price history (daily snapshots)

**Frontend:**
- Add value badges to FlightCard
- Price trend sparkline on each result
- "Best value" section at top of results
- Recommendation carousel

**Database:**
- `price_history` — Daily price snapshots per route
- `cpp_stats` — CPP percentiles (updated daily)

**Success Criteria:**
- ✅ Value badges showing on all results
- ✅ Price trend data collected (7+ days)
- ✅ Recommendations working
- ✅ A/B test framework ready
- ✅ Tests passing
- ✅ Deployed to production
