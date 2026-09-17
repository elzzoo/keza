import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { hasAdminSession } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { rateLimitResponse } from "@/lib/ratelimit";
import {
  REDIS_BACKUP_COUNTS_KEY,
  REDIS_BACKUP_LAST_KEY,
  REDIS_BACKUP_META_KEY,
  REDIS_BACKUP_STATE_TTL_SECONDS,
  buildCriticalRedisBackup,
} from "@/lib/redisBackup";
import { redis } from "@/lib/redis";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const limited = await rateLimitResponse(req, {
    namespace: "api:admin:export:redis",
    limit: 5,
    windowSeconds: 3600,
  });
  if (limited) return limited;

  if (!hasAdminSession(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await buildCriticalRedisBackup();
    await Promise.all([
      redis.set(REDIS_BACKUP_LAST_KEY, snapshot.exportedAt, { ex: REDIS_BACKUP_STATE_TTL_SECONDS }),
      redis.set(REDIS_BACKUP_COUNTS_KEY, snapshot.counts, { ex: REDIS_BACKUP_STATE_TTL_SECONDS }),
      redis.set(
        REDIS_BACKUP_META_KEY,
        { exportedAt: snapshot.exportedAt, emailed: false, warning: "manual admin export" },
        { ex: REDIS_BACKUP_STATE_TTL_SECONDS },
      ),
    ]);

    Sentry.captureMessage("[admin] JSON export: redis critical data", "info");

    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="xalifly-redis-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    logError("[api/admin/export/redis]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
