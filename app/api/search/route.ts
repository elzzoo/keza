import { NextResponse } from "next/server";
import { searchEngine, type SearchParams } from "@/lib/engine";
import { getForexRate } from "@/lib/autoCalibrate";

/* ── rate limiter: sliding window per IP ── */
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 15;           // max requests per window
const ipHits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Cleanup stale entries every 5 minutes to prevent memory leak
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    ipHits.forEach((entry, ip) => {
      if (now > entry.resetAt) ipHits.delete(ip);
    });
  }, 5 * 60_000);
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
  /* rate limit by IP */
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests — please wait a moment" },
      { status: 429 }
    );
  }

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

    const results = await searchEngine({
      from,
      to,
      date,
      returnDate:   body.returnDate && DATE_RE.test(body.returnDate) ? body.returnDate : undefined,
      tripType:     body.tripType === "roundtrip" ? "roundtrip" : "oneway",
      stops:        body.stops === "direct" ? "direct" : "any",
      cabin:        ["economy", "business", "first"].includes(body.cabin ?? "") ? body.cabin! as "economy" | "business" | "first" : "economy",
      passengers,
      userPrograms: Array.isArray(body.userPrograms) ? body.userPrograms.filter((p): p is string => typeof p === "string").slice(0, 20) : [],
    });

    // Fetch forex rate (non-blocking, fallback to 605 if fails)
    const forexRate = await getForexRate().catch(() => 605);

    return NextResponse.json({ results, count: results.length, forexRate });
  } catch (err) {
    console.error("[api/search] error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json(
      { error: "Search failed", results: [] },
      { status: 500 }
    );
  }
}
