import { NextRequest, NextResponse } from "next/server";
import {
  getAllActiveRoutes,
  getAlertsByRoute,
  updateAlertAfterCheck,
  sendPriceDropEmail,
  sendMilesAlertEmail,
  sendAlertPreDeactivationEmail,
  deactivateAlert,
} from "@/lib/alerts";
import { sendPushToEmail } from "@/lib/push";
import { createManageAlertsToken } from "@/lib/alertTokens";
import { fetchCalendarPrices, CABIN_MULTIPLIER } from "@/lib/engine";
import { buildCostOptions } from "@/lib/costEngine";
import { getEffectivePrices } from "@/lib/costEngine";
import { logError } from "@/lib/logger";
import { hasCronSecret } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analytics";
import { notifyAlertTriggered, notifyCronSummary } from "@/lib/discord";
import { recordDailyPrice } from "@/lib/priceHistoryRedis";
import * as Sentry from "@sentry/nextjs";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://keza-taupe.vercel.app";

// GET /api/cron/alerts — check prices and send drop notifications
export async function GET(req: NextRequest) {
  if (!hasCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Sentry.withMonitor("cron-alerts", async () => {
  const routes = await getAllActiveRoutes();
  let checked = 0;
  let notified = 0;
  const errors: string[] = [];
  // Load effective miles prices once — shared across all routes in this cron run
  const effectivePrices = await getEffectivePrices().catch(() => new Map<string, number>());

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

      // Record daily price for history (fire-and-forget)
      recordDailyPrice(from, to, cheapest).catch(() => {});

      // Check all alerts for this route
      const alerts = await getAlertsByRoute(from, to);

      for (const alert of alerts) {
        checked++;

        // Apply cabin multiplier — single source of truth in lib/engine.ts
        const cabinMultiplier = CABIN_MULTIPLIER[alert.cabin as keyof typeof CABIN_MULTIPLIER] ?? 1.0;

        const adjustedPrice = Math.round(cheapest * cabinMultiplier);

        // Check if price dropped below target
        if (adjustedPrice <= alert.targetPrice) {
          // Skip daily/weekly alerts — they are handled by /api/cron/digest
          if (alert.notifFrequency !== "instant") {
            await updateAlertAfterCheck(alert.id, adjustedPrice, false);
            continue;
          }

          // Rate limit: max 1 email per alert per 24h (cron runs daily)
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
          if (sent) {
            notified++;
            // Auto-deactivate when the notification cap is reached so the
            // alert stops showing as active on /alertes. notifCount was just
            // incremented inside updateAlertAfterCheck, so check against the
            // post-increment value (alert.notifCount is the pre-increment).
            // Warn user when this is their 4th (second-to-last) notification.
            if (alert.notifCount + 1 === 4) {
              sendAlertPreDeactivationEmail(alert).catch((err: unknown) =>
                logError("[cron/alerts] pre-deactivation email failed:", err)
              );
            }
            // Auto-deactivate at 5th notification.
            if (alert.notifCount + 1 >= 5) {
              deactivateAlert(alert.id).catch((err: unknown) =>
                logError("[cron/alerts] deactivate on cap failed:", err)
              );
            }
            // Track alert triggered (server-side analytics)
            trackServerEvent("Alert Triggered", {
              from: alert.from,
              to: alert.to,
              route: `${alert.from}-${alert.to}`,
              cabin: alert.cabin,
              price_usd: adjustedPrice,
            }).catch(() => {});
            // Discord ops notification
            notifyAlertTriggered({
              from: alert.from,
              to: alert.to,
              cabin: alert.cabin,
              adjustedPrice,
              targetPrice: alert.targetPrice,
              email: alert.email,
            }).catch(() => {});
            // Fire targeted push for this specific alert
            const manageToken = createManageAlertsToken(alert.email);
            sendPushToEmail(alert.email, {
              title: `✈ Prix atteint — ${alert.from} → ${alert.to}`,
              body: `$${adjustedPrice} — votre cible de $${alert.targetPrice} est atteinte !`,
              url: `${BASE_URL}/alertes?email=${encodeURIComponent(alert.email)}&token=${encodeURIComponent(manageToken ?? "")}`,
            }).catch((err: unknown) => logError("[cron/alerts] push failed:", err));
          }
        } else {
          await updateAlertAfterCheck(alert.id, adjustedPrice, false);
        }

        // ── Miles CPP check (independent of cash price trigger) ──────────────
        // If this alert has a milesAlert config, also check whether the CPP for
        // the target program is ≥ targetCpp. Uses the same cheapest calendar price
        // as the cash check — no extra API calls required.
        if (alert.milesAlert && alert.notifFrequency === "instant") {
          try {
            const milesOptions = buildCostOptions(
              {
                from,
                to,
                totalPrice: adjustedPrice,
                airlines: [],  // no airline filter — check all programs
                stops: 0,
                cabin: alert.cabin,
                tripType: "oneway",
                passengers: 1,
              },
              effectivePrices,
            );
            const option = milesOptions.milesOptions.find(
              (o) => o.program === alert.milesAlert!.program
            );
            if (option && option.valuePerMile >= alert.milesAlert.targetCpp) {
              // Same rate-limit as cash alerts: max 1 email per 24h
              const hoursSinceMilesCheck = alert.lastCheckedAt
                ? (Date.now() - new Date(alert.lastCheckedAt).getTime()) / 3_600_000
                : 25;
              if (hoursSinceMilesCheck >= 24 && alert.notifCount < 5) {
                const sent = await sendMilesAlertEmail(alert, option.valuePerMile, adjustedPrice);
                if (sent) {
                  notified++;
                  await updateAlertAfterCheck(alert.id, adjustedPrice, true);
                }
              }
            }
          } catch (milesErr) {
            logError(`[cron/alerts] miles CPP check failed for ${routeKey}:`, milesErr);
          }
        }
      }
    } catch (err) {
      errors.push(`${routeKey}: ${(err as Error).message}`);
    }
  }

  // Discord summary (fire-and-forget)
  notifyCronSummary({ routes: routes.length, checked, notified, errors }).catch(() => {});

  return NextResponse.json({
    ok: true,
    routes: routes.length,
    checked,
    notified,
    errors: errors.length > 0 ? errors : undefined,
    ts: new Date().toISOString(),
  });
  }, { schedule: { type: "crontab", value: "0 8 * * *" } });
}
