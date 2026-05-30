import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { rateLimitResponse } from "@/lib/ratelimit";

/**
 * GET /api/health
 *
 * Health check endpoint for uptime monitors (Vercel, UptimeRobot, etc.).
 * Checks Redis connectivity. Returns 200 if healthy, 503 if degraded.
 *
 * Response shape:
 *   { status: "ok" | "degraded", redis: "ok" | "error", uptime: number }
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

  const healthy = redisStatus === "ok";
  const latencyMs = Date.now() - start;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      redis: redisStatus,
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
