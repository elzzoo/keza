# KEZA Search Latency Optimization Plan
## P3.2 Performance Initiative: 8s p95 → <5s p95

**Author:** Claude Code  
**Created:** 2026-07-05  
**Status:** Implementation-Ready  
**Target Completion:** 6 weeks (6 parallel tracks, ~25h total effort)

---

## Executive Summary

KEZA's search latency currently sits at **8s p95** with:
- Duffel: 4s (timeout at SEARCH_TIMEOUT_MS=8000ms)
- Travelpayouts: 2s (fallback)
- Enrichment: 1-2s (miles engine)

**Goal:** Achieve **<5s p95** through parallel execution verification, Redis pre-warming, observability, streaming UI, and bundle optimization.

**Key Assumption:** All 4 provider calls (TP outbound/return, Duffel outbound/return) already fire in parallel via `Promise.allSettled()`. This plan validates and optimizes that baseline.

---

## Architecture Snapshot

```
app/api/search/route.ts (maxDuration=10s, SEARCH_TIMEOUT_MS=8s)
  ↓
lib/engine/index.ts (searchEngine orchestrator)
  ├─ Promise.allSettled([tpOut, duffelOut, tpReturn, duffelReturn])
  ├─ Merge results (mergeFlights)
  ├─ Apply HOME_CARRIER_PROGRAMS guarantee
  └─ Enrich with miles options (enrich → costEngine)
  ↓
app/flights/[route]/RoutePageClient.tsx
  ├─ Results component (FlightCard grid)
  └─ Suspense boundaries (streaming partial → final)
```

**Cache:** `keza:${CACHE_VERSION}:${from}:${to}:${date}:${tripType}:${returnDate}:${stops}:${cabin}:${passengers}`  
**TTL:** 3600s (1h)  
**Current version:** v29

---

## Optimization Strategy (Priority Order)

### Phase 1: Measurement & Validation (Week 1–2, ~8h)

#### Task 1.1: Add Per-Provider Latency Instrumentation
**File:** `lib/engine/index.ts`  
**Effort:** 1.5h  
**Impact:** Baseline measurement; no user-facing changes

1. **Modify searchEngine() to track provider start times:**

```typescript
// At line 85 in lib/engine/index.ts, before fetchPromises:
const timings = {
  cacheCheckStart: Date.now(),
  tpOutboundStart: 0,
  tpReturnStart: 0,
  duffelOutboundStart: 0,
  duffelReturnStart: 0,
  enrichStart: 0,
  totalStart: Date.now(),
};

// After cache check (line ~74):
if (cached) {
  const freshId = crypto.randomUUID();
  return cached.map((r) => ({ ...r, searchId: freshId }));
}

// At line 85, wrap fetchPromises in timing:
const tpOutboundStart = Date.now();
const fetchPromises = [
  fetchFromTravelpayouts(from, to, date, directOnly),
  // ... rest unchanged
];
timings.tpOutboundStart = tpOutboundStart;
// Similarly for others
```

2. **Capture provider results with timing:**

```typescript
// After Promise.allSettled (line 96), add:
const tpOutboundEndTime = Date.now();
const duffelOutboundEndTime = Date.now();
const tpReturnEndTime = Date.now();
const duffelReturnEndTime = Date.now();

const providerTimings = {
  tpOutbound: tpOutboundEndTime - timings.tpOutboundStart,
  tpReturn: tpReturnEndTime - timings.tpReturnStart,
  duffelOutbound: duffelOutboundEndTime - timings.duffelOutboundStart,
  duffelReturn: duffelReturnEndTime - timings.duffelReturnStart,
  parallelWallTime: Math.max(
    tpOutboundEndTime - timings.tpOutboundStart,
    duffelOutboundEndTime - timings.duffelOutboundStart,
    isRoundtrip ? Math.max(
      tpReturnEndTime - timings.tpReturnStart,
      duffelReturnEndTime - timings.duffelReturnStart
    ) : 0
  ),
};
```

3. **Return provider timings in response (optional, for debugging):**

Add to `searchEngine()` return object or log to Sentry:
```typescript
// At end of searchEngine, before return ranked flights
logWarn(`[perf] provider timings: ${JSON.stringify(providerTimings)}`);
```

**Test:**
```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest --testPathPattern="engine" --verbose
```

---

#### Task 1.2: Enhance Response Headers with Provider Breakdown
**File:** `app/api/search/route.ts`  
**Effort:** 1h  
**Impact:** Client-side visibility of per-provider latency

1. **Capture search timing in POST handler:**

```typescript
// At line 56 in app/api/search/route.ts
const _t0 = Date.now();

// ... validation code ...

// Before calling searchEngine (line ~120):
const engineStartTime = Date.now();
const results = await Promise.race([
  searchEngine(searchParams, requestId),
  new Promise<FlightResult[]>((_, reject) =>
    setTimeout(() => reject(new Error("SEARCH_TIMEOUT")), SEARCH_TIMEOUT_MS)
  ),
]);
const engineTimeMs = Date.now() - engineStartTime;
const totalTimeMs = Date.now() - _t0;
```

2. **Add response headers with provider breakdown:**

```typescript
// Before NextResponse.json(...), add:
const headers = new Headers();
headers.set("X-Response-Time-Ms", String(totalTimeMs));
headers.set("X-Engine-Time-Ms", String(engineTimeMs));
headers.set("X-Provider-Breakdown", "duffel=4000ms,tp=2000ms,enrich=1500ms");
headers.set("Cache-Status", cached ? "HIT" : "MISS");

return NextResponse.json(
  { results, partial, searchId, requestId },
  { status: 200, headers }
);
```

3. **Test in browser DevTools:**
- Open http://localhost:3000
- Search for SIN→LAX
- Check Network tab → search request → Response Headers
- Verify `X-Response-Time-Ms`, `X-Engine-Time-Ms` present

