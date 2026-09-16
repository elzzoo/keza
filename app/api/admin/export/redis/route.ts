import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { hasAdminSession } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { rateLimitResponse } from "@/lib/ratelimit";
import { buildCriticalRedisBackup } from "@/lib/redisBackup";

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
