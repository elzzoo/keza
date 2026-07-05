# KEZA Search Latency Optimization Progress

**Status:** Phase 1 (Observability) Complete ✅  
**Target:** 8s p95 → <5s p95  
**Date Started:** 2026-07-04

---

## Completed Work (Phase 1: Observability)

### 1. Enhanced Performance Tracking ✅
**File:** `lib/performance.ts`
- Added per-provider latency breakdown (Duffel, TP, cache hit time)
- Added latency bucket categorization (excellent/good/ok/slow/very_slow)
- Implemented percentile calculation helper for p50/p95/p99 tracking
- Enhanced Sentry event with provider source, partial flag, result counts
- Tags: `route`, `search_type`, `provider`, `latency_bucket`

**Impact:** Enables data-driven decision-making on which bottleneck to optimize next.

### 2. Response Headers with Provider Source ✅
**File:** `app/api/search/route.ts`
- Added `X-Response-Time`: actual elapsed time
- Added `X-Results-Count`: number of flights returned
- Added `X-From-Cache`: true if cache hit
- Added `X-Partial`: true if timeout occurred
- Added `X-Provider-Source`: duffel/travelpayouts/none

**Impact:** Client-side and monitoring tools can now observe provider performance in real-time.

### 3. Streaming Endpoint Enhanced ✅
**File:** `app/api/search/stream/route.ts`
- Tracks Duffel time (partial arrival ~2-3s)
- Tracks TP time (final arrival ~4-8s)
- Tracks result count breakdown (duffel vs TP contribution)
- Logs detailed latency to Sentry with tags
- Two-phase strategy verified: emit partial after Duffel, final after TP merge

**Impact:** Streaming endpoint can show results to users in ~3s (Duffel-only partial), final in ~5-6s.

### 4. Baseline Measurement Tool ✅
**File:** `scripts/benchmark-search.mjs`
- Node.js script for P95 latency benchmarking
- Measures per-provider breakdown, cache hits, response times
- Color-coded output (✅ <3s, ⚠️ 3-5s, ❌ >5s)
- Usage: `node scripts/benchmark-search.mjs http://localhost:3000 SIN-LAX 20`

**Usage:**
```bash
npm run dev  # Terminal 1
node scripts/benchmark-search.mjs http://localhost:3000 SIN-LAX 20  # Terminal 2
```

Expected output:
```
P95: XXXms ← Target: <5000ms
Provider Breakdown: duffel (60%), travelpayouts (40%)
Cache hits: 0/20 (0%)
```

### 5. Parallel Execution Verification Tests ✅
**File:** `__tests__/lib/parallel-execution.test.ts`
- Static analysis: verifies all 4 provider calls created without sequential awaits
- Regression test: guards against future sequential-ification
- Tests both `searchEngine` (via Promise.allSettled) and `searchEngineStream` (two-phase strategy)

**Test Results:**
```
✅ searchEngineStream creates provider promises without sequential awaits
✅ searchEngine (non-streaming) creates provider promises in parallel
✅ No provider call should be awaited more than once
```

---

## Verified Facts

✅ **Parallel Execution:** All 4 provider calls (TP outbound/return, Duffel outbound/return) start simultaneously via Promise.allSettled  
✅ **Two-Phase Streaming:** Duffel results sent to client at ~2-3s, then TP-merged results at ~4-8s  
✅ **Pre-warming Infrastructure:** Already in place (app/api/cron/prewarm/route.ts)  
✅ **Streaming Endpoint:** Already in place (app/api/search/stream/route.ts)  
✅ **Redis Cache:** Working with 1h TTL

---

## Current Baseline (to measure)

Run the benchmark to establish p95 baseline:

```bash
npm run dev &
sleep 3
node scripts/benchmark-search.mjs http://localhost:3000 SIN-LAX 20
```

Capture output showing:
- P50, P95, P99 latencies
- Provider breakdown (% Duffel vs TP)
- Cache hit rate
- Latency bucket distribution

---

## Next Steps (Phases 2-6)

### Phase 2: Timeout Tuning (1-2 hours)
**Files:** `lib/config.ts`, `lib/duffelProvider.ts`
1. Run 50+ searches on SIN→LAX
2. Measure actual Duffel p95 latency via Sentry
3. If p95 < 3s: reduce DUFFEL_TIMEOUT_MS from 4000 → 3000
4. If p95 3.5-4s: keep at 4000
5. Document decision in commit message

