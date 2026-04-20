// lib/dataFreshness.ts
// ═══════════════════════════════════════════════════════════════════════════════
// KEZA DATA FRESHNESS — FULLY AUTOMATIC SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════
//
// ZERO manual intervention required. Here's how each data layer stays fresh:
//
// ┌─────────────────────────────────────────────────────────────────────────────┐
// │  LAYER 1: MILE VALUES (auto-calibrating)                                   │
// │  ─────────────────────────────────────────────────────────────────────────  │
// │  HOW: Every user search records an "observation" — the implied value of     │
// │       a mile based on (cashPrice - taxes) / milesRequired.                  │
// │  WHEN: Real-time (fire-and-forget after each search)                        │
// │  CRON: Daily at 03:00 UTC, recalibrate() aggregates observations and        │
// │        adjusts Redis values using weighted median + 30% static baseline.    │
// │  SAFETY: Values clamped to ±50% of static baseline. Minimum 10 obs needed. │
// │  RESULT: The more searches happen, the more accurate mile values become.    │
// ├─────────────────────────────────────────────────────────────────────────────┤
// │  LAYER 2: FOREX RATE USD → XOF (auto-fetched)                              │
// │  ─────────────────────────────────────────────────────────────────────────  │
// │  HOW: Fetched from open.er-api.com (free, no API key).                      │
// │  WHEN: On-demand via /api/forex, cached 12h in Redis.                       │
// │  CRON: Also refreshed daily by the miles-prices cron.                       │
// │  FALLBACK: If all APIs fail, uses last cached value or 605 XOF/USD.         │
// ├─────────────────────────────────────────────────────────────────────────────┤
// │  LAYER 3: AWARD CHARTS (static baseline, rare changes)                     │
// │  ─────────────────────────────────────────────────────────────────────────  │
// │  HOW: Hardcoded in awardCharts.ts — these are official published charts.    │
// │  WHEN THEY CHANGE: Airlines announce devaluations 1-2× per year.           │
// │  DETECTION: The auto-calibration system will detect when implied values     │
// │             drift significantly from chart predictions, indicating a        │
// │             devaluation happened. This shows in the cron report.            │
// │  ACTION: Redeploy with updated charts (unavoidable — charts are complex).   │
// ├─────────────────────────────────────────────────────────────────────────────┤
// │  LAYER 4: SEARCH RESULTS CACHE (auto-expiring)                             │
// │  ─────────────────────────────────────────────────────────────────────────  │
// │  HOW: Redis cache with 1h TTL per search query.                             │
// │  RESULT: Users always see data < 1h old for repeated searches.              │
// └─────────────────────────────────────────────────────────────────────────────┘
//
// ── Monitoring ─────────────────────────────────────────────────────────────────
// GET /api/cron/miles-prices (with CRON_SECRET) returns a full report:
//   - Which programs were recalibrated and by how much
//   - Current forex rate
//   - Which programs fell back to static (no observations)
//
// GET /api/admin/update-data (with ADMIN_SECRET) shows current state:
//   - Static vs Redis vs effective values for each program
//   - Last update timestamp
//
// ── When to redeploy ───────────────────────────────────────────────────────────
// Only needed when:
// 1. An airline announces a major chart devaluation (new award chart values)
// 2. A new loyalty program is added
// 3. Transfer partner relationships change (very rare)
// 4. New airports or zones are needed
//
// Everything else (mile values, forex, search freshness) is automatic.

export const DATA_VERSION = 7;