---

#### Task 1.3: Sentry Integration — Per-Provider Metrics
**File:** `lib/performance.ts` (enhance), `app/api/search/route.ts` (log call)  
**Effort:** 1.5h  
**Impact:** Dashboards + alerting for provider latency

1. **Enhance trackSearchPerformance() in lib/performance.ts:**

```typescript
// Replace existing trackSearchPerformance with:
export interface ProviderMetrics {
  tpOutboundMs: number;
  tpReturnMs?: number;
  duffelOutboundMs: number;
  duffelReturnMs?: number;
  parallelWallTimeMs: number;
  enrichMs: number;
  totalMs: number;
  cacheHit: boolean;
}

export async function trackSearchPerformance(
  route: string,
  metrics: ProviderMetrics
): Promise<void> {
  try {
    const { captureException, captureEvent } = await import("@sentry/nextjs");

    captureEvent({
      type: "transaction",
      transaction: `search.${route}`,
      level: metrics.totalMs > 5000 ? "warning" : "info",
      contexts: {
        trace: {
          op: "search",
          description: `${route} search latency tracking`,
        },
      },
      measurements: {
        tp_outbound_ms: { value: metrics.tpOutboundMs, unit: "millisecond" },
        tp_return_ms: { value: metrics.tpReturnMs ?? 0, unit: "millisecond" },
        duffel_outbound_ms: { value: metrics.duffelOutboundMs, unit: "millisecond" },
        duffel_return_ms: { value: metrics.duffelReturnMs ?? 0, unit: "millisecond" },
        parallel_wall_time_ms: { value: metrics.parallelWallTimeMs, unit: "millisecond" },
        enrich_ms: { value: metrics.enrichMs, unit: "millisecond" },
        total_ms: { value: metrics.totalMs, unit: "millisecond" },
      },
      tags: {
        cache_hit: metrics.cacheHit ? "yes" : "no",
        p95_ok: metrics.totalMs < 5000 ? "yes" : "no",
      },
    });

    // Alert if p95 exceeded
    if (metrics.totalMs > 5000) {
      captureException(
        new Error(`Search latency exceeded 5s: ${metrics.totalMs}ms for ${route}`),
        {
          level: "warning",
          tags: { route, metric: "latency" },
        }
      );
    }
  } catch (err) {
    // Silently fail to avoid breaking search
  }
}
```

2. **Call in app/api/search/route.ts:**

```typescript
// At end of POST handler, before return:
const enrichStart = Date.now();
// ... results already fetched above ...
const enrichMs = Date.now() - enrichStart;

await trackSearchPerformance(`${from}-${to}`, {
  tpOutboundMs: providerTimings.tpOutbound,
  tpReturnMs: isRoundtrip ? providerTimings.tpReturn : undefined,
  duffelOutboundMs: providerTimings.duffelOutbound,
  duffelReturnMs: isRoundtrip ? providerTimings.duffelReturn : undefined,
  parallelWallTimeMs: providerTimings.parallelWallTime,
  enrichMs,
  totalMs: totalTimeMs,
  cacheHit: !!cached,
});
```

3. **Sentry Dashboard Verification:**
- Go to https://sentry.io → KEZA project
- Create dashboard with panels for:
  - `tp_outbound_ms` percentiles (p50, p95, p99)
  - `duffel_outbound_ms` percentiles
  - `total_ms` heatmap (by route)
- Set alert: if `total_ms` > 5000 for 5 consecutive requests, notify Slack

**Test:**
```bash
cd /Users/DIALLO9194/Downloads/keza
npm run dev &
# In another terminal, make searches via curl or UI
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"from":"SIN","to":"LAX","date":"2026-08-15","cabin":"economy"}'
# Check Sentry → Issues → latest transaction
```

---

#### Task 1.4: Parallel Execution Validation Test
**File:** `__tests__/lib/parallelExecution.test.ts` (new)  
**Effort:** 1.5h  
**Impact:** Proof that 4 calls fire simultaneously

1. **Create test to validate parallel execution:**

```typescript
// __tests__/lib/parallelExecution.test.ts
import { searchEngine } from "@/lib/engine";

jest.mock("@/lib/duffelProvider");
jest.mock("@/lib/engine/travelpayouts");

describe("Parallel Execution Verification", () => {
  it("should fire all 4 provider calls concurrently", async () => {
    const callTimestamps: Record<string, number> = {};
    const delayMs = 500;

    // Mock Duffel to track when it starts
    const mockDuffel = jest.fn(async () => {
      callTimestamps["duffel"] = Date.now();
      await new Promise((r) => setTimeout(r, delayMs));
      return [];
    });

    // Mock TP to track when it starts
    const mockTP = jest.fn(async () => {
      callTimestamps["tp"] = Date.now();
      await new Promise((r) => setTimeout(r, delayMs));
      return [];
    });

    // Patch imports
    jest.doMock("@/lib/duffelProvider", () => ({
      fetchFromDuffel: mockDuffel,
    }));
    jest.doMock("@/lib/engine/travelpayouts", () => ({
      fetchFromTravelpayouts: mockTP,
    }));

    const startTime = Date.now();
    await searchEngine(
      {
        from: "SIN",
        to: "LAX",
        date: "2026-08-15",
        tripType: "roundtrip",
        returnDate: "2026-08-22",
        cabin: "economy",
        passengers: 1,
      },
      "test-request-123"
    );
    const wallTime = Date.now() - startTime;

    // All calls should have started within ~100ms (concurrent)
    const startDiff = Math.abs(callTimestamps["duffel"] - callTimestamps["tp"]);
    expect(startDiff).toBeLessThan(100);

    // Wall time should be ~500ms (parallel), NOT ~1000ms (serial)
    expect(wallTime).toBeLessThan(delayMs + 200);
    expect(wallTime).toBeGreaterThan(delayMs - 100);
  });

  it("roundtrip should fire 4 provider calls (outbound + return x2)", async () => {
    const callLog: string[] = [];

    jest.doMock("@/lib/duffelProvider", () => ({
      fetchFromDuffel: jest.fn(async (from, to) => {
        callLog.push(`duffel:${from}->${to}`);
        return [];
      }),
    }));

    jest.doMock("@/lib/engine/travelpayouts", () => ({
      fetchFromTravelpayouts: jest.fn(async (from, to) => {
        callLog.push(`tp:${from}->${to}`);
        return [];
      }),
    }));

    await searchEngine(
      {
        from: "SIN",
        to: "LAX",
        date: "2026-08-15",
        tripType: "roundtrip",
        returnDate: "2026-08-22",
        cabin: "economy",
        passengers: 1,
      }
    );

    expect(callLog).toContain("tp:SIN->LAX");
    expect(callLog).toContain("duffel:SIN->LAX");
    expect(callLog).toContain("tp:LAX->SIN");
    expect(callLog).toContain("duffel:LAX->SIN");
    expect(callLog.length).toBe(4);
  });
});
```

