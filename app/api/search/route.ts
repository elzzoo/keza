import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { searchEngine, CACHE_VERSION, CACHE_VERSION_FALLBACKS, type SearchParams, type FlightResult, type SearchEngineStats } from "@/lib/engine";
import * as Sentry from "@sentry/nextjs";
import { trackSearchPerformance } from "@/lib/performance";

// Vercel Hobby plan hard-kills serverless functions at 10s.
// maxDuration must be ≤ 10 on Hobby; Pro allows up to 300s.
export const maxDuration = 10;
import { getForexRate } from "@/lib/autoCalibrate";
import { rateLimitResponse } from "@/lib/ratelimit";
import { logError, logWarn } from "@/lib/logger";
import { redis } from "@/lib/redis";
import { TOTAL_SAVINGS_KEY } from "@/lib/redisKeys";
import { parseSearchParams } from "@/lib/searchInput";
import { buildSearchCacheKey } from "@/lib/searchCacheKey";

// Max time to wait for a full search before returning with partial flag.
// Must be < maxDuration (10s) to ensure graceful partial response fires before
// Vercel kills the function. 8s leaves 2s for response serialization + Redis write.
const SEARCH_TIMEOUT_MS = 8_000;

export async function POST(request: Request) {
  const requestId = randomUUID();
  const _t0 = Date.now();

  const limited = await rateLimitResponse(request, {
    namespace: "api:search:post",
    limit: 30,
    windowSeconds: 60,
  });
  if (limited) return limited;

  let body: Partial<SearchParams>;
  try {
    body = await request.json() as Partial<SearchParams>;
  } catch {
    // Malformed JSON is a client error, not a server failure — don't let it
    // fall into the catch-all below, which used to report it as a 500.
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  try {
    const parsed = parseSearchParams(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const searchParams = parsed.params;
    const { from, to, date, passengers } = searchParams;

    // Race the search against a hard timeout.
    // On timeout, fall back to cached results — NEVER return empty to the user.
    let timedOut = false;
    const timeoutSignal = new Promise<null>(resolve =>
      setTimeout(() => { timedOut = true; resolve(null); }, SEARCH_TIMEOUT_MS)
    );

    // Populated in place by searchEngine if it resolves from ITS OWN internal
    // Redis cache (not the timeout-fallback cache lookup below, which sets
    // fromCache separately) — was previously never checked, so x-from-cache
    // silently reported false on every fast/cached response.
    const engineStats: SearchEngineStats = { fromCache: false };
    const engineResult = await Promise.race([
      searchEngine(searchParams, requestId, engineStats).then(r => r),
      timeoutSignal,
    ]) as FlightResult[] | null;

    let results: FlightResult[];
    let partial = false;
    let fromCache = false;

    if (timedOut || engineResult === null) {
      // Try current version first, then fall back through older versions.
      // This prevents empty results when the cache was just bumped (cold v19).
      const keyParams = {
        from, to, date,
        tripType: searchParams.tripType!,
        returnDate: searchParams.returnDate,
        stops: searchParams.stops!,
        cabin: searchParams.cabin!,
        passengers,
      };
      const versions = [CACHE_VERSION, ...CACHE_VERSION_FALLBACKS];
      results = [];
      for (const ver of versions) {
        const cached = await redis.get<FlightResult[]>(buildSearchCacheKey(ver, keyParams)).catch(() => null);
        if (cached && cached.length > 0) {
          results = cached;
          fromCache = true;
          // Log cache hit to Sentry for monitoring
          Sentry.captureMessage(`Cache hit: ${from}→${to} from ${ver}`, "debug");
          break;
        }
      }
      partial = true;
      // Log timeout event with search context for Sentry monitoring
      logWarn(
        `[api/search] timeout for ${from}→${to}, returning ${results.length} cached results`,
        undefined,
        {
          route: `${from}-${to}`,
          date,
          cabin: searchParams.cabin,
          passengers: searchParams.passengers,
          tripType: searchParams.tripType,
          returnDate: searchParams.returnDate,
          stops: searchParams.stops,
          partialResultCount: results.length,
          fromCache,
        }
      );
    } else {
      results = engineResult;
      fromCache = engineStats.fromCache;
      Sentry.captureMessage(
        fromCache
          ? `Cache hit: ${from}→${to} from engine's own cache (${results.length} results)`
          : `Cache miss: ${from}→${to} computed ${results.length} results`,
        "debug"
      );
    }

    // Fire-and-forget engine observability stats
    const today = new Date().toISOString().slice(0, 10);
    // Tally savings: best USE_MILES result savings (USD), rounded to avoid float drift
    const bestSaving = results
      .filter(r => r.recommendation === "USE_MILES" && r.savings > 0)
      .reduce((max, r) => Math.max(max, r.savings), 0);

    // Track stats in parallel; use allSettled to ensure we track each independently even if one fails
    Promise.allSettled([
      redis.incr(`keza:stats:searches:${today}`),
      fromCache
        ? redis.incr(`keza:stats:cache:hits:${today}`)
        : redis.incr(`keza:stats:cache:misses:${today}`),
      ...(results.slice(0, 1).map((r) =>
        r?.source === "DUFFEL"
          ? redis.incr(`keza:stats:provider:duffel:${today}`)
          : redis.incr(`keza:stats:provider:tp:${today}`)
      )),
      redis.expire(`keza:stats:searches:${today}`, 30 * 24 * 60 * 60),
      // Track cumulative savings for metrics (internal analytics only)
      ...(bestSaving > 0 && !fromCache
        ? [redis.incrby(TOTAL_SAVINGS_KEY, Math.round(bestSaving))]
        : []),
      // Track per-route popularity for trending widget (sorted set, TTL 7 days)
      redis.zincrby(`keza:stats:routes:${today}`, 1, `${from}-${to}`)
        .then(() => redis.expire(`keza:stats:routes:${today}`, 7 * 24 * 60 * 60))
        .catch(() => {}),
    ]).catch(() => {
      // Stats tracking failed; this is non-critical, log and continue
      logWarn("[search] Stats tracking failed", undefined, { route: `${from}-${to}`, cacheHit: fromCache });
    });

    // Fetch forex rate (non-blocking, fallback to 600 if fails)
    const forexRate = await getForexRate().catch(() => 600);

    const response = NextResponse.json({ results, count: results.length, forexRate, partial, fromCache });
    response.headers.set("x-request-id", requestId);
    const responseTimeMs = Date.now() - _t0;
    response.headers.set("x-response-time", `${responseTimeMs}ms`);
    response.headers.set("x-results-count", String(results.length));
    response.headers.set("x-from-cache", fromCache ? "true" : "false");
    response.headers.set("x-partial", partial ? "true" : "false");
    // Provider source indicator: where primary results came from
    const providerSource = results.length > 0
      ? results[0]?.source === "DUFFEL" ? "duffel" : "travelpayouts"
      : "none";
    response.headers.set("x-provider-source", providerSource);
    // S1-2: HTTP Cache Headers (14x CDN speedup on cache hits)
    const cacheControl = "public, max-age=120, s-maxage=3600";
    response.headers.set("Cache-Control", cacheControl);

    // Track performance metrics with detailed breakdown
    await trackSearchPerformance(`${from}-${to}`, {
      cacheHitTime: fromCache ? 100 : 0,
      duffelTime: partial ? 0 : responseTimeMs,
      tpTime: partial ? responseTimeMs : 0,
      totalTime: responseTimeMs,
      partial,
      fromCache,
      totalResultCount: results.length,
    });

    return response;
  } catch (err) {
    logError("[api/search]", err);
    return NextResponse.json(
      { error: "Search failed", results: [] },
      { status: 500 }
    );
  }
}
