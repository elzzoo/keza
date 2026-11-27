import { randomUUID } from "crypto";
import { searchEngineStream } from "@/lib/engine/stream";
import { CACHE_VERSION, CACHE_VERSION_FALLBACKS } from "@/lib/engine";
import type { SearchParams, FlightResult } from "@/lib/engine";
import { getForexRate } from "@/lib/autoCalibrate";
import { rateLimitResponse } from "@/lib/ratelimit";
import { logError, logWarn } from "@/lib/logger";
import { redis } from "@/lib/redis";
import { trackSearchPerformance, isPerformanceAcceptable } from "@/lib/performance";
import { parseSearchParams } from "@/lib/searchInput";
import { buildSearchCacheKey } from "@/lib/searchCacheKey";
import { countStreamSearch } from "@/lib/streamSearchCounters";

// Vercel Hobby hard-kills at 10s. SSE partial arrives in ~2-3s, final in ~5-8s — fits.
export const maxDuration = 10;

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
 * - Measures total request time and counts results by their actual source
 * - Logs results to Sentry for performance monitoring
 * - Falls back only to profile-aware caches if search fails
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

  const parsed = parseSearchParams(body);
  if (!parsed.ok) {
    return new Response(
      JSON.stringify({ error: parsed.error }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
  const searchParams = parsed.params;
  const { from, to, date, passengers } = searchParams;

  const encoder = new TextEncoder();
  let partialSent = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      // Fetch forex rate in background — attach to both partial and final
      const forexPromise = getForexRate().catch(() => 600);
      try {
        const finalResults = await searchEngineStream(
          searchParams,
          async (partial: FlightResult[]) => {
            partialSent = true;
            const forexRate = await forexPromise;
            send({ type: "partial", results: partial, forexRate });
          },
          requestId,
        );
        const totalTime = Date.now() - _t0;

        // Track only measured timing and provider provenance from final results.
        await trackSearchPerformance(`${from}-${to}`, {
          totalTime,
          providerSources: finalResults.map((result) => result.source),
          partial: !partialSent,
          fromCache: false,
          totalResultCount: finalResults.length,
        });

        // Log performance warning if unacceptable
        if (!isPerformanceAcceptable(totalTime)) {
          logWarn(
            `[api/search/stream] slow search`,
            undefined,
            {
              route: `${from}-${to}`,
              totalTime,
              totalResults: finalResults.length,
              passengers,
              cabin: searchParams.cabin,
            },
          );
        }

        const forexRate = await forexPromise;
        send({ type: "final", results: finalResults, forexRate });
        await countStreamSearch(from, to);
      } catch (err) {
        logError("[api/search/stream]", err, { requestId });

        // Older unscoped caches cannot safely serve personalized results.
        if (!partialSent) {
          const keyParams = {
            from, to, date,
            tripType: searchParams.tripType!,
            returnDate: searchParams.returnDate,
            stops: searchParams.stops!,
            cabin: searchParams.cabin!,
            passengers,
            userPrograms: searchParams.userPrograms,
          };
          const versions = [CACHE_VERSION, ...CACHE_VERSION_FALLBACKS];
          let fallbackResults: FlightResult[] = [];
          for (const ver of versions) {
            const cached = await redis
              .get<FlightResult[]>(buildSearchCacheKey(ver, keyParams))
              .catch(() => null);
            if (cached && cached.length > 0) {
              fallbackResults = cached;
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
            await countStreamSearch(from, to);
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
