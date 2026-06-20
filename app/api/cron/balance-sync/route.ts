import { NextRequest, NextResponse } from "next/server";
import { hasCronSecret } from "@/lib/auth";
import { getAllUserPortfolios, getUserCredentials } from "@/lib/portfolio";
import { syncUserBalances } from "@/lib/balanceSync";
import { logError } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

export async function GET(req: NextRequest) {
  if (!hasCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Sentry.withMonitor("cron-balance-sync", async () => {
    try {
      const users = await getAllUserPortfolios();
      let synced = 0;
      let failed = 0;

      for (const email of users) {
        try {
          const credentials = await getUserCredentials(email);
          if (Object.keys(credentials).length === 0) continue;

          await syncUserBalances(email, credentials);
          synced++;
        } catch (err) {
          logError(`Failed to sync ${email}`, err);
          failed++;
        }
      }

      return NextResponse.json({
        success: true,
        synced,
        failed,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logError("Cron balance-sync failed", err);
      return NextResponse.json(
        { error: "Internal server error", details: String(err) },
        { status: 500 }
      );
    }
  });
}
