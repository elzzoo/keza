import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { hasAdminSecret, hasAdminSession } from "@/lib/auth";
import { rateLimitResponse } from "@/lib/ratelimit";
import { getSearchObservabilitySummary } from "@/lib/searchObservability";
import { logError } from "@/lib/logger";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const limited = await rateLimitResponse(req, {
    namespace: "api:admin:search:status",
    limit: 30,
    windowSeconds: 60,
  });
  if (limited) return limited;

  if (!hasAdminSession(req) && !hasAdminSecret(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const daysParam = Number(req.nextUrl.searchParams.get("days") ?? 7);
  const days = Number.isFinite(daysParam) ? daysParam : 7;

  try {
    const summary = await getSearchObservabilitySummary(days);
    return NextResponse.json({ ok: true, ...summary }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    logError("[api/admin/search/status]", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
