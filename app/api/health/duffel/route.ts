import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { rateLimitResponse } from "@/lib/ratelimit";

/**
 * GET /api/health/duffel
 *
 * Duffel provider health check endpoint.
 * Monitors error rate and response status.
 * Alerts trigger when error rate >= 5 errors/minute.
 *
 * Response shape:
 *   {
 *     status: "ok" | "degraded",
 *     errorRate: number (0-100, percentage),
 *     errorsPerMin: number,
 *     totalRequests: number,
 *     threshold: number (alert threshold in errors/min),
 *     timestamp: string (ISO 8601)
 *   }
 */

const DUFFEL_ERROR_TRACKING_KEY = "duffel:errors:1m";
const ERROR_THRESHOLD_PER_MIN = 5; // Trigger alert at >= 5 errors/min

interface DuffelErrorMetrics {
  window_start: number;
  error_count: number;
  total_count: number;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const limited = await rateLimitResponse(req, {
    namespace: "api:health:duffel",
    limit: 60,
    windowSeconds: 60,
  });
  if (limited) return limited;

  try {
    // Fetch metrics from Redis
    const metrics = await redis.get<DuffelErrorMetrics>(DUFFEL_ERROR_TRACKING_KEY);

    let errorRate = 0;
    let errorsPerMin = 0;
    let totalRequests = 0;

    if (metrics && metrics.total_count > 0) {
      totalRequests = metrics.total_count;
      errorRate = Math.round((metrics.error_count / metrics.total_count) * 100);

      // Calculate errors per minute based on window duration
      const windowDurationMs = Date.now() - metrics.window_start;
      const windowDurationMin = Math.max(0.1, windowDurationMs / 1000 / 60);
      errorsPerMin = Math.round((metrics.error_count / windowDurationMin) * 10) / 10;
    }

    // Determine health status based on errors per minute
    const isHealthy = errorsPerMin < ERROR_THRESHOLD_PER_MIN;

    return NextResponse.json(
      {
        status: isHealthy ? "ok" : "degraded",
        errorRate,
        errorsPerMin,
        totalRequests,
        threshold: ERROR_THRESHOLD_PER_MIN,
        timestamp: new Date().toISOString(),
      },
      {
        status: isHealthy ? 200 : 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch {
    // On any error, return degraded status to be safe
    return NextResponse.json(
      {
        status: "degraded",
        errorRate: 100,
        errorsPerMin: 0,
        totalRequests: 0,
        threshold: ERROR_THRESHOLD_PER_MIN,
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}
