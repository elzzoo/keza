import { NextRequest, NextResponse } from "next/server";
import {
  getAllActiveRoutes,
  getAlertsByRoute,
  sendOnboardingJ3Email,
  sendOnboardingJ7Email,
} from "@/lib/alerts";
import { fetchCalendarPrices } from "@/lib/engine";
import { hasCronSecret } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { logError } from "@/lib/logger";

// GET /api/cron/onboarding — send J3 and J7 onboarding emails
// Called by Vercel Cron daily at 11am UTC (after digest at 10am)
export async function GET(req: NextRequest) {
  if (!hasCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const THIRTY_DAYS = 30 * 86400;

  let j3Sent = 0;
  let j7Sent = 0;
  const errors: string[] = [];

  try {
    const routes = await getAllActiveRoutes();

    for (const routeKey of routes) {
      const [from, to] = (routeKey as string).split(":");
      if (!from || !to) continue;

      const alerts = await getAlertsByRoute(from, to);

      for (const alert of alerts) {
        if (!alert.active) continue;

        const ageHours =
          (Date.now() - new Date(alert.createdAt).getTime()) / 3600000;

        const isJ3Window = ageHours >= 60 && ageHours < 84;
        const isJ7Window = ageHours >= 156 && ageHours < 180;

        if (!isJ3Window && !isJ7Window) continue;

        try {
          if (isJ3Window) {
            const j3Key = `keza:onboarding:${alert.id}:j3`;
            const alreadySent = await redis.exists(j3Key);
            if (alreadySent) continue;

            // Fetch current price for J3 email
            let currentPrice: number | null = null;
            try {
              const now = new Date();
              const month1 = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
              const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
              const month2 = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;

              const [prices1, prices2] = await Promise.all([
                fetchCalendarPrices(from, to, month1).catch(() => []),
                fetchCalendarPrices(from, to, month2).catch(() => []),
              ]);

              const allPrices = [
                ...prices1.map((day) => day.price),
                ...prices2.map((day) => day.price),
              ].filter((p) => typeof p === "number" && p > 0);

              if (allPrices.length > 0) {
                currentPrice = Math.min(...allPrices);
              }
            } catch {
              // proceed with null price
            }

            const ok = await sendOnboardingJ3Email(alert, currentPrice);
            if (ok) {
              await redis.set(j3Key, "1", { ex: THIRTY_DAYS });
              j3Sent++;
            }
          }

          if (isJ7Window) {
            const j7Key = `keza:onboarding:${alert.id}:j7`;
            const alreadySent = await redis.exists(j7Key);
            if (alreadySent) continue;

            const ok = await sendOnboardingJ7Email(alert);
            if (ok) {
              await redis.set(j7Key, "1", { ex: THIRTY_DAYS });
              j7Sent++;
            }
          }
        } catch (err) {
          errors.push(`${alert.id}: ${(err as Error).message}`);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      j3Sent,
      j7Sent,
      errors: errors.length > 0 ? errors : undefined,
      ts: new Date().toISOString(),
    });
  } catch (err) {
    logError("[cron/onboarding] fatal", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
