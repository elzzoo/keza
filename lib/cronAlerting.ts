import "server-only";

import * as Sentry from "@sentry/nextjs";
import { Resend } from "resend";
import { redis } from "@/lib/redis";
import { logError, logWarn } from "@/lib/logger";
import type { DailyCronStatus } from "@/lib/cronStatus";

const ALERT_TTL_SECONDS = 12 * 60 * 60;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Xalifly Ops <onboarding@resend.dev>";

export interface CronHealthAlertResult {
  attempted: boolean;
  sent: boolean;
  reason?: "healthy" | "duplicate" | "missing_recipient" | "send_failed";
}

function cronAlertRecipient(): string | undefined {
  return process.env.CRON_ALERT_EMAIL ?? process.env.ADMIN_ALERT_EMAIL ?? process.env.ADMIN_BACKUP_EMAIL;
}

function alertKey(status: DailyCronStatus): string {
  const runId = status.lastRun?.runId ?? "no-run";
  return `cron:daily:alerts:${status.health}:${runId}`;
}

function failingJobs(status: DailyCronStatus): string[] {
  return status.jobs
    .filter((job) => job.state?.status === "rejected" || job.state?.status === "dispatch_error")
    .map((job) => `${job.path} (${job.state?.status}${job.state?.statusCode ? ` ${job.state.statusCode}` : ""})`);
}

export async function maybeSendDailyCronHealthAlert(
  status: DailyCronStatus,
  source: "api:health" | "api:admin:cron:status" = "api:health",
): Promise<CronHealthAlertResult> {
  if (status.health !== "stale" && status.health !== "degraded") {
    return { attempted: false, sent: false, reason: "healthy" };
  }

  const key = alertKey(status);
  const reserved = await redis.set(key, new Date().toISOString(), { ex: ALERT_TTL_SECONDS, nx: true });
  if (reserved !== "OK") {
    return { attempted: false, sent: false, reason: "duplicate" };
  }

  const to = cronAlertRecipient();
  if (!to) {
    logWarn("[cronAlerting] cron health alert recipient is not configured", undefined, {
      health: status.health,
      runId: status.lastRun?.runId,
      source,
    });
    return { attempted: true, sent: false, reason: "missing_recipient" };
  }

  const failedJobs = failingJobs(status);
  const lastRun = status.lastRun;
  const subject = `[Xalifly] Daily cron ${status.health}`;
  const text = [
    `Daily cron health is ${status.health}.`,
    "",
    `Source: ${source}`,
    `Run ID: ${lastRun?.runId ?? "none"}`,
    `Run status: ${lastRun?.status ?? "none"}`,
    `Started at: ${lastRun?.startedAt ?? "unknown"}`,
    `Finished at: ${lastRun?.finishedAt ?? "unknown"}`,
    "",
    failedJobs.length ? "Failing jobs:" : "Failing jobs: none recorded",
    ...failedJobs.map((job) => `- ${job}`),
    "",
    "Check /api/admin/cron/status or the admin dashboard for full details.",
  ].join("\n");

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      text,
    });

    Sentry.captureMessage("[cron] Daily cron health alert sent", {
      level: "warning",
      extra: {
        health: status.health,
        runId: status.lastRun?.runId,
        failedJobs,
        source,
      },
    });

    return { attempted: true, sent: true };
  } catch (err) {
    logError("[cronAlerting] failed to send cron health alert", err);
    return { attempted: true, sent: false, reason: "send_failed" };
  }
}
