import { NextRequest, NextResponse } from "next/server";
import { maybeSendDailyCronHealthAlert } from "@/lib/cronAlerting";
import { getDailyCronStatus } from "@/lib/cronStatus";
import { logWarn } from "@/lib/logger";
import { redis } from "@/lib/redis";
import { rateLimitResponse } from "@/lib/ratelimit";

/**
 * GET /api/health
 *
 * Health check endpoint for uptime monitors (Vercel, UptimeRobot, etc.).
 * Checks Redis connectivity and daily cron freshness.
 * Returns 200 if healthy, 503 if degraded.
 *
 * Response shape:
 *   { status: "ok" | "degraded", redis: "ok" | "error", cron: "ok" | "running" | "stale" | "degraded" | "unknown" }
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const limited = await rateLimitResponse(req, { namespace: "api:health", limit: 60, windowSeconds: 60 });
  if (limited) return limited;

  const start = Date.now();

  // Ping Redis with a short timeout
  let redisStatus: "ok" | "error" = "error";
  try {
    const pong = await Promise.race([
      redis.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
    ]);
    if (pong === "PONG") redisStatus = "ok";
  } catch {
    redisStatus = "error";
  }

  let cronStatus: "ok" | "running" | "stale" | "degraded" | "unknown" = "unknown";
  let cronCheckFailed = false;
  if (redisStatus === "ok") {
    try {
      const dailyCron = await getDailyCronStatus();
      cronStatus = dailyCron.health;
      await maybeSendDailyCronHealthAlert(dailyCron, "api:health");
    } catch (err) {
      cronCheckFailed = true;
      logWarn("[api/health] failed to read cron health", err instanceof Error ? err.message : String(err));
    }
  }

  const cronDegraded = cronStatus === "stale" || cronStatus === "degraded" || cronCheckFailed;
  if (cronStatus === "stale" || cronStatus === "degraded") {
    logWarn("[api/health] cron health degraded", undefined, { cronStatus });
  }

  const healthy = redisStatus === "ok" && !cronDegraded;
  const latencyMs = Date.now() - start;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      redis: redisStatus,
      cron: cronStatus,
      latencyMs,
      timestamp: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: {
        // Never cache health checks
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
