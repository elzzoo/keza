import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { rateLimitResponse } from "@/lib/ratelimit";

/**
 * GET /api/metrics/redis
 *
 * Redis capacity and performance metrics endpoint.
 * Monitors memory usage, latency (p95), and throughput.
 * Alerts trigger when:
 *   - Memory > 85% of maxmemory
 *   - p95 latency > 500ms
 *
 * Response shape:
 *   {
 *     status: "ok" | "degraded",
 *     memoryPercent: number,
 *     memoryMb: number,
 *     maxmemoryMb: number,
 *     latencyP95: number (ms),
 *     opsPerSec: number,
 *     thresholds: {
 *       memoryPercent: 85,
 *       latencyMs: 500
 *     },
 *     timestamp: string (ISO 8601)
 *   }
 */

const MEMORY_THRESHOLD_PERCENT = 85;
const LATENCY_THRESHOLD_MS = 500;
const LATENCY_SAMPLE_COUNT = 10;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const limited = await rateLimitResponse(req, {
    namespace: "api:metrics:redis",
    limit: 60,
    windowSeconds: 60,
  });
  if (limited) return limited;

  try {
    // Measure latency with ping samples
    const latencies: number[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const redisClient = redis as any;

    for (let i = 0; i < LATENCY_SAMPLE_COUNT; i++) {
      const start = Date.now();
      try {
        await Promise.race([
          redisClient.ping(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("ping timeout")), 1000)
          ),
        ]);
        latencies.push(Date.now() - start);
      } catch {
        latencies.push(1000); // timeout counts as 1000ms
      }
    }

    // Calculate p95 latency
    const sortedLatencies = latencies.sort((a, b) => a - b);
    const p95Index = Math.ceil(LATENCY_SAMPLE_COUNT * 0.95) - 1;
    const latencyP95 = sortedLatencies[Math.max(0, p95Index)];

    // Fetch Redis info
    const info = await redisClient.info();
    const usedMemory = (info as Record<string, number>)?.used_memory ?? 0;
    const maxMemory = (info as Record<string, number>)?.maxmemory ?? 1024 * 1024 * 1024; // default 1GB
    const opsPerSec = (info as Record<string, number>)?.instantaneous_ops_per_sec ?? 0;

    const memoryMb = Math.round(usedMemory / 1024 / 1024);
    const maxmemoryMb = Math.round(maxMemory / 1024 / 1024);
    const memoryPercent = maxMemory > 0 ? Math.round((usedMemory / maxMemory) * 100) : 0;

    // Determine health status
    const isHealthy = memoryPercent < MEMORY_THRESHOLD_PERCENT && latencyP95 < LATENCY_THRESHOLD_MS;

    return NextResponse.json(
      {
        status: isHealthy ? "ok" : "degraded",
        memoryPercent,
        memoryMb,
        maxmemoryMb,
        latencyP95,
        opsPerSec,
        thresholds: {
          memoryPercent: MEMORY_THRESHOLD_PERCENT,
          latencyMs: LATENCY_THRESHOLD_MS,
        },
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
        memoryPercent: 100,
        memoryMb: 0,
        maxmemoryMb: 0,
        latencyP95: 1000,
        opsPerSec: 0,
        thresholds: {
          memoryPercent: MEMORY_THRESHOLD_PERCENT,
          latencyMs: LATENCY_THRESHOLD_MS,
        },
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
