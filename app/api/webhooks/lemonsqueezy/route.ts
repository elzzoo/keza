import { NextRequest, NextResponse } from "next/server";
import {
  verifyLemonWebhook,
  grantPro,
  revokePro,
  type LemonWebhookPayload,
} from "@/lib/lemonsqueezy";
import { sendDiscordAlert } from "@/lib/discord";
import { trackServerEvent } from "@/lib/analytics";

// POST /api/webhooks/lemonsqueezy — handle Lemon Squeezy subscription events
export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-signature") ?? "";
  const rawBody = await req.text();

  // Verify signature
  if (!verifyLemonWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: LemonWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LemonWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
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

  switch (eventName) {
    case "subscription_created":
    case "subscription_resumed":
      await grantPro(email, subscriptionId);
      trackServerEvent("Pro Subscription Created", {
        subscription_id: subscriptionId,
        email,
      }).catch(() => {});
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
      } else if (status === "cancelled" || status === "expired") {
        await revokePro(email);
      }
      break;

    case "subscription_cancelled":
    case "subscription_expired":
      await revokePro(email);
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
      break;

    default:
      // Unknown event — ignore silently
      break;
  }

  return NextResponse.json({ ok: true });
}
