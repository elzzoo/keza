import { NextResponse } from "next/server";
import { searchEngine, type SearchParams, type FlightResult } from "@/lib/engine";
import { getForexRate } from "@/lib/autoCalibrate";
import { rateLimitResponse } from "@/lib/ratelimit";
import { logError } from "@/lib/logger";
import { redis } from "@/lib/redis";

// Max time to wait for a full search before returning with partial flag.
// Covers Duffel (8s) + TP retries — give the engine a fair shot, but
// don't leave the user staring at a spinner forever.
const SEARCH_TIMEOUT_MS = 9_000;

/**
 * Build the same cache key that searchEngine uses (v17).
 * Used to serve stale-but-valid cached results when the fresh search times out.
 */
function buildCacheKey(p: {
  from: string; to: string; date: string;
  tripType: string; returnDate?: string;
  stops: string; cabin: string; passengers: number;
}): string {
  return `keza:v18:${p.from}:${p.to}:${p.date}:${p.tripType}:${p.returnDate ?? ""}:${p.stops}:${p.cabin}:${p.passengers}`;
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
      searchEngine(searchParams).then(r => r),
      timeoutSignal,
    ]) as FlightResult[] | null;

    let results: FlightResult[];
    let partial = false;

    if (timedOut || engineResult === null) {
      // Attempt to serve stale cached results so the user isn't left empty-handed
      const cacheKey = buildCacheKey({
        from, to, date,
        tripType: searchParams.tripType!,
        returnDate: searchParams.returnDate,
        stops: searchParams.stops!,
        cabin: searchParams.cabin!,
        passengers,
      });
      const cached = await redis.get<FlightResult[]>(cacheKey).catch(() => null);
      results = cached ?? [];
      partial = true;
      console.warn(`[api/search] timeout for ${from}→${to}, returning ${results.length} cached results`);
    } else {
      results = engineResult;
    }

    // Fetch forex rate (non-blocking, fallback to 600 if fails)
    const forexRate = await getForexRate().catch(() => 600);

    return NextResponse.json({ results, count: results.length, forexRate, partial });
  } catch (err) {
    logError("[api/search]", err);
    return NextResponse.json(
      { error: "Search failed", results: [] },
      { status: 500 }
    );
  }
}