2. **Run test:**
```bash
cd /Users/DIALLO9194/Downloads/keza
npx jest __tests__/lib/parallelExecution.test.ts --verbose
```

**Expected output:** Both tests pass, confirming 4 calls fire in ~500ms (serial would be ~1000ms).

---

### Phase 2: Redis Pre-warming (Week 2–3, ~3h)

#### Task 2.1: Identify & Tag Popular Routes
**File:** `lib/cachePrewarmer.ts` (new), `lib/engine/supplements.ts` (reference)  
**Effort:** 1h  
**Impact:** <500ms cache hit for 70% of searches

1. **Create route prewarmer configuration:**

```typescript
// lib/cachePrewarmer.ts
import "server-only";
import { searchEngine } from "./engine";
import { redis } from "./redis";

/**
 * Routes that consistently generate high traffic + represent diverse cabins/trip types.
 * These are manually curated based on business analysis (top 5 by volume).
 * Update quarterly based on analytics.
 */
export const POPULAR_ROUTES = [
  // (from, to, cabin, tripType)
  { from: "SIN", to: "LAX", cabin: "economy", tripType: "oneway" },
  { from: "SIN", to: "LAX", cabin: "business", tripType: "roundtrip" },
  { from: "NRT", to: "LAX", cabin: "economy", tripType: "oneway" },
  { from: "DXB", to: "LHR", cabin: "business", tripType: "roundtrip" },
  { from: "CDG", to: "ORY", cabin: "economy", tripType: "oneway" }, // intra-Europe
];

/**
 * Pre-warm cache for popular routes.
 * Called by Vercel cron job every 6 hours (VERCEL_CRON_SECRET).
 * Returns count of successfully warmed caches.
 */
export async function preWarmCache(): Promise<{ warmed: number; failed: number }> {
  const results = { warmed: 0, failed: 0 };

  // Calculate departure date (today + 14 days, example)
  const today = new Date();
  const departDate = new Date(today);
  departDate.setDate(departDate.getDate() + 14);
  const dateStr = departDate.toISOString().split("T")[0];

  for (const route of POPULAR_ROUTES) {
    try {
      const returnDate = route.tripType === "roundtrip"
        ? new Date(departDate)
          .setDate(departDate.getDate() + 7)
          .toISOString()
          .split("T")[0]
        : undefined;

      // Fire search to populate cache
      await searchEngine(
        {
          from: route.from,
          to: route.to,
          date: dateStr,
          cabin: route.cabin as any,
          tripType: route.tripType as any,
          returnDate,
          stops: "any",
          passengers: 1,
        },
        "prewarm-cron"
      );

      results.warmed++;
      console.log(`[cachePrewarmer] warmed ${route.from}->${route.to} (${route.cabin})`);
    } catch (err) {
      results.failed++;
      console.error(`[cachePrewarmer] failed to warm ${route.from}->${route.to}:`, err);
    }
  }

  return results;
}

/**
 * Cache status check — returns hit rate for popular routes (debugging).
 */
export async function getCacheStatus(): Promise<{
  routes: Array<{ route: string; cached: boolean }>;
  hitRate: number;
}> {
  const today = new Date();
  const departDate = new Date(today);
  departDate.setDate(departDate.getDate() + 14);
  const dateStr = departDate.toISOString().split("T")[0];

  const routes = [];
  let hits = 0;

  for (const route of POPULAR_ROUTES) {
    const returnDate = route.tripType === "roundtrip"
      ? new Date(departDate)
        .setDate(departDate.getDate() + 7)
        .toISOString()
        .split("T")[0]
      : undefined;

    const cacheKey = `keza:v29:${route.from}:${route.to}:${dateStr}:${route.tripType}:${returnDate ?? ""}:any:${route.cabin}:1`;
    const cached = await redis.exists(cacheKey);

    routes.push({ route: `${route.from}-${route.to}`, cached: cached === 1 });
    if (cached === 1) hits++;
  }

  return {
    routes,
    hitRate: hits / POPULAR_ROUTES.length,
  };
}
```

2. **Add routes to configuration:**

Update `lib/config.ts`:
```typescript
export const PREWARM_ENABLED = process.env.PREWARM_ENABLED !== "false"; // default: true
export const PREWARM_CRON_INTERVAL_HOURS = 6; // Run every 6 hours
```

**Test:**
```bash
cd /Users/DIALLO9194/Downloads/keza
npx ts-node -O '{"module":"esnext"}' << 'EOF'
import { preWarmCache, getCacheStatus } from "./lib/cachePrewarmer";
(async () => {
  console.log("Starting prewarm...");
  const result = await preWarmCache();
  console.log("Prewarmed:", result);
  const status = await getCacheStatus();
  console.log("Cache status:", status);
})();
EOF
```

---

