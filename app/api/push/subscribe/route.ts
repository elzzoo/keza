import { NextRequest, NextResponse } from "next/server";
import { savePushSubscriptionForEmail, type PushSubscriptionRecord } from "@/lib/push";
import { rateLimitResponse } from "@/lib/ratelimit";
import { isValidHttpsUrl } from "@/lib/validate";
import { verifyManageAlertsToken } from "@/lib/alertTokens";
import { getAlertById } from "@/lib/alerts";
import { logError } from "@/lib/logger";

// POST /api/push/subscribe — save a Web Push subscription linked to a user email
export async function POST(req: NextRequest) {
  const limited = await rateLimitResponse(req, {
    namespace: "api:push-subscribe:post",
    limit: 20,
    windowSeconds: 60 * 60,
  });
  if (limited) return limited;

  try {
    const body = await req.json();

    // Support { subscription: { endpoint, keys }, email, token, alertId }
    const subscription = body?.subscription ?? body;
    const email: unknown = body?.email;
    const token: unknown = body?.token;
    const alertId: unknown = body?.alertId;

    // Validate email
    if (typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Invalid email" },
        { status: 400 }
      );
    }

    // Authorize via EITHER a valid manage token OR a freshly created alertId
    // that belongs to this email. The latter allows the post-creation push
    // opt-in flow without requiring the user to click the email magic link.
    let authorized = false;

    if (typeof token === "string" && verifyManageAlertsToken(email, token)) {
      authorized = true;
    }

    if (!authorized && typeof alertId === "string" && alertId.length > 0) {
      const normalizedEmail = email.trim().toLowerCase();
      const alert = await getAlertById(alertId);
      if (alert && alert.email === normalizedEmail && alert.active) {
        authorized = true;
      }
    }

    if (!authorized) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Validate subscription shape
    if (
      typeof subscription?.endpoint !== "string" ||
      typeof subscription?.keys?.p256dh !== "string" ||
      typeof subscription?.keys?.auth !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid subscription object" },
        { status: 400 }
      );
    }

    if (!isValidHttpsUrl(subscription.endpoint)) {
      return NextResponse.json(
        { error: "endpoint must be a valid HTTPS URL" },
        { status: 400 }
      );
    }

    const sub: PushSubscriptionRecord = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    };

    await savePushSubscriptionForEmail(email, sub);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    logError("[api/push/subscribe] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
