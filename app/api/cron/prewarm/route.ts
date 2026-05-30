import { NextResponse } from "next/server";
import { searchEngine } from "@/lib/engine";
import { hasCronSecret } from "@/lib/auth";
import { logError } from "@/lib/logger";

// ─── Cache pre-warm cron ──────────────────────────────────────────────────────
// Runs daily at 4am UTC (configured in vercel.json).
// Fires searchEngine() on top-traffic corridors 30 days out so the first
// real user on each route gets a cache hit instead of waiting 8-10s.
//
// Vercel Hobby hard-kills at 10s. Routes reduced to 5 (all run in parallel,
// each searchEngine() takes ~3-5s on cache hit or ~7-8s cold).
// Routes chosen: KEZA's highest-traffic corridors (Africa-Europe focus).

export const maxDuration = 10;

const POPULAR_ROUTES = [
  // Africa–Europe (KEZA's core)
  { from: "DSS", to: "CDG" },
  { from: "ABJ", to: "CDG" },
  { from: "LOS", to: "LHR" },
  // Europe–Americas
  { from: "CDG", to: "JFK" },
  // Gulf–Europe
  { from: "DXB", to: "LHR" },
] as const;

/** Generate a YYYY-MM-DD date N days from today */
function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!hasCronSecret(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  // Single departure window (30 days out) — Hobby plan allows only ~8s execution.
  const dates = [futureDate(30)];

  // Run all 5 routes in parallel (single date, 30 days out).
  // With maxDuration=10 there is no time for sequential batching.
  // Each searchEngine() returns instantly on cache hit, or in ~7s cold.
  const results = await Promise.allSettled(
    POPULAR_ROUTES.map(({ from, to }) =>
      searchEngine({ from, to, date: dates[0]!, tripType: "oneway", stops: "any", cabin: "economy", passengers: 1 })
        .then(() => `${from}→${to}: ok`)
        .catch((err) => {
          logError(`[prewarm] ${from}→${to} failed`, err);
          return `${from}→${to}: failed`;
        })
    )
  );

  const warmed = results.filter(r => r.status === "fulfilled" && String((r as PromiseFulfilledResult<string>).value).endsWith("ok")).length;

  return NextResponse.json({
    ok: true,
    warmed,
    routes: POPULAR_ROUTES.length,
    date: dates[0],
    elapsed: `${Date.now() - start}ms`,
  });
}