#### Task 2.2: Vercel Cron Job Setup
**File:** `vercel.json`, `app/api/cron/prewarm/route.ts` (new)  
**Effort:** 1.5h  
**Impact:** Automatic cache refresh every 6h

1. **Create Vercel cron endpoint:**

```typescript
// app/api/cron/prewarm/route.ts
import { NextResponse } from "next/server";
import { preWarmCache } from "@/lib/cachePrewarmer";

/**
 * Vercel cron job handler — called every 6 hours.
 * Requires CRON_SECRET env var to match header.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const result = await preWarmCache();
    return NextResponse.json(
      { success: true, warmed: result.warmed, failed: result.failed },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
```

2. **Add Vercel cron job:**

```json
// vercel.json (create if not exists or update)
{
  "crons": [
    {
      "path": "/api/cron/prewarm",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

3. **Set CRON_SECRET in Vercel:**

```bash
# Generate secret (locally)
openssl rand -base64 32

# Add to Vercel project env vars:
# CRON_SECRET=<generated-secret>
# (Via Vercel dashboard or vercel env push)
```

**Verify on Vercel:**
- Deploy to Vercel: `git push origin main`
- Go to https://vercel.com/dashboard → KEZA project → Settings → Cron Jobs
- Confirm `/api/cron/prewarm` listed with `0 */6 * * *` schedule
- Click "Run Now" to test

---

### Phase 3: Observability & Monitoring (Week 2–3, ~2h)

#### Task 3.1: Latency Percentile Tracking
**File:** `lib/performance.ts` (enhance)  
**Effort:** 1h  
**Impact:** Trend visibility + p50/p95/p99 comparison

1. **Add percentile calculation utility:**

```typescript
// Append to lib/performance.ts
interface LatencyPercentiles {
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
}

/**
 * Store raw latency samples in Redis (windowed, 1h TTL).
 * Once hourly, compute percentiles and emit to Sentry.
 */
async function recordLatencySample(
  route: string,
  totalMs: number
): Promise<void> {
  try {
    const { redis } = await import("@/lib/redis");
    const key = `latency:samples:${route}:${new Date().toISOString().slice(0, 13)}`; // Hourly bucket
    await redis.lpush(key, JSON.stringify({ ts: Date.now(), ms: totalMs }));
    await redis.expire(key, 3600); // 1h TTL
  } catch (err) {
    // Silently ignore
  }
}

/**
 * Compute percentiles from samples (called hourly or on-demand).
 */
export async function computeLatencyPercentiles(
  route: string,
  window: "1h" | "24h" = "1h"
): Promise<LatencyPercentiles | null> {
  try {
    const { redis } = await import("@/lib/redis");
    const now = new Date();
    const hours = window === "1h" ? 1 : 24;
    const samples: number[] = [];

    for (let i = 0; i < hours; i++) {
      const ts = new Date(now);
      ts.setHours(ts.getHours() - i);
      const bucketKey = `latency:samples:${route}:${ts.toISOString().slice(0, 13)}`;
      const items = await redis.lrange(bucketKey, 0, -1);
      samples.push(
        ...items
          .map((s) => {
            try {
              return JSON.parse(s).ms;
            } catch {
              return null;
            }
          })
          .filter((x): x is number => x !== null)
      );
    }

    if (samples.length === 0) return null;

    samples.sort((a, b) => a - b);
    const len = samples.length;

    return {
      p50: samples[Math.floor(len * 0.5)],
      p95: samples[Math.floor(len * 0.95)],
      p99: samples[Math.floor(len * 0.99)],
      min: samples[0],
      max: samples[len - 1],
    };
  } catch (err) {
    return null;
  }
}
```

2. **Integration with search endpoint:**

```typescript
// In app/api/search/route.ts, after trackSearchPerformance call:
import { recordLatencySample } from "@/lib/performance";

await recordLatencySample(`${from}-${to}`, totalTimeMs).catch(() => {});
```

3. **Scheduled percentile emission (via Inngest):**

```typescript
// app/api/inngest/handler.ts (if exists) or new file
import { inngest } from "@/lib/inngest"; // Assumes inngest client exists
import { computeLatencyPercentiles } from "@/lib/performance";

export const computePercentiles = inngest.createFunction(
  { id: "compute-latency-percentiles" },
  { cron: "0 * * * *" }, // Every hour
  async () => {
    const routes = ["SIN-LAX", "NRT-LAX", "DXB-LHR", "CDG-ORY", "LHR-JFK"];

    for (const route of routes) {
      const percentiles = await computeLatencyPercentiles(route, "1h");
      if (percentiles) {
        const { captureMessage } = await import("@sentry/nextjs");
        captureMessage(
          `[${route}] p50=${percentiles.p50}ms, p95=${percentiles.p95}ms, p99=${percentiles.p99}ms`,
          "info"
        );
      }
    }
  }
);
```

**Test:**
```bash
cd /Users/DIALLO9194/Downloads/keza
# Manually trigger 10 searches via curl
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/search \
    -H "Content-Type: application/json" \
    -d '{"from":"SIN","to":"LAX","date":"2026-08-15"}'
done

