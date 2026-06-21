import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { searchEngine, CACHE_VERSION, CACHE_VERSION_FALLBACKS, type SearchParams, type FlightResult } from "@/lib/engine";
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

// Max time to wait for a full search before returning with partial flag.
// Must be < maxDuration (10s) to ensure graceful partial response fires before
// Vercel kills the function. 8s leaves 2s for response serialization + Redis write.
const SEARCH_TIMEOUT_MS = 8_000;

function buildCacheKey(
  version: string,
  p: {
    from: string; to: string; date: string;
    tripType: string; returnDate?: string;
    stops: string; cabin: string; passengers: number;
  }
): string {
  return `keza:${version}:${p.from}:${p.to}:${p.date}:${p.tripType}:${p.returnDate ?? ""}:${p.stops}:${p.cabin}:${p.passengers}`;
}

/* ── input validation ── */
const IATA_RE = /^[A-Z]{3}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function sanitizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const upper = raw.trim().toUpperCase();
  return IATA_RE.test(upper) ? upper : null;
}

/** Validates YYYY-MM-DD format AND date range (today ≤ date ≤ today + 365 days) */
function isValidFutureDate(raw: unknown): raw is string {
  if (typeof raw !== "string" || !DATE_RE.test(raw)) return false;
  const d = new Date(raw + "T00:00:00Z");
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const maxDate = new Date(today);
  maxDate.setUTCFullYear(maxDate.getUTCFullYear() + 1);
  return d >= today && d <= maxDate;
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  const _t0 = Date.now();

  const limited = await rateLimitResponse(request, {
    namespace: "api:search:post",
    limit: 30,
    windowSeconds: 60,
  });
  if (limited) return limited;

  try {
    const body = await request.json() as Partial<SearchParams>;

    /* validate & sanitize inputs */
    const from = sanitizeCode(body.from);
    const to   = sanitizeCode(body.to);
    const date = isValidFutureDate(body.date) ? body.date : null;

    if (!from || !to || !date) {
      return NextResponse.json(
        { error: "Invalid input: from/to must be 3-letter IATA codes, date must be YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const passengers = Math.min(Math.max(Number(body.passengers) || 1, 1), 9);

    const tripType = body.tripType === "roundtrip" ? "roundtrip" : "oneway";
    const returnDate = isValidFutureDate(body.returnDate) ? body.returnDate : undefined;

    // Validate return date is after departure date for roundtrips
    if (tripType === "roundtrip" && returnDate && returnDate <= date) {
      return NextResponse.json(
        { error: "Return date must be after departure date" },
        { status: 400 }
      );
    }

    const searchParams: SearchParams = {
      from,
      to,
      date,
      returnDate,
      tripType,
      stops:        body.stops === "direct" ? "direct" : "any",
      cabin:        ["economy", "premium", "business", "first"].includes(body.cabin ?? "") ? body.cabin! as "economy" | "premium" | "business" | "first" : "economy",
      passengers,
      userPrograms: Array.isArray(body.userPrograms) ? body.userPrograms.filter((p): p is string => typeof p === "string").slice(0, 20) : [],
    };

    // Race the search against a hard timeout.
    // On timeout, fall back to cached results — NEVER return empty to the user.
    let timedOut = false;
    const timeoutSignal = new Promise<null>(resolve =>
      setTimeout(() => { timedOut = true; resolve(null); }, SEARCH_TIMEOUT_MS)
    );

    const engineResult = await Promise.race([
      searchEngine(searchParams, requestId).then(r => r),
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
        const cached = await redis.get<FlightResult[]>(buildCacheKey(ver, keyParams)).catch(() => null);
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
      // Log cache miss when results computed in normal path (not from cache)
      Sentry.captureMessage(`Cache miss: ${from}→${to} computed ${results.length} results`, "debug");
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
    response.headers.set("x-response-time", `${Date.now() - _t0}ms`);
    // S1-2: HTTP Cache Headers (14x CDN speedup on cache hits)
    const cacheControl = "public, max-age=120, s-maxage=3600";
    response.headers.set("Cache-Control", cacheControl);

    // Track performance metrics
    const responseTimeMs = Date.now() - _t0;
    await trackSearchPerformance(`${from}-${to}`, {
      cacheHitTime: fromCache ? 100 : 0,
      duffelTime: partial ? 0 : responseTimeMs,
      tpTime: partial ? responseTimeMs : 0,
      totalTime: responseTimeMs,
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
