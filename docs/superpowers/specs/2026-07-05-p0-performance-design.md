# KEZA P0 Performance Optimization (6-10s → <5s)

**Goal:** Reduce search latency from 6-10s to <5s p95 on SIN→LAX searches.

**Architecture:** Hybrid streaming approach combining server optimizations + React Suspense streaming.

**Tech Stack:** Next.js 15 Server Components, React Suspense, Duffel API tuning, Redis pre-warming, Inngest cron.

---

## Server-Side Optimization

1. **Duffel Timeout Tuning**
   - Current: 4000ms (AbortSignal.timeout)
   - Reduce to: 2000ms (faster failure detection)
   - Rationale: Fallback to Travelpayouts still completes within budget

2. **Parallelize Provider Calls**
   - Already implemented (from prior work)
   - Verify: Duffel + Travelpayouts run concurrently, not sequentially

3. **Redis Pre-warming on Hot Routes**
   - Inngest cron: pre-cache popular routes (SIN-LAX, NRT-LAX, DXB-LHR) every 6h
   - Hit rate: ~30% of searches on these corridors
   - Cache TTL: 1h (short enough to stay fresh, long enough to reduce API calls)

4. **Response-Time Header**
   - Add `X-Response-Time: {duration}ms` to search API responses
   - Enables monitoring latency drift in production

---

## Streaming UI

1. **React Suspense Boundaries**
   - Wrap `<SearchResults>` in `<Suspense fallback={<Skeleton />}>`
   - Server component streams flight data as it arrives from Duffel

2. **Progressive Enhancement**
   - First batch (50 results) in <2s via streaming
   - Full batch (500+ results) by 5s
   - User sees results incrementally, not blocked on full dataset

---

## Bundle Optimization

1. **Code Analysis**
   - Run: `npm run build --profile`
   - Identify unused dependencies, large chunks
   - Target: reduce bundle by 10-15%

2. **Tree-Shaking**
   - Remove unused currency formatters, locales
   - Lazy-load chart libraries (only needed on /prix)

---

## Success Criteria

- ✅ SIN→LAX search p95 < 5s
- ✅ First results visible in < 2s (streaming)
- ✅ Bundle size reduced by 10%+
- ✅ Response-time header added
- ✅ No accuracy regressions (same results as before)
- ✅ 3× cold-cache searches verified with DevTools

---

## Testing

- Performance benchmarks (3 cold searches)
- Accuracy tests (compare streaming vs non-streaming results)
- Regression tests (existing test suite still passes)
- DevTools verification (Lighthouse TTI)
