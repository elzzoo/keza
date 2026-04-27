import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { MILES_PRICE_MAP } from "@/data/milesPrices";
import { recalibrate, getForexRate } from "@/lib/autoCalibrate";
import { hasCronSecret } from "@/lib/auth";

// ─── Daily cron job: fully automatic data refresh ────────────────────────────
// Runs every day at 03:00 UTC (configured in vercel.json)
//
// What it does:
// 1. RECALIBRATE mile values from collected search observations
//    (self-learning: the more users search, the more accurate it gets)
// 2. REFRESH forex rate USD→XOF for CFA display
// 3. SYNC static baselines to Redis (fallback if no observations yet)
// 4. REPORT what changed

export async function GET(request: Request): Promise<NextResponse> {
  // Verify CRON_SECRET (Vercel cron sends this automatically)
  if (!hasCronSecret(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const report: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
  };

  try {
    // ── 1. Auto-recalibrate mile values from search observations ────────────
    // This is the key automation: every search records how much a mile was
    // "worth" for that specific flight. The cron aggregates these observations
    // and adjusts the effective value per mile. No human intervention needed.
    const calibrationResults = await recalibrate();
    report.calibration = {
      programsUpdated: Object.keys(calibrationResults).length,
      details: calibrationResults,
    };

    // ── 2. Refresh forex rate USD → XOF (CFA) ──────────────────────────────
    const forexRate = await getForexRate();
    report.forex = { usdToXof: forexRate };

    // ── 3. Ensure all programs have a value in Redis ────────────────────────
    // If a program has no observations yet, sync static baseline so Redis
    // always has a value (prevents cold-start issues).
    // Also writes miles:lastUpdated:{program} so getLastUpdated() can report
    // when values were last confirmed by the cron.
    const synced: string[] = [];
    const now = new Date().toISOString();
    const programs = Array.from(MILES_PRICE_MAP.entries());
    for (const [program, staticValue] of programs) {
      const existing = await redis.get<number>(`miles:price:${program}`).catch(() => null);
      if (typeof existing !== "number") {
        await redis.set(`miles:price:${program}`, staticValue, { ex: 7 * 24 * 60 * 60 });
        synced.push(program);
      }
      // Always stamp lastUpdated — either we just synced OR recalibration
      // already wrote a fresh value above.  Either way the cron ran today.
      await redis
        .set(`miles:lastUpdated:${program}`, now, { ex: 8 * 24 * 60 * 60 })
        .catch(() => null);
    }
    report.synced = synced;

    // ── 4. Store last-run timestamp ─────────────────────────────────────────
    await redis.set("cron:miles-prices:lastRun", now, { ex: 48 * 60 * 60 });

    report.ok = true;
    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    report.ok = false;
    report.error = message;
    return NextResponse.json(report, { status: 500 });
  }
}