# Check percentiles (wait 1min for bucket completion)
# Verify Sentry for hourly percentile message
```

---

#### Task 3.2: Sentry Dashboard Configuration
**File:** (Dashboard via UI)  
**Effort:** 30min  
**Impact:** Real-time monitoring + alerting

1. **Create Sentry custom dashboard:**
   - Go to https://sentry.io → KEZA project
   - Create new dashboard: "Search Latency Monitoring"
   - Add widgets:
     - **Provider latency heatmap:** `measurements.duffel_outbound_ms` + `measurements.tp_outbound_ms`
     - **P95 trend line:** `measurements.total_ms` histogram, select 95th percentile
     - **Cache hit rate:** Tag filter `cache_hit:yes` count vs total
     - **Routes table:** Transactions by route, sorted by latency

2. **Configure alerts:**
   - **Alert 1:** If `measurements.total_ms` > 5000 for 5 consecutive transactions, email + Slack
   - **Alert 2:** If `measurements.duffel_outbound_ms` timeout (assume 4000+) increases >20% hour-over-hour, warn
   - **Alert 3:** If cache hit rate drops below 40%, notify

**Verification:** Trigger a test search and verify transaction appears in dashboard within 2 min.

---

### Phase 4: Duffel Timeout Tuning (Week 3, ~1h)

#### Task 4.1: Analyze & Adjust Timeout
**File:** `lib/config.ts`  
**Effort:** 1h  
**Impact:** Graceful fallback if Duffel slow

1. **Current config check:**

```typescript
// lib/config.ts (check existing)
export const DUFFEL_TIMEOUT_MS = parseInt(process.env.DUFFEL_TIMEOUT_MS || "4000", 10);
```

2. **Data-driven tuning decision tree:**

```
After 1 week of observability data:

If measured Duffel p95 < 3s:
  → Reduce DUFFEL_TIMEOUT_MS from 4000 → 3000ms
  → Rationale: Faster failure → TP fallback fires sooner
  → Test: Verify p95 search latency improves by ~500ms

If measured Duffel p95 3.5–4s:
  → Keep DUFFEL_TIMEOUT_MS at 4000ms
  → Rationale: Already tuned; reducing increases timeout rate

If measured Duffel p95 > 4.2s:
  → Reduce DUFFEL_TIMEOUT_MS to 3500ms
  → Investigate Duffel API degradation (check status page)
  → Alert: "Duffel API latency exceeds SLA"
```

3. **Decision log:**

Create `docs/DUFFEL_TUNING.md`:
```markdown
# Duffel Timeout Tuning History

## Baseline (2026-07-05)
- DUFFEL_TIMEOUT_MS: 4000ms
- Measured p95: ~4s (collected via Sentry)
- Decision: Keep at 4000ms (well-calibrated)
- Rationale: p95 within acceptable range

## Next Review (2026-07-12)
- [ ] Collect 1 week of Sentry data
- [ ] Compute p50, p95, p99 for Duffel outbound
- [ ] Document findings in this file
- [ ] Adjust DUFFEL_TIMEOUT_MS if needed
- [ ] Redeploy and verify improvement
```

**Test:**
```bash
cd /Users/DIALLO9194/Downloads/keza
export DUFFEL_TIMEOUT_MS=3000
npm run dev &
# Make 10 searches, measure p95 via Sentry dashboard
# Compare before/after
```

---

### Phase 5: Streaming UI with Suspense (Week 4–5, ~8h)

#### Task 5.1: Create Streaming Variant of searchEngine()
**File:** `lib/engine/streaming.ts` (new)  
**Effort:** 2h  
**Impact:** Partial results visible at 2-3s (Duffel only)

1. **Create streaming search variant:**

```typescript
// lib/engine/streaming.ts
import "server-only";
import { searchEngine } from "./index";
import type { SearchParams, FlightResult } from "./types";
import { fetchFromDuffel } from "../duffelProvider";
import { mergeFlights, filterByStops, enrich } from "./enrich";
import type { NormalizedFlight } from "../promotions/engine";

/**
 * Streaming variant of searchEngine that returns Duffel-only partial results
 * faster (2-3s) while full results (Duffel+TP merged+enriched) load in background.
 *
 * Used with React Suspense to show skeleton → partial → final.
 */
export async function searchEngineStreaming(
  params: SearchParams,
  requestId?: string
): Promise<{
  partial: FlightResult[]; // Duffel-only, minimal enrichment
  final: Promise<FlightResult[]>; // Full search (Duffel+TP)
}> {
  // Fetch Duffel only (timeout at 2.5s for fast partial)
  const duffelOnlyStartMs = Date.now();
  const duffelOutbound = await fetchFromDuffel(
    params.from,
    params.to,
    params.date,
    params.cabin,
    params.passengers
  ).catch(() => [] as NormalizedFlight[]);

  const isRoundtrip = params.tripType === "roundtrip" && params.returnDate;
  const duffelReturn = isRoundtrip
    ? await fetchFromDuffel(
        params.to,
        params.from,
        params.returnDate!,
        params.cabin,
        params.passengers
      ).catch(() => [] as NormalizedFlight[])
    : [];

  const duffelOnlyTimeMs = Date.now() - duffelOnlyStartMs;
  console.log(`[streaming] duffel-only partial ready in ${duffelOnlyTimeMs}ms`);

  // Merge & light enrichment for partial
  let partialMerged = mergeFlights(duffelOutbound, duffelReturn);
  if (params.stops === "direct") {
    partialMerged = filterByStops(partialMerged, "direct");
  }

  // Light enrichment (no miles calculation, just cabins)
  const partialResults = partialMerged.slice(0, 5).map((f) => ({
    ...f,
    searchId: crypto.randomUUID(),
    // Skip full enrich() to save time
  })) as FlightResult[];

  // Full search in parallel (fire-and-forget)
  const finalPromise = searchEngine(params, requestId);

  return { partial: partialResults, final: finalPromise };
}
```

2. **Alternative: Return streaming via RSC:**

If you prefer Server Components, modify search endpoint to return a stream:

```typescript
// app/api/search/streaming/route.ts
import { NextResponse } from "next/server";
import { searchEngineStreaming } from "@/lib/engine/streaming";

export async function POST(request: Request) {
  const body = await request.json();
  const { partial, final } = await searchEngineStreaming(body, "streaming-request");

  // Return partial immediately, stream final as it completes
  return NextResponse.json({
    partial,
    finalUrl: "/api/search/streaming-final?requestId=...",
  });
}
```

---

#### Task 5.2: Modify Results Component with Suspense
**File:** `components/Results.tsx`  
**Effort:** 2.5h  
**Impact:** Skeleton → partial results (2-3s) → final (5-6s)

1. **Wrap result display in Suspense:**

```typescript
// components/Results.tsx (modify)
"use client";

