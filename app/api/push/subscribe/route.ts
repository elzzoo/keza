import { NextRequest, NextResponse } from "next/server";
import { savePushSubscription, type PushSubscriptionRecord } from "@/lib/push";
import { redis } from "@/lib/redis";
import { rateLimitResponse } from "@/lib/ratelimit";

const PUSH_SUBS_KEY = "keza:push:subscriptions";
const MAX_SUBSCRIPTIONS = 10_000;

// POST /api/push/subscribe — save a Web Push subscription from the browser
export async function POST(req: NextRequest) {
  const limited = await rateLimitResponse(req, {
    namespace: "api:push-subscribe:post",
    limit: 20,
    windowSeconds: 60 * 60,
  });
  if (limited) return limited;

  try {
    const body = await req.json();

    if (
      typeof body?.endpoint !== "string" ||
      typeof body?.keys?.p256dh !== "string" ||
      typeof body?.keys?.auth !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid subscription object" },
        { status: 400 }
      );
    }

    // Guard against Redis set pollution
    const count = await redis.scard(PUSH_SUBS_KEY);
    if (count >= MAX_SUBSCRIPTIONS) {
      return NextResponse.json(
        { error: "Subscription limit reached" },
        { status: 503 }
      );
    }

    const sub: PushSubscriptionRecord = {
      endpoint: body.endpoint,
      keys: {
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
      },
    };

    await savePushSubscription(sub);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[api/push/subscribe] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
