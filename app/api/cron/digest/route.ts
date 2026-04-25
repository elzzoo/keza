import { NextRequest, NextResponse } from "next/server";
import {
  getAllActiveRoutes,
  getAlertsByRoute,
  updateAlertAfterCheck,
  sendDigestEmail,
  type PriceAlert,
} from "@/lib/alerts";
import { fetchCalendarPrices } from "@/lib/engine";
import { hasCronSecret } from "@/lib/auth";
import { notifyCronSummary } from "@/lib/discord";
import { logError } from "@/lib/logger";
import { trackServerEvent } from "@/lib/analytics";

// GET /api/cron/digest — send daily/weekly digest emails
// Called by Vercel Cron daily (separate schedule from /api/cron/alerts)
export async function GET(req: NextRequest) {
  if (!hasCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  // Only send weekly digests on Mondays (dayOfWeek === 1)
  const isMonday = dayOfWeek === 1;

  try {
    const routes = await getAllActiveRoutes();

    // 1. Fetch prices for all routes
    const routePrices = new Map<string, number>();
    for (const routeKey of routes) {
      const [from, to] = (routeKey as string).split(":");
      if (!from || !to) continue;
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

        if (allPrices.length === 0) continue;
        routePrices.set(routeKey as string, Math.min(...allPrices));
      } catch {
        // skip routes that fail
      }
    }

    // 2. Group "daily" and (on Mondays) "weekly" alerts by email
    const byEmail = new Map<string, Array<{ alert: PriceAlert; currentPrice: number }>>();

    for (const routeKey of routes) {
      const [from, to] = (routeKey as string).split(":");
      if (!from || !to) continue;
      const cheapest = routePrices.get(routeKey as string);
      if (cheapest === undefined) continue;

      const alerts = await getAlertsByRoute(from, to);
      for (const alert of alerts) {
        if (!alert.active) continue;

        const freq = alert.notifFrequency ?? "instant";
        // Include daily alerts always; weekly alerts only on Mondays
        if (freq === "instant") continue;
        if (freq === "weekly" && !isMonday) continue;

        // 4. Apply cabin multiplier
        const cabinMultiplier =
          alert.cabin === "first" ? 6.5 :
          alert.cabin === "business" ? 4.0 :
          alert.cabin === "premium" ? 1.8 : 1.0;
        const adjustedPrice = Math.round(cheapest * cabinMultiplier);

        const existing = byEmail.get(alert.email) ?? [];
        existing.push({ alert, currentPrice: adjustedPrice });
        byEmail.set(alert.email, existing);
      }
    }

    // 5. Send one digest email per email
    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [email, items] of Array.from(byEmail)) {
      try {
        const ok = await sendDigestEmail(email, items);
        if (ok) {
          sent++;
          // 6. Update lastCheckedAt for each alert
          for (const { alert, currentPrice } of items) {
            await updateAlertAfterCheck(alert.id, currentPrice, true);
          }
          trackServerEvent("Digest Sent", { email_count: 1 }).catch(() => {});
        } else {
          skipped++;
        }
      } catch (err) {
        errors.push(`${email}: ${(err as Error).message}`);
      }
    }

    // 7. Discord summary (fire-and-forget)
    notifyCronSummary({ routes: routes.length, checked: byEmail.size, notified: sent, errors }).catch(() => {});

    return NextResponse.json({
      ok: true,
      routes: routes.length,
      totalEmails: byEmail.size,
      sent,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      ts: new Date().toISOString(),
    });
  } catch (err) {
    logError("[cron/digest] fatal", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
