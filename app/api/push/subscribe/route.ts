import { NextRequest, NextResponse } from "next/server";
import { savePushSubscription, type PushSubscriptionRecord } from "@/lib/push";

// POST /api/push/subscribe — save a Web Push subscription from the browser
export async function POST(req: NextRequest) {
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
