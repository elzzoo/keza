import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { searchEngine, CACHE_VERSION, type SearchParams, type FlightResult } from "@/lib/engine";

export const maxDuration = 25;
import { getForexRate } from "@/lib/autoCalibrate";
import { rateLimitResponse } from "@/lib/ratelimit";
import { logError, logWarn } from "@/lib/logger";
import { redis } from "@/lib/redis";
import { TOTAL_SAVINGS_KEY } from "@/lib/redisKeys";

// Max time to wait for a full search before returning with partial flag.
// 18s gives Duffel's full first attempt (8s) + TP time on Vercel cloud-to-cloud.
// The client AbortController fires at 10s so users never actually wait this long —
// the server completes in the background and warms the cache for the next visitor.
const SEARCH_TIMEOUT_MS = 18_000;

/**
 * Build the versioned cache key that searchEngine uses.
 * Bump CACHE_VERSION in lib/engine.ts — it is re-exported and imported here
 * so the version is always in sync between the engine and the search route.
 */
const CACHE_VERSION_FALLBACKS = ["v20", "v19", "v18"] as const;

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
    const date = typeof body.date === "string" && DATE_RE.test(body.date) ? body.date : null;

    if (!from || !to || !date) {
      return NextResponse.json(
        { error: "Invalid input: from/to must be 3-letter IATA codes, date must be YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const passengers = Math.min(Math.max(Number(body.passengers) || 1, 1), 9);

    const searchParams: SearchParams = {
      from,
      to,
      date,
      returnDate:   body.returnDate && DATE_RE.test(body.returnDate) ? body.returnDate : undefined,
      tripType:     body.tripType === "roundtrip" ? "roundtrip" : "oneway",
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
          break;
        }
      }
      partial = true;
      logWarn(`[api/search] timeout for ${from}→${to}, returning ${results.length} cached results`);
    } else {
      results = engineResult;
    }

    // Fire-and-forget engine observability stats
    const today = new Date().toISOString().slice(0, 10);
    // Tally savings: best USE_MILES result savings (USD), rounded to avoid float drift
    const bestSaving = results
      .filter(r => r.recommendation === "USE_MILES" && r.savings > 0)
      .reduce((max, r) => Math.max(max, r.savings), 0);
    Promise.all([
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
      // Track cumulative savings so SocialProofBar can show "$Xk saved"
      ...(bestSaving > 0 && !fromCache
        ? [redis.incrby(TOTAL_SAVINGS_KEY, Math.round(bestSaving))]
        : []),
      // Track per-route popularity for trending widget (sorted set, TTL 7 days)
      redis.zincrby(`keza:stats:routes:${today}`, 1, `${from}-${to}`)
        .then(() => redis.expire(`keza:stats:routes:${today}`, 7 * 24 * 60 * 60))
        .catch(() => {}),
    ]).catch(() => {});

    // Fetch forex rate (non-blocking, fallback to 600 if fails)
    const forexRate = await getForexRate().catch(() => 600);

    const response = NextResponse.json({ results, count: results.length, forexRate, partial, fromCache });
    response.headers.set("x-request-id", requestId);
    response.headers.set("x-response-time", `${Date.now() - _t0}ms`);
    return response;
  } catch (err) {
    logError("[api/search]", err);
    return NextResponse.json(
      { error: "Search failed", results: [] },
      { status: 500 }
    );
  }
}
