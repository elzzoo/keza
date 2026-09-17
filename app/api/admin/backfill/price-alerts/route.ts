import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { hasAdminSecret, hasAdminSession } from "@/lib/auth";
import { backfillPriceAlertsToPostgres, getPriceAlertsStoreParity } from "@/lib/alertsPostgres";
import { logError } from "@/lib/logger";
import { rateLimitResponse } from "@/lib/ratelimit";

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
    return NextResponse.json({ ok: true, ...parity });
  } catch (err) {
    logError("[api/admin/backfill/price-alerts] status", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
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
    const result = await backfillPriceAlertsToPostgres({ dryRun });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logError("[api/admin/backfill/price-alerts]", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
