import * as Sentry from "@sentry/nextjs";

export interface SearchTiming {
  cacheHitTime: number;
  duffelTime: number;
  tpTime: number;
  totalTime: number;
  partial?: boolean;
  fromCache?: boolean;
  duffelResultCount?: number;
  tpResultCount?: number;
  totalResultCount?: number;
}

/**
 * Track search performance metrics and log to Sentry for monitoring.
 * Records per-provider latency, cache hits, and result counts.
 */
export async function trackSearchPerformance(
  route: string,
  timing: SearchTiming
): Promise<void> {
  try {
    const {
      cacheHitTime,
      duffelTime,
      tpTime,
      totalTime,
      partial = false,
      fromCache = false,
      duffelResultCount = 0,
      tpResultCount = 0,
      totalResultCount = 0,
    } = timing;

    // Log structured message for easy Sentry filtering
    const status = fromCache ? "cache_hit" : partial ? "partial" : "complete";
    Sentry.captureMessage(
      `Search latency [${status}] ${route}: duffel=${duffelTime}ms tp=${tpTime}ms total=${totalTime}ms results=${totalResultCount}`,
      "info"
    );

    // Detailed transaction event with measurements
    Sentry.captureEvent({
      type: "transaction",
      transaction: `search.${route}.${status}`,
      contexts: {
        trace: {
          op: "search",
          description: `${route} search (${status})`,
          span_id: Sentry.getActiveSpan()?.spanContext().spanId || "unknown",
          trace_id: Sentry.getActiveSpan()?.spanContext().traceId || "unknown",
        },
        response: {
          status_code: 200,
          status: status,
          partial: partial,
          from_cache: fromCache,
        },
      },
      measurements: {
        cache_hit_time: { value: cacheHitTime, unit: "millisecond" },
        duffel_time: { value: duffelTime, unit: "millisecond" },
        tp_time: { value: tpTime, unit: "millisecond" },
        total_time: { value: totalTime, unit: "millisecond" },
        duffel_result_count: { value: duffelResultCount, unit: "none" },
        tp_result_count: { value: tpResultCount, unit: "none" },
        total_result_count: { value: totalResultCount, unit: "none" },
      },
      tags: {
        route: route,
        search_type: status,
        provider: duffelTime > 0 && tpTime > 0 ? "merged" : duffelTime > 0 ? "duffel" : "travelpayouts",
        latency_bucket: getLatencyBucket(totalTime),
      },
    });
  } catch {
    // Silently fail — performance tracking must never block a response
  }
}

/**
 * Categorize latency into buckets for dashboard aggregation and alerting.
 * Buckets help identify slow searches at a glance.
 */
function getLatencyBucket(totalTimeMs: number): string {
  if (totalTimeMs < 1000) return "excellent";
  if (totalTimeMs < 2000) return "good";
  if (totalTimeMs < 3000) return "ok";
  if (totalTimeMs < 5000) return "slow";
  return "very_slow";
}

/**
 * Check if total latency is within acceptable bounds (<5s p95 target).
 */
export function isPerformanceAcceptable(totalTimeMs: number): boolean {
  return totalTimeMs < 5000;
}

/**
 * Percentile tracking helper for latency monitoring.
 * Collects timing data for percentile calculation.
 */
export interface LatencyMetrics {
  p50: number;
  p95: number;
  p99: number;
  mean: number;
  min: number;
  max: number;
  sampleCount: number;
}

/**
 * Calculate percentiles from a sorted array of timings.
 */
export function calculatePercentiles(timings: number[]): LatencyMetrics {
  const sorted = timings.slice().sort((a, b) => a - b);
  const len = sorted.length;
  if (len === 0) {
    return { p50: 0, p95: 0, p99: 0, mean: 0, min: 0, max: 0, sampleCount: 0 };
  }

  const percentile = (p: number) => {
    const idx = Math.ceil((p / 100) * len) - 1;
    return sorted[Math.max(0, idx)];
  };

  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    p50: percentile(50),
    p95: percentile(95),
    p99: percentile(99),
    mean: Math.round(sum / len),
    min: sorted[0],
    max: sorted[len - 1],
    sampleCount: len,
  };
}
