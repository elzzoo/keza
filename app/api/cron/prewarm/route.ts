import { NextResponse } from "next/server";
import { searchEngine } from "@/lib/engine";
import { hasCronSecret } from "@/lib/auth";
import { logError } from "@/lib/logger";

// ─── Cache pre-warm cron ──────────────────────────────────────────────────────
// Runs every 2 hours (configured in vercel.json).
// Fires searchEngine() on high-traffic corridors 30-45 days out so the first
// real user on each route gets a cache hit instead of waiting 8-10s.
//
// Routes chosen: largest traffic corridors by historical search volume.
// Pre-warmed for economy/oneway only (most common search type).

export const maxDuration = 60;

const POPULAR_ROUTES = [
  // Asia–Americas
  { from: "SIN", to: "LAX" },
  { from: "NRT", to: "LAX" },
  { from: "NRT", to: "JFK" },
  // Gulf–Europe
  { from: "DXB", to: "LHR" },
  { from: "DXB", to: "CDG" },
  // Africa–Europe (Keza's focus)
  { from: "DSS", to: "CDG" },
  { from: "ABJ", to: "CDG" },
  { from: "LOS", to: "LHR" },
  { from: "NBO", to: "LHR" },
  { from: "ADD", to: "CDG" },
  // Europe–Americas
  { from: "CDG", to: "JFK" },
  { from: "LHR", to: "JFK" },
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
  // Pre-warm two departure windows: ~30 days and ~45 days out.
  // Stagger to avoid a thundering herd on Duffel.
  const dates = [futureDate(30), futureDate(45)];

  const jobs: Promise<void>[] = [];
  for (const { from, to } of POPULAR_ROUTES) {
    for (const date of dates) {
      jobs.push(
        searchEngine({ from, to, date, tripType: "oneway", stops: "any", cabin: "economy", passengers: 1 })
          .then(() => undefined)
          .catch((err) => {
            logError(`[prewarm] ${from}→${to} ${date} failed`, err);
          })
      );
    }
  }

  // Run up to 6 at a time to avoid overloading Duffel / Redis
  const BATCH = 6;
  let warmed = 0;
  for (let i = 0; i < jobs.length; i += BATCH) {
    await Promise.allSettled(jobs.slice(i, i + BATCH));
    warmed += Math.min(BATCH, jobs.length - i);
  }

  return NextResponse.json({
    ok: true,
    warmed,
    routes: POPULAR_ROUTES.length,
    dates,
    elapsed: `${Date.now() - start}ms`,
  });
}
