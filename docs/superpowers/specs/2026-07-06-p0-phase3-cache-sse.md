# KEZA P0 Phase 3: Cache Pre-warming + Server-Sent Events

**Goal:** Reduce search latency further via redis pre-warming + incremental SSE streaming.

**Scope:**
1. Redis pre-warming cron: Pre-cache popular routes every 2h
2. SSE streaming: Stream results incrementally as providers respond

**Tech Stack:** TypeScript, Next.js 15, Redis, Inngest, EventSource API.

---

## Pre-warming Strategy

**Hot Routes:** SIN-LAX, NRT-LAX, DXB-LHR (30% of searches)

**Cron Job:**
- Every 2 hours (0 2 4 6 8 10 12 14 16 18 20 22 * * *)
- Search each route with realistic params
- Cache for 1 hour in Redis
- Hit rate target: 30% → 60%

**Expected Impact:** 50% reduction in cold search latency for hot routes

---

## SSE Streaming

**Current Flow:** Client waits for all providers (Duffel, TP) → returns full batch

**New Flow:** 
1. Duffel results arrive (3-4s)
2. Stream to client immediately via SSE
3. Client renders incremental updates
4. Travelpayouts results arrive (fallback)
5. Merge & sort by CPP

**Expected Impact:** Perceived speed +40%, FCP <1s

---

## Success Criteria

- ✅ Cache hit rate: 30% → 60% on hot routes
- ✅ First results visible: <1s (vs current 2-4s)
- ✅ All tests passing
- ✅ No regressions in accuracy
- ✅ Deployed to production
