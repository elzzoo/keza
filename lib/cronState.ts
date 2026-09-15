import "server-only";
import { redis } from "@/lib/redis";
import { logWarn } from "@/lib/logger";

export const CRON_STATE_TTL_SECONDS = 7 * 24 * 60 * 60;

export type CronRunStatus = "dispatched" | "completed" | "failed";
export type CronJobStatus = "dispatching" | "accepted" | "rejected" | "dispatch_error";

export interface CronRunState {
  runId: string;
  status: CronRunStatus;
  startedAt: string;
  finishedAt?: string;
  jobs?: readonly string[];
  error?: string;
}

export interface CronJobState {
  runId: string;
  path: string;
  status: CronJobStatus;
  startedAt: string;
  finishedAt?: string;
  statusCode?: number;
  error?: string;
}

export type CronHealthStatus = "ok" | "running" | "stale" | "degraded" | "unknown";

interface DeriveCronHealthOptions {
  now?: Date;
  staleAfterMs?: number;
}

function slugPath(path: string): string {
  return path.split("/").filter(Boolean).join(":");
}

export function cronLastRunKey(cronName: string): string {
  return `cron:${cronName}:lastRun`;
}

export function cronRunKey(cronName: string, runId: string): string {
  return `cron:${cronName}:runs:${runId}`;
}

export function cronJobKey(cronName: string, runId: string, path: string): string {
  return `cron:${cronName}:runs:${runId}:job:${slugPath(path)}`;
}

export async function recordCronState(
  key: string,
  value: CronRunState | CronJobState,
  ttlSeconds = CRON_STATE_TTL_SECONDS,
): Promise<void> {
  await redis.set(key, value, { ex: ttlSeconds }).catch((err) => {
    logWarn("[cronState] failed to record state", String(err), { key });
  });
}

export function deriveCronHealth(
  lastRun: CronRunState | null | undefined,
  jobs: Array<CronJobState | null | undefined>,
  { now = new Date(), staleAfterMs = 26 * 60 * 60 * 1000 }: DeriveCronHealthOptions = {},
): CronHealthStatus {
  if (!lastRun) return "unknown";

  const startedAt = Date.parse(lastRun.startedAt);
  if (!Number.isFinite(startedAt)) return "unknown";
  if (now.getTime() - startedAt > staleAfterMs) return "stale";

  if (lastRun.status === "failed") return "degraded";
  if (jobs.some((job) => job?.status === "rejected" || job?.status === "dispatch_error")) {
    return "degraded";
  }
  if (jobs.some((job) => job?.status === "dispatching" || job === null || job === undefined)) {
    return "running";
  }

  return "ok";
}
