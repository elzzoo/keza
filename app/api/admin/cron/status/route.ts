import { NextRequest, NextResponse } from "next/server";
import { hasAdminSecret, hasAdminSession, hasCronSecret } from "@/lib/auth";
import { cronJobKey, cronLastRunKey, type CronJobState, type CronRunState } from "@/lib/cronState";
import { DAILY_CRON_JOBS } from "@/lib/cronJobs";
import { logError } from "@/lib/logger";
import { rateLimitResponse } from "@/lib/ratelimit";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!hasAdminSession(req) && !hasAdminSecret(req) && !hasCronSecret(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const limited = await rateLimitResponse(req, {
    namespace: "api:admin:cron:status",
    limit: 60,
    windowSeconds: 60,
  });
  if (limited) return limited;

  try {
    const lastRun = await redis.get<CronRunState>(cronLastRunKey("daily"));
    const jobs = lastRun?.runId
      ? await Promise.all(
          DAILY_CRON_JOBS.map(async (path) => ({
            path,
            state: await redis.get<CronJobState>(cronJobKey("daily", lastRun.runId, path)),
          })),
        )
      : DAILY_CRON_JOBS.map((path) => ({ path, state: null }));

    return NextResponse.json({
      ok: true,
      daily: {
        lastRun: lastRun ?? null,
        jobs,
      },
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    logError("[api/admin/cron/status]", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
