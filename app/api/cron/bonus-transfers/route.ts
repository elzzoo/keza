import { NextResponse } from "next/server";
import { TRANSFER_BONUSES } from "@/data/transferBonuses";
import { syncBonusTransfersToRedis } from "@/lib/bonusTransfersRedis";
import { hasCronSecret } from "@/lib/auth";
import { rateLimitResponse } from "@/lib/ratelimit";
import * as Sentry from "@sentry/nextjs";
import { logError } from "@/lib/logger";

/**
 * Cron: Sync bonus transfers to Redis daily.
 * Allows curators to update transfer bonuses without code deployment.
 *
 * Future: Replace hardcoded TRANSFER_BONUSES with CMS/database query.
 */
export async function GET(request: Request) {
  const limited = await rateLimitResponse(request, {
    namespace: "api:cron:bonus-transfers",
    limit: 5,
    windowSeconds: 300,
  });
  if (limited) return limited;

  // CRON_SECRET is mandatory — timing-safe comparison to prevent timing attacks
  if (!hasCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Sentry.withMonitor("cron-bonus-transfers", async () => {
    try {
      // Validate transfer bonuses structure
      if (!Array.isArray(TRANSFER_BONUSES)) {
        throw new Error("TRANSFER_BONUSES must be an array");
      }

      // Filter out transfers with invalid structure
      const validTransfers = TRANSFER_BONUSES.filter((t) => {
        if (!t.from || !t.to || typeof t.baseRatio !== "number" || !t.transferTime) {
          logError("[cron/bonus-transfers] Invalid transfer structure:", t);
          return false;
        }
        if (t.promoValidUntil && !/^\d{4}-\d{2}-\d{2}$/.test(t.promoValidUntil)) {
          logError("[cron/bonus-transfers] Invalid promoValidUntil date format:", t);
          return false;
        }
        return true;
      });

      // Sync to Redis
      await syncBonusTransfersToRedis(validTransfers);

      return NextResponse.json({
        ok: true,
        count: validTransfers.length,
        filtered: TRANSFER_BONUSES.length - validTransfers.length,
      });
    } catch (err) {
      logError("[cron/bonus-transfers] error:", err);
      return NextResponse.json(
        { error: "Failed to sync bonus transfers" },
        { status: 500 }
      );
    }
  }, { schedule: { type: "crontab", value: "0 2 * * *" } }); // Daily at 2 AM UTC
}
