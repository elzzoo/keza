import { NextRequest, NextResponse } from "next/server";
import {
  getAllActiveRoutes,
  getAlertsByRoute,
  updateAlertAfterCheck,
  sendPriceDropEmail,
} from "@/lib/alerts";
import { sendPushToAll } from "@/lib/push";
import { fetchCalendarPrices } from "@/lib/engine";
import { hasCronSecret } from "@/lib/auth";

// GET /api/cron/alerts — check prices and send drop notifications
export async function GET(req: NextRequest) {
  if (!hasCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const routes = await getAllActiveRoutes();
  let checked = 0;
  let notified = 0;
  const errors: string[] = [];

  for (const routeKey of routes) {
    const [from, to] = routeKey.split(":");
    if (!from || !to) continue;

    try {
      // Get current cheapest price for this route (next 2 months)
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

      if (allPrices.length === 0) continue;

      const cheapest = Math.min(...allPrices);

      // Check all alerts for this route
      const alerts = await getAlertsByRoute(from, to);

      for (const alert of alerts) {
        checked++;

        // Apply cabin multiplier
        const cabinMultiplier =
          alert.cabin === "first" ? 6.5 :
          alert.cabin === "business" ? 4.0 :
          alert.cabin === "premium" ? 1.8 : 1.0;

        const adjustedPrice = Math.round(cheapest * cabinMultiplier);

        // Check if price dropped below target
        if (adjustedPrice < alert.targetPrice) {
          // Rate limit: max 1 email per alert per 24h
          if (alert.lastCheckedAt) {
            const lastCheck = new Date(alert.lastCheckedAt).getTime();
            const hoursSince = (Date.now() - lastCheck) / (1000 * 60 * 60);
            if (hoursSince < 24) {
              await updateAlertAfterCheck(alert.id, adjustedPrice, false);
              continue;
            }
          }

          // Max 5 notifications per alert lifetime
          if (alert.notifCount >= 5) {
            await updateAlertAfterCheck(alert.id, adjustedPrice, false);
            continue;
          }

          const sent = await sendPriceDropEmail(alert, adjustedPrice);
          await updateAlertAfterCheck(alert.id, adjustedPrice, sent);
          if (sent) notified++;
        } else {
          await updateAlertAfterCheck(alert.id, adjustedPrice, false);
        }
      }
    } catch (err) {
      errors.push(`${routeKey}: ${(err as Error).message}`);
    }
  }

  // Fire-and-forget push notification if any email was sent this run
  if (notified > 0) {
    sendPushToAll({
      title: "KEZA — Baisse de prix ✈",
      body: `${notified} baisse${notified > 1 ? "s" : ""} de prix détectée${notified > 1 ? "s" : ""}`,
      url: "/alertes",
    }).catch((err: unknown) => console.error("[cron/alerts] push failed:", err));
  }

  return NextResponse.json({
    ok: true,
    routes: routes.length,
    checked,
    notified,
    errors: errors.length > 0 ? errors : undefined,
    ts: new Date().toISOString(),
  });
}