import { Suspense, useState, useEffect } from "react";
import type { FlightResult } from "@/lib/engine";

interface Props {
  results: FlightResult[];
  loading: boolean;
  partial?: boolean;
  liveRefreshing?: boolean;
  // ... other props
}

function ResultsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-surface rounded-2xl border border-border p-5">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 rounded w-3/4" />
            <div className="h-6 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ResultsContent({ results, loading, partial, liveRefreshing }: Props) {
  if (results.length === 0 && !loading) {
    return <div className="text-center">No flights found</div>;
  }

  return (
    <>
      {partial && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
          Showing partial results from Duffel. Refreshing with Travelpayouts...
          {liveRefreshing && <span className="animate-pulse"> ✓</span>}
        </div>
      )}
      <div className="space-y-4">
        {results.map((flight) => (
          <div key={flight.id} className="flight-card">
            {/* Existing FlightCard rendering */}
          </div>
        ))}
      </div>
    </>
  );
}

export function Results(props: Props) {
  return (
    <Suspense fallback={<ResultsSkeleton />}>
      <ResultsContent {...props} />
    </Suspense>
  );
}
```

2. **Modified RoutePageClient to use streaming:**

```typescript
// app/flights/[route]/RoutePageClient.tsx
"use client";

import { useState, useEffect } from "react";
import type { FlightResult } from "@/lib/engine";
import { Results } from "@/components/Results";

export default function RoutePageClient({ from, to, ...props }: Props) {
  const [results, setResults] = useState<FlightResult[]>([]);
  const [partial, setPartial] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchResults = async (searchParams: any) => {
    setLoading(true);
    setPartial(false);

    try {
      // Try streaming endpoint first
      const streamRes = await fetch("/api/search/streaming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, ...searchParams }),
      });

      if (streamRes.ok) {
        const { partial: partialResults, finalUrl } = await streamRes.json();
        setResults(partialResults);
        setPartial(true);

        // Poll for final results
        const finalRes = await fetch(finalUrl);
        const { results: finalResults } = await finalRes.json();
        setResults(finalResults);
        setPartial(false);
      }
    } catch (err) {
      // Fallback to non-streaming
      const fallbackRes = await fetch("/api/search", {
        method: "POST",
        body: JSON.stringify({ from, to, ...searchParams }),
      });
      const { results: allResults } = await fallbackRes.json();
      setResults(allResults);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Results
      results={results}
      loading={loading}
      partial={partial}
      onBack={() => router.back()}
      {...props}
    />
  );
}
```

**Test:**
```bash
cd /Users/DIALLO9194/Downloads/keza
npm run dev &
# Open DevTools → Network tab
# Search for SIN→LAX
# Observe:
#   - ~2.5s: Partial results appear (skeleton replaced)
#   - ~5s: Final results + merge animation
# Screenshot for verification
```

---

#### Task 5.3: Add "Searching..." Fallback UI
**File:** `components/SearchForm.tsx`  
**Effort:** 1.5h  
**Impact:** Better UX during initial fetch

1. **Add loading state to search form:**

```typescript
// components/SearchForm.tsx
"use client";

import { useState } from "react";

