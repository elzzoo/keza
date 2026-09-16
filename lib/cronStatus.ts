import "server-only";

import {
  cronJobKey,
  cronLastRunKey,
  deriveCronHealth,
  type CronHealthStatus,
  type CronJobState,
  type CronRunState,
} from "@/lib/cronState";
import { DAILY_CRON_JOBS } from "@/lib/cronJobs";
import { redis } from "@/lib/redis";

export interface DailyCronJobStatus {
  path: (typeof DAILY_CRON_JOBS)[number];
  state: CronJobState | null;
}

export interface DailyCronStatus {
  health: CronHealthStatus;
  lastRun: CronRunState | null;
  jobs: DailyCronJobStatus[];
}

export async function getDailyCronStatus(): Promise<DailyCronStatus> {
  const lastRun = await redis.get<CronRunState>(cronLastRunKey("daily"));
  const jobs = lastRun?.runId
    ? await Promise.all(
        DAILY_CRON_JOBS.map(async (path) => ({
          path,
          state: await redis.get<CronJobState>(cronJobKey("daily", lastRun.runId, path)),
        })),
      )
    : DAILY_CRON_JOBS.map((path) => ({ path, state: null }));

  return {
    health: deriveCronHealth(
      lastRun,
      jobs.map((job) => job.state),
    ),
    lastRun: lastRun ?? null,
    jobs,
  };
}
