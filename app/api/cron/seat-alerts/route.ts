import { NextRequest, NextResponse } from "next/server";
import { processAllSeatAlerts } from "@/lib/seatAlerts";
import { hasCronSecret } from "@/lib/auth";
import { rateLimitResponse } from "@/lib/ratelimit";
import { logError } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

export async function GET(req: NextRequest) {
  const limited = await rateLimitResponse(req, {
    namespace: "api:cron:seat-alerts",
    limit: 5,
    windowSeconds: 300,
  });
  if (limited) return limited;

  if (!hasCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Sentry.withMonitor("cron-seat-alerts", async () => {
    try {
      const result = await processAllSeatAlerts();

      if (result.errors.length > 0) {
        logError("Cron seat-alerts errors", result.errors);
      }

      return NextResponse.json({
        success: true,
        checked: result.checked,
        notified: result.notified,
        errors: result.errors,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logError("Cron seat-alerts failed", err);
      return NextResponse.json(
        { error: "Internal server error", details: String(err) },
        { status: 500 }
      );
    }
  });
}
