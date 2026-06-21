import { NextResponse } from "next/server";
import { searchEngine, type SearchParams } from "@/lib/engine";
import { hasCronSecret } from "@/lib/auth";
import { rateLimitResponse } from "@/lib/ratelimit";
import { logWarn } from "@/lib/logger";
import { TOP_ROUTES, getPreWarmDates } from "@/lib/prewarm";

// ─── Hourly route pre-warming cron ────────────────────────────────────────────
// Runs hourly (configured in vercel.json).
// Pre-warms top 20 corridors with dates 15-90 days out to keep popular routes
// cached and ready. Batches 5 requests at a time with 1s between batches
// to respect rate limits and avoid overwhelming the search engine.
//
// Rate limiting: 5 parallel requests, 1s delay between batches.
// This keeps concurrency manageable while maintaining throughput.

export const maxDuration = 300; // 5 minutes (Vercel Pro plan allows up to 900s)

function validateCronSecret(req: Request): boolean {
  return hasCronSecret(req);
}

export async function POST(request: Request): Promise<NextResponse> {
  const limited = await rateLimitResponse(request, {
    namespace: "api:cron:prewarm",
    limit: 5,
    windowSeconds: 300,
  });
  if (limited) return limited;

  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    logWarn("[cron/prewarm-routes] Starting route pre-warming");

    const dates = getPreWarmDates();
    const prewarmParams: SearchParams[] = [];

    // Build search parameter combinations: each route × first 3 dates
    for (const route of TOP_ROUTES) {
      for (const date of dates.slice(0, 3)) {
        prewarmParams.push({
          from: route.from,
          to: route.to,
          date,
          tripType: "oneway",
          stops: "any",
          cabin: "economy",
          passengers: 1,
          userPrograms: [],
        });
      }
    }

    let completed = 0;
    let errors = 0;

    // Batch requests: 5 at a time with 1s delay between batches
    for (let i = 0; i < prewarmParams.length; i += 5) {
      const batch = prewarmParams.slice(i, i + 5);

      // Execute batch in parallel
      await Promise.all(
        batch.map(async (params) => {
          try {
            await searchEngine(params, `prewarm-${Date.now()}`);
            completed++;
          } catch (err) {
            errors++;
            logWarn(
              `[prewarm] Failed for ${params.from}→${params.to} on ${params.date}`,
              err instanceof Error ? err.message : String(err)
            );
          }
        })
      );

      // Rate limiting delay between batches
      if (i + 5 < prewarmParams.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    logWarn(
      `[cron/prewarm-routes] Completed: ${completed}/${prewarmParams.length} (${errors} errors)`
    );

    return NextResponse.json({
      completed,
      total: prewarmParams.length,
      errors,
    });
  } catch (err) {
    logWarn(
      "[cron/prewarm-routes] Failed",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// Legacy GET endpoint for backwards compatibility
export async function GET(request: Request): Promise<NextResponse> {
  return POST(request);
}
