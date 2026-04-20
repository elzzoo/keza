import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { redis } from "@/lib/redis";
import { MILES_PRICE_MAP } from "@/data/milesPrices";

function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a.padEnd(256));
  const bBuf = Buffer.from(b.padEnd(256));
  return timingSafeEqual(aBuf, bBuf) && a.length === b.length;
}

export async function GET(request: Request): Promise<NextResponse> {
  // Verify CRON_SECRET
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("Authorization");
  if (!secret || !authHeader || !safeCompare(authHeader, `Bearer ${secret}`)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Store in Redis as a plain object with 25h TTL (90_000 seconds)
    await redis.set("miles:prices", Object.fromEntries(MILES_PRICE_MAP), { ex: 90_000 });

    const programs = Array.from(MILES_PRICE_MAP.keys());

    return NextResponse.json({
      ok: true,
      updated: programs.length,
      programs,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
