import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { MILES_PRICES } from "@/data/milesPrices";

export async function GET(request: Request): Promise<NextResponse> {
  // Verify CRON_SECRET
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("Authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Build price map: program -> basePriceCents
    const priceMap = new Map<string, number>(
      MILES_PRICES.map((r) => [r.program, r.basePriceCents])
    );

    // Store in Redis as a plain object with 25h TTL (90_000 seconds)
    await redis.set("miles:prices", Object.fromEntries(priceMap), { ex: 90_000 });

    const programs = Array.from(priceMap.keys());

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
