import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { hasAdminSecret, hasAdminSession } from "@/lib/auth";
import {
  backfillPriceAlertsToPostgres,
  getPriceAlertsReadSource,
  getPriceAlertsStoreParity,
  isPriceAlertPostgresSyncEnabled,
} from "@/lib/alertsPostgres";
import { logError } from "@/lib/logger";
import { rateLimitResponse } from "@/lib/ratelimit";
import { redis } from "@/lib/redis";
import { REDIS_BACKUP_LAST_KEY } from "@/lib/redisBackup";

const WRITE_CONFIRMATION = "BACKFILL_PRICE_ALERTS";
const REQUIRED_BACKUP_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function getAdminErrorDetails(err: unknown): { name: string; message: string; code?: string } {
  if (!(err instanceof Error)) {
    return { name: "UnknownError", message: String(err).slice(0, 300) };
  }

  const maybeCode = (err as Error & { code?: unknown }).code;
  return {
    name: err.name || "Error",
    message: err.message.slice(0, 300),
    ...(typeof maybeCode === "string" ? { code: maybeCode } : {}),
  };
}

async function getFreshRedisBackupStatus(now = Date.now()): Promise<{
  fresh: boolean;
  lastBackupAt: string | null;
  ageMs: number | null;
}> {
  const lastBackupAt = await redis.get<string>(REDIS_BACKUP_LAST_KEY);
  if (!lastBackupAt) {
    return { fresh: false, lastBackupAt: null, ageMs: null };
  }

  const timestamp = Date.parse(lastBackupAt);
  if (!Number.isFinite(timestamp)) {
    return { fresh: false, lastBackupAt, ageMs: null };
  }

  const ageMs = now - timestamp;
  return {
    fresh: ageMs >= 0 && ageMs <= REQUIRED_BACKUP_MAX_AGE_MS,
    lastBackupAt,
    ageMs,
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const limited = await rateLimitResponse(req, {
    namespace: "api:admin:backfill:price-alerts:status",
    limit: 10,
    windowSeconds: 3600,
  });
  if (limited) return limited;

  if (!hasAdminSession(req) && !hasAdminSecret(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parity = await getPriceAlertsStoreParity();
    return NextResponse.json({
      ok: true,
      postgresSyncEnabled: isPriceAlertPostgresSyncEnabled(),
      readSource: getPriceAlertsReadSource(),
      ...parity,
    });
  } catch (err) {
    logError("[api/admin/backfill/price-alerts] status", err);
    return NextResponse.json(
      { ok: false, error: "Internal error", details: getAdminErrorDetails(err) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const limited = await rateLimitResponse(req, {
    namespace: "api:admin:backfill:price-alerts",
    limit: 3,
    windowSeconds: 3600,
  });
  if (limited) return limited;

  if (!hasAdminSession(req) && !hasAdminSecret(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dryRun = req.nextUrl.searchParams.get("dryRun") !== "false";
    if (!dryRun) {
      const confirm = req.nextUrl.searchParams.get("confirm");
      if (confirm !== WRITE_CONFIRMATION) {
        return NextResponse.json(
          {
            ok: false,
            error: `Write backfill requires confirm=${WRITE_CONFIRMATION}`,
            code: "CONFIRMATION_REQUIRED",
          },
          { status: 400 },
        );
      }

      const backupStatus = await getFreshRedisBackupStatus();
      if (!backupStatus.fresh) {
        return NextResponse.json(
          {
            ok: false,
            error: "A fresh Redis backup is required before running a write backfill",
            code: "FRESH_BACKUP_REQUIRED",
            lastBackupAt: backupStatus.lastBackupAt,
            backupAgeMs: backupStatus.ageMs,
          },
          { status: 409 },
        );
      }
    }

    const result = await backfillPriceAlertsToPostgres({ dryRun });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logError("[api/admin/backfill/price-alerts]", err);
    return NextResponse.json(
      { ok: false, error: "Internal error", details: getAdminErrorDetails(err) },
      { status: 500 },
    );
  }
}