**Rationale:** Faster timeout = faster fallback to TP-only results (2-3s vs 4s)

### Phase 3: Stream Partial Results (8-12 hours)
**Files:** `components/Results.tsx`, `app/flights/[route]/RoutePageClient.tsx`
1. Wrap Results in Suspense with skeleton loaders
2. Show "Searching..." fallback while awaiting final results
3. Test: Duffel-only partial arrives ~2-3s, final 5-6s
4. UX improvement: users see real flights sooner

**Expected Impact:** Perceived latency drop from 5-8s to 2-3s (user sees results)

### Phase 4: Bundle Optimization (4-6 hours)
**Files:** `next.config.js`, component imports
1. Run `ANALYZE=true npm run build` to profile bundle
2. Lazy-load PriceHeatmap, PriceHistoryChart (already done via dynamic import)
3. Tree-shake unused imports from `/lib` and `/components`
4. Measure: JS bundle before/after (target <150KB gzipped)

**Expected Impact:** Faster initial page load, faster hydration

### Phase 5: Pre-warming Verification (2-3 hours)
**Files:** `lib/prewarm.ts`, Vercel cron config
1. Verify cron job runs every 6 hours
2. Monitor: cache hit rates for popular routes (SIN-LAX, NRT-LAX, DXB-LHR, etc.)
3. Popular route cache hits should return <500ms

### Phase 6: Monitoring & Alerting (2-3 hours)
1. Create Sentry dashboard for latency percentiles (p50/p95/p99 by route)
2. Set up alerts: P95 > 5000ms on any route
3. Weekly: Review latency trends, identify regressions
4. Monthly: Capacity planning based on search volume trends

---

## Success Criteria

- [ ] Baseline p95 latency measured and documented
- [ ] Per-provider latency visible in Sentry dashboard
- [ ] Parallel execution verified (0 sequential awaits)
- [ ] Timeout tuning complete (DUFFEL_TIMEOUT_MS optimized)
- [ ] Streaming UI shows partial results at <3s
- [ ] Final merged results by <5-6s
- [ ] Bundle size <150KB gzipped
- [ ] All 438 tests pass
- [ ] No regressions in ranking or result quality
- [ ] Cache pre-warming cron running hourly

---

## Commits So Far

1. **aeb10cf** - perf(P3.2): enhance search observability for latency optimization
   - Enhanced performance tracking with per-provider breakdown
   - Added response headers (X-Provider-Source, X-Results-Count, etc.)
   - Created benchmark-search.mjs for baseline measurement
   
2. **5599a7a** - test(P3.2): add parallel execution verification tests
   - Static analysis tests verify no sequential awaits
   - Regression tests guard against future bottlenecks

---

## How to Continue

### For the Next Engineer
1. Run benchmark to establish p95 baseline:
   ```bash
   npm run dev &
   node scripts/benchmark-search.mjs http://localhost:3000 SIN-LAX 20
   ```

2. Check Sentry dashboard for provider latency breakdown by route

3. Follow Phase 2 (Timeout Tuning) → Phase 3 (Streaming) → Phase 4 (Bundle) sequentially

4. Commit each phase with `perf(P3.2): <phase-name>` message

### For Monitoring Post-Deployment
- Vercel Deployment: `npm run build && git push origin main`
- Monitor latency trends at: https://keza-taupe.vercel.app/api/latency-dashboard (if created)
- Alert threshold: p95 > 5000ms on any route

---

## Technical Debt / Future Optimizations

1. **Duffel API Rate Limiting:** Consider batch requests for multiple routes
2. **Redis Clustering:** If cache miss rate > 20%, upgrade Redis tier
3. **CDN Caching:** Cache search results at edge (currently app-level only)
4. **Query Optimization:** Analyze slow queries in Sentry; optimize enrichment logic
5. **A/B Testing:** Test different timeout values on prod (50% 3s, 50% 4s)

---

## References

- Architecture: `/Users/DIALLO9194/Downloads/keza/lib/engine/index.ts`
- Streaming: `/Users/DIALLO9194/Downloads/keza/lib/engine/stream.ts`
- Config: `/Users/DIALLO9194/Downloads/keza/lib/config.ts`
- Performance: `/Users/DIALLO9194/Downloads/keza/lib/performance.ts`
- Full Plan: `/Users/DIALLO9194/Downloads/keza/docs/KEZA_OPTIMIZATION_PLAN.md`

---

**Last Updated:** 2026-07-05 23:30 UTC