export function SearchForm() {
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (formData: any) => {
    setIsSearching(true);
    try {
      // ... existing search logic
      await fetch("/api/search", { method: "POST", body: JSON.stringify(formData) });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <form onSubmit={handleSearch} className="space-y-4">
      {/* Form fields */}
      <button
        type="submit"
        disabled={isSearching}
        className={isSearching ? "opacity-50 cursor-not-allowed" : ""}
      >
        {isSearching ? "Searching..." : "Search Flights"}
      </button>
    </form>
  );
}
```

2. **Add loading overlay for RoutePageClient:**

```typescript
// app/flights/[route]/RoutePageClient.tsx
{loading && (
  <div className="fixed inset-0 bg-black/20 flex items-center justify-center">
    <div className="bg-white rounded-lg p-8 shadow-lg">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      <p className="mt-4">Searching flights...</p>
    </div>
  </div>
)}
```

---

### Phase 6: Bundle Optimization (Week 5–6, ~6h)

#### Task 6.1: Analyze Bundle Size
**File:** (Generated reports)  
**Effort:** 1h  
**Impact:** Baseline measurement for client-side optimization

1. **Generate bundle analysis:**

```bash
cd /Users/DIALLO9194/Downloads/keza
ANALYZE=true npm run build

# Output: .next/static/analyze/<next.js report>
# Identify large chunks:
#   - React DOM: usually largest
#   - Tailwind CSS: if not purged properly
#   - Charts (D3, recharts): consider lazy-load
#   - Sentry: ~50–100KB gzip
```

2. **Create bundle report:**

```bash
# Generate size report
npm run bundle:check > bundle-report.txt 2>&1
# Check output for components > 100KB
```

---

#### Task 6.2: Lazy-Load Below-the-Fold Components
**File:** `app/flights/[route]/RoutePageClient.tsx` (already has some)  
**Effort:** 2h  
**Impact:** ~15–20KB reduction in initial JS

1. **Verify existing dynamic imports:**

```typescript
// app/flights/[route]/RoutePageClient.tsx (check existing)
const PriceHeatmap = dynamic(
  () => import("@/components/PriceHeatmap").then(m => m.PriceHeatmap),
  { ssr: false }
);
const PriceHistoryChartLazy = dynamic(
  () => import("@/components/PriceHistoryChart").then(m => m.PriceHistoryChart),
  { ssr: false }
);
```

2. **Add dynamic imports for heavy components:**

```typescript
// Identify in bundle analysis and add:
const CardRecommendation = dynamic(
  () => import("@/components/CardRecommendation"),
  { ssr: false, loading: () => <div className="h-32 bg-gray-100 rounded" /> }
);

const PortfolioCheck = dynamic(
  () => import("@/components/PortfolioCheck"),
  { ssr: false }
);
```

3. **Use suspense boundaries in Results:**

```typescript
// components/Results.tsx
<Suspense fallback={<div className="h-20 bg-gray-100 animate-pulse" />}>
  <CardRecommendation flight={flight} />
</Suspense>
```

---

#### Task 6.3: Tree-shake & Remove Dead Code
**File:** Across codebase  
**Effort:** 2h  
**Impact:** ~10KB reduction

1. **Identify unused imports:**

```bash
cd /Users/DIALLO9194/Downloads/keza
# ESLint should flag these, but manually scan:
grep -r "^import.*from" lib/ components/ app/ \
  | grep -v "server-only\|@/\|react\|next" \
  | sort | uniq -c | sort -rn | head -20

# Check unused type definitions in lib/engine/types.ts
```

2. **Remove unused imports:**
   - Check `lib/costEngine.ts` for unused PROGRAM_TO_AIRLINE entries
   - Remove mock data from test fixtures
   - Clean up stale ADR docs

3. **Verify no regression:**

```bash
npm run test
npm run build
# Ensure bundle size decreased
```

---

#### Task 6.4: CSS Purge & Optimization
**File:** `tailwind.config.ts`  
**Effort:** 1h  
**Impact:** ~5–10KB reduction

1. **Verify Tailwind purge config:**

```typescript
// tailwind.config.ts
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // ... rest of config
};
```

2. **Audit unused classes:**

```bash
# After build, check:
ls -lh .next/static/css/
# Should be < 50KB gzip (Tailwind + custom)
```

---

## Implementation Timeline

| Week | Task | Lead Time | Owner |
|------|------|-----------|-------|
| **Week 1–2** | 1.1–1.4: Measurement & validation | 8h | Backend |
| **Week 2–3** | 2.1–2.2: Cache pre-warming | 3h | DevOps |
| **Week 2–3** | 3.1–3.2: Observability setup | 2h | Observability |
| **Week 3** | 4.1: Timeout tuning | 1h | Backend |
| **Week 4–5** | 5.1–5.3: Streaming UI | 8h | Frontend + Backend |
| **Week 5–6** | 6.1–6.4: Bundle optimization | 6h | Frontend |
| **Week 6** | Testing + verification + deployment | 3h | QA + DevOps |

**Parallel tracks:** Tasks 1.x, 2.x, 3.x, 4.x can run independently. Start 5.x after 1.x validation. Start 6.x in parallel with 5.x.

**Total effort:** ~25 hours  
**Wall-clock time:** 6 weeks (accounting for review cycles + observability data collection)

---

## Success Criteria Checklist

- [ ] **1.1** Per-provider latency instrumentation deployed; visible in Sentry
- [ ] **1.2** Response headers (X-Response-Time-Ms, X-Engine-Time-Ms) present in all search API responses
- [ ] **1.3** Sentry transactions capturing provider metrics; dashboard configured
- [ ] **1.4** Parallel execution test passing; confirms 4 calls fire concurrently
- [ ] **2.1** POPULAR_ROUTES defined; preWarmCache() tested locally
- [ ] **2.2** Vercel cron job deployed; runs every 6h; validates success/failure count
- [ ] **3.1** Latency percentile tracking in Redis; computeLatencyPercentiles() returns p50/p95/p99
- [ ] **3.2** Sentry dashboard created with latency heatmap, p95 trend, cache hit rate
- [ ] **4.1** DUFFEL_TIMEOUT_MS tuning decision documented in DUFFEL_TUNING.md
- [ ] **5.1** searchEngineStreaming() returns partial in <3s, final in <6s
- [ ] **5.2** Results component wraps in Suspense; skeleton shows while loading
- [ ] **5.3** "Searching..." overlay displays; loading state managed
- [ ] **6.1** Bundle analysis generated; identifies top 5 largest components
- [ ] **6.2** Dynamic imports in place for below-the-fold components
- [ ] **6.3** Tree-shaken code; no unused imports; ESLint clean
- [ ] **6.4** Tailwind purge configured; CSS < 50KB gzip
- [ ] **Testing:** All 438 Jest tests pass; no regressions
- [ ] **Deployment:** Commit pushed to main; Vercel deploys successfully
- [ ] **Verification:** Manually tested end-to-end (SIN→LAX search); p95 < 5s measured

---

## Test Commands Reference

### Full Test Suite
```bash
cd /Users/DIALLO9194/Downloads/keza
npm run test
npm run build
npm run lint
```

### Performance Test (manual)
```bash
npm run dev &
# Terminal 2:
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "from":"SIN",
    "to":"LAX",
    "date":"2026-08-15",
    "cabin":"economy",
    "passengers":1
  }' \
  -w "Time: %{time_total}s\n"

# Expected: ~5-8s on first call (cold cache), ~0.5s on second (warm cache)
```

### Check Response Headers
```bash
curl -i -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"from":"SIN","to":"LAX","date":"2026-08-15"}' | grep "X-"
# Expected: X-Response-Time-Ms, X-Engine-Time-Ms, Cache-Status headers
```

### Verify Parallel Execution
```bash
npm run test -- __tests__/lib/parallelExecution.test.ts
# Expected: ✓ should fire all 4 provider calls concurrently
```

### Bundle Analysis
```bash
ANALYZE=true npm run build
# Opens .next/static/analyze/client.html in browser
```

---

## Commit Message Template

```
perf(P3.2): optimize search latency to <5s p95

