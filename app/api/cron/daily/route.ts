import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { hasCronSecret } from "@/lib/auth";
import { rateLimitResponse } from "@/lib/ratelimit";
import { logError, logWarn } from "@/lib/logger";
import { cronJobKey, cronLastRunKey, cronRunKey, recordCronState } from "@/lib/cronState";

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

const CRON_NAME = "daily";
const LAST_RUN_KEY = cronLastRunKey(CRON_NAME);

async function dispatchJob(
  base: string,
  path: (typeof DAILY_JOBS)[number],
  headers: HeadersInit,
  runId: string,
): Promise<void> {
  const startedAt = new Date().toISOString();
  const key = cronJobKey(CRON_NAME, runId, path);

  await recordCronState(key, {
    runId,
    path,
    status: "dispatching",
    startedAt,
  });

  try {
    const res = await fetch(`${base}${path}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    await recordCronState(key, {
      runId,
      path,
      status: res.ok ? "accepted" : "rejected",
      statusCode: res.status,
      startedAt,
      finishedAt: new Date().toISOString(),
    });
  } catch (err) {
    await recordCronState(key, {
      runId,
      path,
      status: "dispatch_error",
      error: err instanceof Error ? err.message : String(err),
      startedAt,
      finishedAt: new Date().toISOString(),
    });
    logWarn("[api/cron/daily] dispatch failed", err instanceof Error ? err.message : String(err), { path, runId });
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const limited = await rateLimitResponse(request, {
      namespace: "api:cron:daily",
      limit: 5,
      windowSeconds: 300,
    });
    if (limited) return limited;

    if (!hasCronSecret(request)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://keza-taupe.vercel.app";
    const secret = process.env.CRON_SECRET ?? "";
    const headers = { Authorization: `Bearer ${secret}` };
    const runId = randomUUID();
    const startedAt = new Date().toISOString();

    await recordCronState(cronRunKey(CRON_NAME, runId), {
      runId,
      status: "dispatched",
      startedAt,
      jobs: DAILY_JOBS,
    });
    await recordCronState(LAST_RUN_KEY, {
      runId,
      status: "dispatched",
      startedAt,
      jobs: DAILY_JOBS,
    });

    // Fire all jobs in parallel as independent serverless invocations. The
    // dispatcher records acceptance/errors when observable, while every sub-job
    // still owns its full function window and detailed logs.
    const triggered: string[] = [];
    for (const path of DAILY_JOBS) {
      void dispatchJob(base, path, headers, runId);
      triggered.push(path);
    }

    return NextResponse.json({
      ok: true,
      runId,
      triggered,
      count: triggered.length,
      note: "Jobs dispatched as independent invocations; check cron:daily:lastRun and cron:daily:runs:{runId}:job:* for dispatch state",
    });
  } catch (err) {
    logError("[api/cron/daily]", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
