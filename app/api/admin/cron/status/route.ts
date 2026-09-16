import { NextRequest, NextResponse } from "next/server";
import { hasAdminSecret, hasAdminSession, hasCronSecret } from "@/lib/auth";
import { getDailyCronStatus } from "@/lib/cronStatus";
import { logError } from "@/lib/logger";
import { rateLimitResponse } from "@/lib/ratelimit";

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
    return NextResponse.json({
      ok: true,
      daily: await getDailyCronStatus(),
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    logError("[api/admin/cron/status]", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
