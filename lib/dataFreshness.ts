// lib/dataFreshness.ts
// Strategy for keeping award data current:
//
// 1. STATIC BASELINE (awardCharts.ts, milesPrices.ts, etc.)
//    → Updated manually when programs announce devaluations
//    → Versioned via DATA_VERSION below
//
// 2. REDIS OVERRIDES (dynamic layer)
//    → Per-program mile values can be overridden via /api/admin/update-data
//    → The costEngine checks Redis first, falls back to static
//    → TTL = 7 days — if Redis is stale, static values are used
//
// 3. CRON REFRESH (every 24h via Vercel cron)
//    → /api/cron/miles-prices refreshes Redis from static values
//    → In the future: scrape TPG/OMAAT valuations, or integrate an API
//
// ── When to bump DATA_VERSION ──────────────────────────────────────────────────
// Bump whenever you change award charts, taxes, zones, or mile values.
// This invalidates the search cache (engine.ts uses `keza:v${DATA_VERSION}:...`)

export const DATA_VERSION = 7;

// Last known update dates per data source (for admin dashboard / monitoring)
export const DATA_SOURCES = {
  awardCharts: {
    lastUpdated: "2026-04-20",
    sources: [
      "Flying Blue: flyingblue.com/en/spend/flights/reward-flights (dynamic pricing, values are Classic tier)",
      "Turkish M&S: turkishairlines.com/en-int/miles-and-smiles/program-details/star-alliance-award-chart (March 2024 chart)",
      "Emirates: emirates.com/english/skywards/miles-calculator (distance-based, values estimated for key routes)",
      "Qatar: qatarairways.com/privilege-club (Qmiles chart 2025)",
      "BA Avios: britishairways.com/executive-club/spending-avios (distance bands 2025)",
      "Ethiopian: ethiopianairlines.com/shebamiles (Star Alliance chart)",
      "Aeroplan: aircanada.com/aeroplan (fixed chart 2024)",
      "United: united.com/mileageplus (dynamic, values are 'starting at')",
    ],
  },
  awardTaxes: {
    lastUpdated: "2026-04-20",
    sources: [
      "Based on actual award ticket bookings and ITA Matrix fuel surcharge data.",
      "AF/KLM/LH: High YQ carriers — validated against flyertalk reports.",
      "BA: Known worst YQ in industry — validated against expert flyer.",
      "Emirates/Qatar/Ethiopian: Low or no YQ — confirmed.",
    ],
  },
  mileValues: {
    lastUpdated: "2026-04-20",
    sources: [
      "The Points Guy monthly valuations (thepointsguy.com/guide/monthly-valuations)",
      "One Mile at a Time (omaat.com) community consensus",
      "Adjusted DOWN from TPG which tends to overvalue (TPG values include aspirational redemptions)",
    ],
  },
  transferPartners: {
    lastUpdated: "2026-04-20",
    sources: [
      "Amex: americanexpress.com/rewards/membership-rewards/transfer",
      "Chase: chase.com/personal/ultimate-rewards/transfer-partners",
      "Citi: thankyou.com/pointsTravel",
      "Capital One: capitalone.com/credit-cards/benefits/travel/transfer-partners",
    ],
  },
};

// ── How to keep data fresh ─────────────────────────────────────────────────────
//
// SHORT TERM (current implementation):
// - Award charts: manual update when devaluations announced (follow @thepointsguy, @onemileatatime)
// - Mile values in Redis: overridable via admin API without redeployment
// - Search results: cached 1h in Redis, so stale data is served max 1h
//
// MEDIUM TERM (recommended next steps):
// 1. Add a "lastVerified" field per program in Redis
// 2. Build a simple admin UI at /admin to update values without code deploys
// 3. Subscribe to loyalty program RSS/newsletters for devaluation alerts
// 4. Cron job that checks TPG valuations page monthly and alerts if drift > 20%
//
// LONG TERM (V2+):
// 1. Integrate Seats.aero API for real-time award availability + actual pricing
// 2. Scrape Flying Blue pricing API (they expose dynamic prices via search)
// 3. Build community-sourced data: users report their redemption values
// 4. Machine learning on historical data to predict optimal booking windows