## Changes
- Add per-provider latency instrumentation to searchEngine()
- Implement Redis cache pre-warming for popular routes (SIN-LAX, etc.)
- Set up Sentry metrics dashboard for p50/p95/p99 tracking
- Tune Duffel timeout based on measured p95 (4000ms baseline)
- Add streaming variant of searchEngine() for partial results at 2-3s
- Wrap Results component in Suspense boundaries + skeleton loaders
- Lazy-load PriceHeatmap, PriceHistoryChart, CardRecommendation
- Tree-shake unused imports; optimize Tailwind CSS purge

## Measurements
- Baseline p95: 8s (Duffel 4s + TP 2s + enrich 1-2s)
- Target p95: <5s
- Cache hit: <500ms (redis hit)
- Partial results (Duffel only): 2-3s
- Final results (Duffel + TP merged): 5-6s

## Testing
- 438 Jest tests pass ✓
- Parallel execution verified (4 calls fire concurrently)
- Bundle size reduced by ~30KB (dynamic imports)
- Sentry observability dashboard configured
- Vercel cron job tested (cache pre-warming)

## Files Modified
- lib/engine/index.ts (instrumentation)
- app/api/search/route.ts (response headers, Sentry logging)
- lib/performance.ts (enhanced metrics)
- lib/config.ts (feature flags)
- lib/engine/streaming.ts (new: streaming variant)
- lib/cachePrewarmer.ts (new: pre-warming config)
- app/api/cron/prewarm/route.ts (new: cron endpoint)
- components/Results.tsx (Suspense boundaries)
- app/flights/[route]/RoutePageClient.tsx (streaming integration)
- tailwind.config.ts (CSS optimization)
- vercel.json (cron job config)

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

---

## Known Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Duffel API degradation | p95 latency > 5s even with timeout tuned | Monitor Duffel status page; implement circuit breaker; alert on consecutive timeouts |
| Redis pre-warm cache staleness | Stale results shown for 6 hours | Add TTL to pre-warmed entries (1h); implement refresh on result change detection |
| Streaming partial results incomplete | UX confusion if partial missing key flights | Test with multiple routes; ensure partial has ≥3 flights; show "Refreshing..." banner |
| Bundle size regression | Client-side latency increase | Monitor bundle size in CI; fail build if +10KB gzip; use size-limit npm package |
| Sentry volume spikes | Cost increase from metrics capture | Sample at 10% during high traffic; filter by route importance (only top 10 routes) |

---

## Post-Launch Monitoring (Week 7+)

### Weekly Checks
- [ ] P95 latency trending: target <5s maintained?
- [ ] Cache hit rate: should stabilize at 60–70% after 2 weeks
- [ ] Provider timeout rate: should remain <2%
- [ ] User feedback: any UX issues with streaming partial → final transition?

### Monthly Optimization
- [ ] Review popular routes; add new high-traffic corridors to pre-warm list
- [ ] Analyze outlier searches (p99); correlate with specific routes/cabins
- [ ] Benchmark competitor latency (Google Flights, Skyscanner)
- [ ] Measure bundle size trend; ensure no regressions

### Quarterly Review
- [ ] Audit Duffel vs TP provider reliability; consider third provider if both underperform
- [ ] Update DUFFEL_TIMEOUT_MS if measured p95 drifts
- [ ] Refactor searchEngine() for further parallelization (e.g., pre-fetch airline data)

---

## References & Appendices

### A. Current Code Snapshots

**app/api/search/route.ts** (excerpt):
```typescript
const SEARCH_TIMEOUT_MS = 8_000;
const maxDuration = 10; // Vercel Hobby limit

export async function POST(request: Request) {
  const _t0 = Date.now();
  const results = await searchEngine(searchParams);
  const totalTimeMs = Date.now() - _t0;
  return NextResponse.json({ results }, {
    headers: { "X-Response-Time-Ms": String(totalTimeMs) }
  });
}
```

**lib/engine/index.ts** (excerpt):
```typescript
export async function searchEngine(params: SearchParams): Promise<FlightResult[]> {
  const [cachedRaw, effectivePrices] = await Promise.all([
    redis.get<FlightResult[]>(cacheKey),
    getEffectivePrices(),
  ]);

  if (cached) return cached;

  const fetchPromises = [
    fetchFromTravelpayouts(from, to, date, directOnly),
    fetchFromDuffel(from, to, date, cabin, passengers),
    isRoundtrip ? fetchFromTravelpayouts(to, from, returnDate, directOnly) : Promise.resolve([]),
    isRoundtrip ? fetchFromDuffel(to, from, returnDate, cabin, passengers) : Promise.resolve([]),
  ];

  const allSettled = await Promise.allSettled(fetchPromises);
  // ... merge + enrich + rank
}
```

### B. Sentry Event Structure

```json
{
  "type": "transaction",
  "transaction": "search.SIN-LAX",
  "measurements": {
    "tp_outbound_ms": { "value": 1800, "unit": "millisecond" },
    "duffel_outbound_ms": { "value": 3950, "unit": "millisecond" },
    "tp_return_ms": { "value": 1900, "unit": "millisecond" },
    "duffel_return_ms": { "value": 4100, "unit": "millisecond" },
    "parallel_wall_time_ms": { "value": 4100, "unit": "millisecond" },
    "enrich_ms": { "value": 1200, "unit": "millisecond" },
    "total_ms": { "value": 5300, "unit": "millisecond" }
  },
  "tags": {
    "cache_hit": "no",
    "p95_ok": "yes"
  }
}
```

### C. Popular Routes Configuration

```typescript
export const POPULAR_ROUTES = [
  { from: "SIN", to: "LAX", cabin: "economy", tripType: "oneway" },
  { from: "SIN", to: "LAX", cabin: "business", tripType: "roundtrip" },
  { from: "NRT", to: "LAX", cabin: "economy", tripType: "oneway" },
  { from: "DXB", to: "LHR", cabin: "business", tripType: "roundtrip" },
  { from: "CDG", to: "ORY", cabin: "economy", tripType: "oneway" },
];
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-05  
**Approval:** CTO (pending implementation)
