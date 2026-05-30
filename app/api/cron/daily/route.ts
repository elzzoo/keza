import { NextResponse } from "next/server";
import { hasCronSecret } from "@/lib/auth";

// ─── Daily cron orchestrator ──────────────────────────────────────────────────
// Vercel Hobby allows max 2 crons. This handler consolidates all non-alerts jobs
// into a single daily trigger at 5am UTC.
//
// Each sub-job is fired as an independent serverless invocation (fire-and-forget
// fetch) — they each get their own 10s Hobby window. This handler returns
// immediately after dispatching, well within maxDuration=10.

export const maxDuration = 10;

const DAILY_JOBS = [
  "/api/cron/miles-prices",   // 3am — recalibrate miles values from Redis observations
  "/api/cron/deals",          // 6am — refresh curated deals
  "/api/cron/promotions",     // 6:15am — apply transfer bonus promotions
  "/api/cron/digest",         // 10am — send weekly digest emails
  "/api/cron/onboarding",     // 11am — onboarding drip emails (J3/J7)
  "/api/cron/price-snapshot", // 9am — snapshot prices to history
  "/api/cron/prewarm",        // 4am — pre-warm cache for top corridors
] as const;

export async function GET(request: Request): Promise<NextResponse> {
  if (!hasCronSecret(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://keza-taupe.vercel.app";
  const secret = process.env.CRON_SECRET ?? "";
  const headers = { Authorization: `Bearer ${secret}` };

  // Fire all jobs in parallel as independent serverless invocations.
  // We do NOT await — each sub-job runs in its own function context.
  const triggered: string[] = [];
  for (const path of DAILY_JOBS) {
    fetch(`${base}${path}`, { method: "GET", headers }).catch(() => {
      // Ignore errors — each job handles its own error logging
    });
    triggered.push(path);
  }

  return NextResponse.json({
    ok: true,
    triggered,
    count: triggered.length,
    note: "Jobs fired as independent invocations — check individual cron logs for results",
  });
}
