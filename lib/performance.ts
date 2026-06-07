import * as Sentry from "@sentry/nextjs";

export interface SearchTiming {
  cacheHitTime: number;
  duffelTime: number;
  tpTime: number;
  totalTime: number;
}

export async function trackSearchPerformance(
  route: string,
  timing: SearchTiming
): Promise<void> {
  try {
    const { cacheHitTime, duffelTime, tpTime, totalTime } = timing;

    Sentry.captureMessage(
      `Search perf: ${route} - cache=${cacheHitTime}ms, duffel=${duffelTime}ms, tp=${tpTime}ms, total=${totalTime}ms`,
      "debug"
    );

    Sentry.captureEvent({
      type: "transaction",
      transaction: `search.${route}`,
      contexts: {
        trace: {
          op: "search",
          description: `${route} search`,
          span_id: Sentry.getActiveSpan()?.spanContext().spanId || "unknown",
          trace_id: Sentry.getActiveSpan()?.spanContext().traceId || "unknown",
        },
      },
      measurements: {
        cache_hit_time: { value: cacheHitTime, unit: "millisecond" },
        duffel_time: { value: duffelTime, unit: "millisecond" },
        tp_time: { value: tpTime, unit: "millisecond" },
        total_time: { value: totalTime, unit: "millisecond" },
      },
    });
  } catch {
    // Silently fail
  }
}

export function isPerformanceAcceptable(totalTimeMs: number): boolean {
  return totalTimeMs < 5000;
}
