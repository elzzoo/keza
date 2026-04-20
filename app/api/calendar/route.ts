import { NextResponse } from "next/server";
import { fetchCalendarPrices, type CalendarDay } from "@/lib/engine";
import { redis } from "@/lib/redis";

const IATA_RE = /^[A-Z]{3}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from  = (searchParams.get("from") ?? "").toUpperCase().trim();
  const to    = (searchParams.get("to") ?? "").toUpperCase().trim();
  const month = (searchParams.get("month") ?? "").trim(); // YYYY-MM

  if (!IATA_RE.test(from) || !IATA_RE.test(to) || !MONTH_RE.test(month)) {
    return NextResponse.json(
      { error: "Invalid params: from/to must be 3-letter IATA, month must be YYYY-MM" },
      { status: 400 }
    );
  }

  // Cache key
  const cacheKey = `keza:cal:${from}:${to}:${month}`;

  // Check cache
  const cached = await redis.get<CalendarDay[]>(cacheKey).catch(() => null);
  if (cached) {
    return NextResponse.json({ days: cached, cached: true }, {
      headers: { "Cache-Control": "public, max-age=1800, s-maxage=3600" },
    });
  }

  // Fetch fresh data — use first day of month as date param
  const date = `${month}-01`;
  const days = await fetchCalendarPrices(from, to, date);

  // Cache for 2 hours
  if (days.length > 0) {
    await redis.set(cacheKey, days, { ex: 7200 }).catch(() => null);
  }

  return NextResponse.json({ days, cached: false }, {
    headers: { "Cache-Control": "public, max-age=1800, s-maxage=3600" },
  });
}
