# KEZA Incident Runbooks

Production troubleshooting guides for KEZA flight comparator. For each alert, follow the decision tree to diagnose and resolve.

**Dashboard:** [Sentry](https://sentry.io/organizations/keza/) | [Vercel](https://vercel.com/elzzoo/keza) | [Upstash Redis](https://console.upstash.com)

---

## Table of Contents

1. [Search Endpoint Errors (5xx)](#search-endpoint-errors)
2. [Duffel Provider Failure](#duffel-provider-failure)
3. [Redis Capacity Alert](#redis-capacity-alert)
4. [High Request Latency](#high-request-latency)
5. [Cache Invalidation](#cache-invalidation)

---

## Search Endpoint Errors

### Symptom
- **Alert:** `/api/search` returns 5xx errors or high error rate
- **Dashboard:** Sentry Issues → filter by error type
- **User impact:** Search page shows "Something went wrong"

### Decision Tree

```
┌─ Is error rate > 10% for last 5 min?
│  │
│  ├─ YES: Go to Step 1 (Check Duffel)
│  └─ NO: Check single-user error or caching issue
│
├─ Step 1: Check Duffel API status
│  ├─ Query: curl https://keza-taupe.vercel.app/api/health/duffel
│  ├─ Expected: { "status": "ok", "latency": <100ms }
│  ├─ If DEGRADED: Duffel is down → Go to "Duffel Provider Failure"
│  └─ If OK: Continue to Step 2
│
├─ Step 2: Check Redis cache
│  ├─ Query: curl https://keza-taupe.vercel.app/api/metrics/redis
│  ├─ Expected: { "status": "ok", "memoryPercent": <85 }
│  ├─ If degraded: Go to "Redis Capacity Alert"
│  └─ If ok: Continue to Step 3
│
├─ Step 3: Check logs in Sentry
│  ├─ Filter by request.id tag for that user's search
│  ├─ Look for: searchEngine() timeout or exception
│  ├─ If timeout (>4s): Duffel slow → increase DUFFEL_TIMEOUT or use cache
│  └─ If exception: Check stack trace → fix specific bug
│
└─ Escalation
   ├─ If unclear: Check vercel.json for environment variables
   └─ If persists: Rollback last commit
```

### Troubleshooting Steps

1. **Verify Duffel connectivity:**
   ```bash
   curl https://keza-taupe.vercel.app/api/health/duffel
   ```
   Expected: `{ "status": "ok", "latency": 50-150ms }`

2. **Check Redis memory:**
   ```bash
   curl https://keza-taupe.vercel.app/api/metrics/redis
   ```
   Expected: `{ "status": "ok", "memoryPercent": < 85 }`

3. **Review Sentry error context:**
   - Filter by request.id in Sentry dashboard
   - Look for searchEngine() timeout or Duffel API error
   - Check DUFFEL_TIMEOUT vs actual latency

4. **Rollback if necessary:**
   ```bash
   git log --oneline -10  # Find last known-good commit
   git revert <hash>      # Create rollback commit
   git push origin main   # Auto-deploy on Vercel
   ```

---

## Duffel Provider Failure

### Symptom
- **Alert:** Sentry issues tagged `duffel.error`
- **Dashboard:** Check Duffel status at [duffel.com/status](https://status.duffel.com)
- **User impact:** Searches fall back to Travelpayouts (stale, low-confidence prices)

### Decision Tree

```
┌─ Is Duffel status page showing incident?
│  ├─ YES: Wait for Duffel to recover (post message in #incidents)
│  └─ NO: Check our integration
│
├─ Step 1: Verify API key
│  ├─ Check Vercel env: DUFFEL_API_KEY
│  ├─ Should start with: duffel_test_Dh_g1m...
│  └─ If wrong: Update in Vercel dashboard → re-deploy
│
├─ Step 2: Test Duffel directly
│  ├─ curl -H "Authorization: Bearer $DUFFEL_API_KEY" \
│  │    https://api.duffel.com/air/airlines
│  ├─ If timeout: Network issue or Duffel down
│  ├─ If 401: API key invalid
│  └─ If 200: OK, proceed to Step 3
│
├─ Step 3: Check error logs in Sentry
│  ├─ Look for: "Duffel API error" tag
│  ├─ Check: Response code + error message
│  ├─ If 429 (rate-limited): Reduce request concurrency
│  ├─ If 500: Duffel bug → wait + report
│  └─ If network timeout: Check our AbortSignal timeout
│
└─ Fix
   ├─ If rate-limit: Increase DUFFEL_TIMEOUT or cache more aggressively
   ├─ If network: Check Vercel region connectivity
   └─ If API key: Update in Vercel, re-deploy, invalidate cache
```

### Troubleshooting Steps

1. **Check Duffel status:**
   ```bash
   # Visit https://status.duffel.com or query their status endpoint
   curl https://api.duffel.com/air/airlines \
     -H "Authorization: Bearer $DUFFEL_API_KEY" \
     --max-time 5
   ```

2. **Review Sentry alerts:**
   - Filter by `event.tags.provider:duffel`
   - Look for error message + response code
   - Check requestId to correlate with user action

3. **Reduce load (temporary fix):**
   - Increase `DUFFEL_TIMEOUT` in middleware to 6000ms (Vercel env)
   - This allows fallback to Travelpayouts faster

4. **Force cache invalidation:**
   ```bash
   # If we need to clear cached results and start fresh:
   # - Update CACHE_VERSION in lib/engine/index.ts
   # - This invalidates all keys with old version
   # - Deploy: git commit + git push origin main
   ```

---

## Redis Capacity Alert

### Symptom
- **Alert:** `/api/metrics/redis` returns `status: "degraded"`
- **Condition:** Memory > 85% OR p95 latency > 500ms
- **Dashboard:** [Upstash Redis console](https://console.upstash.com)
- **User impact:** Slower searches (cache misses), potential timeouts

### Decision Tree

```
┌─ Check memory usage
│  └─ Query: curl https://keza-taupe.vercel.app/api/metrics/redis
│     Expected: { "memoryPercent": < 85 }
│
├─ If memory > 85%:
│  ├─ Step 1: Identify largest keys
│  │  └─ Upstash console → CLI → MEMORY DOCTOR
│  │     Look for: keza:v* keys consuming >50% memory
│  │
│  ├─ Step 2: Options
│  │  ├─ Option A: Increase Redis plan (easy, costs $)
│  │  ├─ Option B: Reduce TTL (faster eviction)
│  │  │   └─ Edit in lib/redis.ts, redeploy
│  │  └─ Option C: Bump CACHE_VERSION (invalidate old data)
│  │     └─ Edit in lib/engine/index.ts, redeploy
│  │
│  └─ Recommended: Option A (increase plan) if > 90%
│
└─ If latency > 500ms (p95):
   ├─ Check: Are searches happening during peak?
   ├─ Temporary: Reduce DUFFEL_TIMEOUT to speed up fallback
   └─ Permanent: Upgrade Redis plan for more throughput
```

### Troubleshooting Steps

1. **Check metrics:**
   ```bash
   curl https://keza-taupe.vercel.app/api/metrics/redis
   ```
   Look for: `memoryPercent`, `latencyP95`, `opsPerSec`

2. **Inspect Upstash console:**
   - Navigate to [Upstash dashboard](https://console.upstash.com)
   - Select KEZA Redis instance
   - Run: `MEMORY DOCTOR` to see largest keys
   - Run: `INFO memory` for used_memory vs maxmemory

3. **Reduce memory usage (quick fix):**
   - Decrease cache TTL in `lib/redis.ts`
   - Current: `3600s` (1h) for searches, `7200s` (2h) for calendars
   - Reduce to: `1800s` (30m) or `3600s` (1h)
   - Redeploy: `git commit + git push origin main`

4. **Increase Redis plan (permanent fix):**
   - Upstash console → KEZA instance → Upgrade plan
   - Typical: 256MB → 512MB or 1GB
   - No downtime, auto-migrated

5. **Invalidate cache (nuclear option):**
   - Edit `CACHE_VERSION` in `lib/engine/index.ts`
   - Change `"v22"` to `"v23"`
   - This invalidates ALL old keys on next request
   - Redeploy: `git commit + git push origin main`

---

## High Request Latency

### Symptom
- **Alert:** Sentry Web Vitals → LCP > 3s or TTFB > 1s
- **Dashboard:** [Sentry Performance tab](https://sentry.io)
- **User impact:** Slow page loads, poor search experience

### Decision Tree

```
┌─ Check Duffel latency
│  ├─ Query: curl https://keza-taupe.vercel.app/api/health/duffel
│  ├─ If latency > 500ms: Duffel is slow
│  │  └─ Wait for Duffel to recover or reduce timeout
│  └─ If latency < 500ms: Continue to Step 2
│
├─ Step 2: Check Redis latency
│  ├─ Query: curl https://keza-taupe.vercel.app/api/metrics/redis
│  ├─ If p95 latency > 500ms: Redis is slow
│  │  └─ Upgrade Redis plan or reduce TTL
│  └─ If p95 latency < 500ms: Continue to Step 3
│
├─ Step 3: Check bundle size
│  ├─ Build locally: npm run build
│  ├─ Check: .next/static/chunks/ size
│  ├─ If > 500KB (compressed): Analyze with webpack-bundle-analyzer
│  └─ Remove unused deps or lazy-load heavy components
│
└─ Step 4: Check Vercel regions
   ├─ Vercel dashboard → Deployments → Select region
   ├─ If us-east-1: OK for US/EU
   ├─ If eu-west-1: OK for Europe
   └─ Consider serverless functions in multiple regions
```

### Troubleshooting Steps

1. **Measure Duffel latency:**
   ```bash
   curl https://keza-taupe.vercel.app/api/health/duffel
   # Look for "latency" field (should be <200ms)
   ```

2. **Check Redis throughput:**
   ```bash
   curl https://keza-taupe.vercel.app/api/metrics/redis
   # Look for "latencyP95" (should be <500ms)
   ```

3. **Profile bundle size:**
   ```bash
   npm run build
   npm install --save-dev webpack-bundle-analyzer
   # Analyze .next/static/chunks/ directory
   ```

4. **Check cache hit rate:**
   - Sentry dashboard → Filter by `cache.hit:true`
   - Goal: >70% cache hits on repeated searches

5. **Optimize if needed:**
   - Increase Redis TTL for popular routes
   - Add pre-warming: cron job that searches SIN→LAX, NRT→LAX, etc.
   - Lazy-load lower-priority components

---

## Cache Invalidation

### Symptom
- Deployed a fix but users see stale prices
- New flights not appearing
- Miles programs appearing/disappearing unexpectedly

### Decision Tree

```
┌─ Did you change FlightResult type?
│  ├─ YES: Bump CACHE_VERSION
│  └─ NO: Continue
│
├─ Did you add/remove programs in costEngine?
│  ├─ YES: Bump CACHE_VERSION
│  └─ NO: Continue
│
├─ Did you fix searchEngine() logic?
│  ├─ YES: Bump CACHE_VERSION
│  └─ NO: Continue
│
└─ Manual invalidation
   ├─ Option 1: Bump CACHE_VERSION (clean, fast)
   ├─ Option 2: Upstash console → flush all (nuclear)
   └─ Option 3: Wait 1h for TTL to expire (slow)
```

### Steps

1. **Bump cache version (recommended):**
   ```bash
   # Edit lib/engine/index.ts
   # Change: CACHE_VERSION = "v22"
   #     to: CACHE_VERSION = "v23"
   git add lib/engine/index.ts
   git commit -m "chore: bump cache version to v23"
   git push origin main
   ```
   Vercel auto-deploys, all old `keza:v22:*` keys are ignored.

2. **Manual flush (nuclear option):**
   - Upstash console → KEZA instance → CLI
   - Run: `FLUSHALL`
   - Warning: **This clears ALL cached data**, expect slow searches for 1h

3. **Verify invalidation:**
   ```bash
   # Old key should not exist
   curl "https://keza-taupe.vercel.app/api/search?from=SIN&to=LAX&date=2026-07-01"
   # Should perform fresh search (slower), then cache new key
   ```

---

## Escalation Contacts

- **Duffel API Issues:** [Duffel Slack](https://duffel.com/contact) or support@duffel.com
- **Upstash Redis Issues:** [Upstash support](https://upstash.com/support)
- **Vercel Deployment Issues:** [Vercel status](https://vercel-status.com/)

---

## Related Documentation

- [README.md](./README.md) — Architecture overview
- [lib/engine/index.ts](./lib/engine/index.ts) — Search orchestration
- [lib/redis.ts](./lib/redis.ts) — Cache configuration
- [sentry.server.config.ts](./sentry.server.config.ts) — Error tracking setup
