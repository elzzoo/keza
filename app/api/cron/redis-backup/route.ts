import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { Resend } from "resend";
import { hasCronSecret } from "@/lib/auth";
import { logError, logWarn } from "@/lib/logger";
import { rateLimitResponse } from "@/lib/ratelimit";
import {
  REDIS_BACKUP_COUNTS_KEY,
  REDIS_BACKUP_LAST_KEY,
  REDIS_BACKUP_META_KEY,
  REDIS_BACKUP_STATE_TTL_SECONDS,
  buildCriticalRedisBackup,
} from "@/lib/redisBackup";
import { redis } from "@/lib/redis";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Xalifly Ops <onboarding@resend.dev>";

export const maxDuration = 10;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const limited = await rateLimitResponse(req, {
    namespace: "api:cron:redis-backup",
    limit: 3,
    windowSeconds: 3600,
  });
  if (limited) return limited;

  if (!hasCronSecret(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return Sentry.withMonitor("cron-redis-backup", async () => {
    try {
      const backup = await buildCriticalRedisBackup();
      await Promise.all([
        redis.set(REDIS_BACKUP_LAST_KEY, backup.exportedAt, { ex: REDIS_BACKUP_STATE_TTL_SECONDS }),
        redis.set(REDIS_BACKUP_COUNTS_KEY, backup.counts, { ex: REDIS_BACKUP_STATE_TTL_SECONDS }),
      ]);

      const to = process.env.ADMIN_BACKUP_EMAIL;
      if (!to) {
        await redis.set(
          REDIS_BACKUP_META_KEY,
          { exportedAt: backup.exportedAt, emailed: false, warning: "ADMIN_BACKUP_EMAIL not configured" },
          { ex: REDIS_BACKUP_STATE_TTL_SECONDS },
        );
        logWarn("[api/cron/redis-backup] ADMIN_BACKUP_EMAIL is not configured", undefined, {
          counts: backup.counts,
        });
        return NextResponse.json({
          ok: true,
          emailed: false,
          warning: "ADMIN_BACKUP_EMAIL not configured",
          counts: backup.counts,
        });
      }

      const json = JSON.stringify(backup, null, 2);
      const filename = `xalifly-redis-backup-${backup.exportedAt.slice(0, 10)}.json`;
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: `Xalifly Redis backup — ${backup.exportedAt.slice(0, 10)}`,
        text: [
          "Attached is the latest critical Redis backup snapshot.",
          "",
          `Exported at: ${backup.exportedAt}`,
          `Price alerts: ${backup.counts.priceAlerts}`,
          `B2B leads: ${backup.counts.b2bLeads}`,
          `Miles alerts: ${backup.counts.milesAlerts}`,
          `Newsletter subscribers: ${backup.counts.newsletterSubscribers}`,
          `Pro waitlist: ${backup.counts.proWaitlist}`,
        ].join("\n"),
        attachments: [
          {
            filename,
            content: Buffer.from(json).toString("base64"),
          },
        ],
      });

      await redis.set(
        REDIS_BACKUP_META_KEY,
        { exportedAt: backup.exportedAt, emailed: true, emailTo: to },
        { ex: REDIS_BACKUP_STATE_TTL_SECONDS },
      );

      Sentry.captureMessage("[cron] Redis backup emailed", {
        level: "info",
        extra: { counts: backup.counts },
      });

      return NextResponse.json({ ok: true, emailed: true, counts: backup.counts });
    } catch (err) {
      logError("[api/cron/redis-backup]", err);
      return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
    }
  }, { schedule: { type: "crontab", value: "30 6 * * *" } });
}
