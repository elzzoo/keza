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
