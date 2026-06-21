import { randomUUID } from "crypto";
import { searchEngineStream } from "@/lib/engine/stream";
import { CACHE_VERSION } from "@/lib/engine";
import type { SearchParams, FlightResult } from "@/lib/engine";
import { getForexRate } from "@/lib/autoCalibrate";
import { rateLimitResponse } from "@/lib/ratelimit";
import { logError, logWarn } from "@/lib/logger";
import { redis } from "@/lib/redis";
import { trackSearchPerformance, isPerformanceAcceptable } from "@/lib/performance";

// Vercel Hobby hard-kills at 10s. SSE partial arrives in ~2-3s, final in ~5-8s — fits.
export const maxDuration = 10;

const IATA_RE = /^[A-Z]{3}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function sanitizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const upper = raw.trim().toUpperCase();
  return IATA_RE.test(upper) ? upper : null;
}

function isValidFutureDate(raw: unknown): raw is string {
  if (typeof raw !== "string" || !DATE_RE.test(raw)) return false;
  const d = new Date(raw + "T00:00:00Z");
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const maxDate = new Date(today);
  maxDate.setUTCFullYear(maxDate.getUTCFullYear() + 1);
  return d >= today && d <= maxDate;
}

/**
 * SSE streaming search endpoint.
 *
 * Sends Server-Sent Events:
 *   data: {"type":"partial","results":[...],"forexRate":600}\n\n   — Duffel results only (~2-3s)
 *   data: {"type":"final","results":[...],"forexRate":600}\n\n     — merged Duffel+TP (~5-8s)
 *
 * Falls back to {"type":"error","message":"..."} on failure.
 * If only a partial was sent before an error, the client keeps the partial.
 *
 * Performance tracking:
 * - Measures cache hit time, Duffel time, TP time, and total time
 * - Logs results to Sentry for performance monitoring
 * - Falls back to v27, v26 caches if search fails
 */
export async function POST(request: Request) {
  const requestId = randomUUID();
  const _t0 = Date.now();

  const limited = await rateLimitResponse(request, {
    namespace: "api:search:stream:post",
    limit: 30,
    windowSeconds: 60,
  });
  if (limited) return limited;

  let body: Partial<SearchParams>;
  try {
    body = await request.json() as Partial<SearchParams>;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const from = sanitizeCode(body.from);
  const to   = sanitizeCode(body.to);
  const date = isValidFutureDate(body.date) ? body.date : null;
  if (!from || !to || !date) {
    return new Response(
      JSON.stringify({ error: "Invalid input: from/to must be IATA codes, date must be YYYY-MM-DD" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const passengers = Math.min(Math.max(Number(body.passengers) || 1, 1), 9);
  const searchParams: SearchParams = {
    from, to, date,
    returnDate:   isValidFutureDate(body.returnDate) ? body.returnDate : undefined,
    tripType:     body.tripType === "roundtrip" ? "roundtrip" : "oneway",
    stops:        body.stops === "direct" ? "direct" : "any",
    cabin:        (["economy", "premium", "business", "first"] as const).includes(body.cabin as never)
                    ? (body.cabin as "economy" | "premium" | "business" | "first")
                    : "economy",
    passengers,
    userPrograms: Array.isArray(body.userPrograms)
      ? body.userPrograms.filter((p): p is string => typeof p === "string").slice(0, 20)
      : [],
  };

  const encoder = new TextEncoder();
  let partialSent = false;
  const CACHE_VERSION_FALLBACKS = ["v27", "v26"] as const;

  function buildCacheKey(
    version: string,
    p: {
      from: string; to: string; date: string;
      tripType: string; returnDate?: string;
      stops: string; cabin: string; passengers: number;
    },
  ): string {
    return `keza:${version}:${p.from}:${p.to}:${p.date}:${p.tripType}:${p.returnDate ?? ""}:${p.stops}:${p.cabin}:${p.passengers}`;
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      // Fetch forex rate in background — attach to both partial and final
      const forexPromise = getForexRate().catch(() => 600);
      let cacheHitTime = 0;
      let duffelTime = 0;
      let tpTime = 0;

      try {
        const searchStart = Date.now();
        const finalResults = await searchEngineStream(
          searchParams,
          async (partial: FlightResult[]) => {
            partialSent = true;
            const forexRate = await forexPromise;
            send({ type: "partial", results: partial, forexRate });
            // Duffel results arrive in the partial — measure from start to here
            duffelTime = Date.now() - searchStart;
          },
          requestId,
        );
        const totalTime = Date.now() - _t0;

        // Track performance metrics
        tpTime = totalTime - duffelTime;
        await trackSearchPerformance("stream", {
          cacheHitTime,
          duffelTime,
          tpTime,
          totalTime,
        });

        // Log performance warning if unacceptable
        if (!isPerformanceAcceptable(totalTime)) {
          logWarn(
            `[api/search/stream] slow search`,
            undefined,
            {
              route: `${from}-${to}`,
              totalTime,
              duffelTime,
              tpTime,
              passengers,
              cabin: searchParams.cabin,
            },
          );
        }

        const forexRate = await forexPromise;
        send({ type: "final", results: finalResults, forexRate });
      } catch (err) {
        logError("[api/search/stream]", err, { requestId });

        // Fallback chain: try v27, then v26 caches
        if (!partialSent) {
          const keyParams = {
            from, to, date,
            tripType: searchParams.tripType!,
            returnDate: searchParams.returnDate,
            stops: searchParams.stops!,
            cabin: searchParams.cabin!,
            passengers,
          };
          const versions = [CACHE_VERSION, ...CACHE_VERSION_FALLBACKS];
          let fallbackResults: FlightResult[] = [];
          for (const ver of versions) {
            const cached = await redis
              .get<FlightResult[]>(buildCacheKey(ver, keyParams))
              .catch(() => null);
            if (cached && cached.length > 0) {
              fallbackResults = cached;
              cacheHitTime = Date.now() - _t0;
              logWarn(
                `[api/search/stream] fallback to cache ${ver}`,
                undefined,
                {
                  route: `${from}-${to}`,
                  cacheVersion: ver,
                  resultCount: fallbackResults.length,
                },
              );
              break;
            }
          }

          if (fallbackResults.length > 0) {
            const forexRate = await forexPromise;
            send({
              type: "final",
              results: fallbackResults,
              forexRate,
              fromCache: true,
            });
          } else {
            // No cache, send error
            send({
              type: "error",
              message: "Search failed and no cached results available",
              partialSent,
            });
          }
        } else {
          // Partial already sent, just notify of error
          send({
            type: "error",
            message: "Search failed",
            partialSent: true,
          });
        }
      } finally {
        controller.close();
      }
    },
  });

  const responseTime = Date.now() - _t0;
  return new Response(stream, {
    headers: {
      "Content-Type":    "text/event-stream",
      "Cache-Control":   "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "Connection":      "keep-alive",
      "X-Request-Id":    requestId,
      "X-Response-Time": `${responseTime}ms`,
    },
  });
}
