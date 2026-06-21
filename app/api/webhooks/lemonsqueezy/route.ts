import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import {
  verifyLemonWebhook,
  grantPro,
  revokePro,
  logSubscriptionEvent,
  lemonWebhookPayloadSchema,
  type LemonWebhookPayload,
} from "@/lib/lemonsqueezy";
import { rateLimitResponse } from "@/lib/ratelimit";
import { sendDiscordAlert } from "@/lib/discord";
import { trackServerEvent } from "@/lib/analytics";
import { trackTrialConversion } from "@/lib/conversionTracking";

// POST /api/webhooks/lemonsqueezy — handle Lemon Squeezy subscription events
export async function POST(req: NextRequest) {
  return Sentry.withMonitor("lemonsqueezy-webhook", async () => {
    const limited = await rateLimitResponse(req, {
      namespace: "api:webhooks:lemonsqueezy",
      limit: 5,
      windowSeconds: 300,
    });
    if (limited) return limited;

    const signature = req.headers.get("x-signature") ?? "";
    const rawBody = await req.text();

    // Verify signature
    if (!verifyLemonWebhook(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let payload: LemonWebhookPayload;
    try {
      const parsed = JSON.parse(rawBody);
      payload = lemonWebhookPayloadSchema.parse(parsed);
    } catch (err) {
      Sentry.captureException(err, {
        tags: { route: "lemonsqueezy-webhook", stage: "payload-parse" },
      });
      return NextResponse.json({ error: "Invalid payload structure" }, { status: 400 });
    }

    const eventName = payload.meta.event_name;
    const subscriptionId = payload.data.id;
    const status = payload.data.attributes.status;

    // Resolve email: prefer custom_data (set at checkout), fallback to user_email
    const email =
      payload.meta.custom_data?.keza_email ??
      payload.data.attributes.user_email;

    if (!email) {
      return NextResponse.json({ error: "No email in payload" }, { status: 400 });
    }

    try {
      switch (eventName) {
        case "subscription_created":
        case "subscription_resumed":
          await grantPro(email, subscriptionId);
          logSubscriptionEvent("created", email, { subscriptionId });
          trackServerEvent("Pro Subscription Created", {
            subscription_id: subscriptionId,
            email,
          }).catch(() => {});

          // Track trial-to-paying conversion
          try {
            const source = (
              payload.meta.custom_data as Record<string, string> | undefined
            )?.keza_source || "other";
            await trackTrialConversion(email, "PRO", source);
          } catch (err) {
            // Don't let conversion tracking errors block subscription grant
            Sentry.captureException(err, {
              tags: { stage: "trial-conversion-tracking" },
              extra: { email },
            });
          }

          sendDiscordAlert("", [
            {
              title: "💎 Nouveau Pro — " + email,
              description: `Subscription \`${subscriptionId}\` activée.`,
              color: 0xf59e0b,
              footer: { text: "Lemon Squeezy webhook" },
              timestamp: new Date().toISOString(),
            },
          ]).catch(() => {});
          break;

        case "subscription_updated":
          // Active stays Pro, cancelled/expired lose Pro
          if (status === "active") {
            await grantPro(email, subscriptionId);
            logSubscriptionEvent("updated", email, { subscriptionId, status });
          } else if (status === "cancelled" || status === "expired") {
            await revokePro(email);
            logSubscriptionEvent("updated", email, { subscriptionId, status });
          }
          break;

        case "subscription_cancelled":
        case "subscription_expired":
          await revokePro(email);
          logSubscriptionEvent("cancelled", email, { subscriptionId, eventName });
          trackServerEvent("Pro Subscription Cancelled", {
            subscription_id: subscriptionId,
            email,
          }).catch(() => {});
          sendDiscordAlert("", [
            {
              title: "❌ Pro annulé — " + email,
              description: `Subscription \`${subscriptionId}\` annulée (${eventName}).`,
              color: 0xef4444,
              footer: { text: "Lemon Squeezy webhook" },
              timestamp: new Date().toISOString(),
            },
          ]).catch(() => {});
          break;

        case "subscription_paused":
          await revokePro(email);
          logSubscriptionEvent("cancelled", email, { subscriptionId, eventName });
          break;

        default:
          // Unknown event — ignore silently
          break;
      }
    } catch (err) {
      Sentry.captureException(err, {
        tags: { route: "lemonsqueezy-webhook", eventName },
        extra: { subscriptionId, email },
      });
      throw err;
    }

    return NextResponse.json({ ok: true });
  });
}
