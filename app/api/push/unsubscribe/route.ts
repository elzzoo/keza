import { NextRequest, NextResponse } from "next/server";
import { removePushSubscriptionForEmail } from "@/lib/push";
import { rateLimitResponse } from "@/lib/ratelimit";
import { verifyManageAlertsToken } from "@/lib/alertTokens";

// DELETE /api/push/unsubscribe — remove a Web Push subscription for a user email
export async function DELETE(req: NextRequest) {
  const limited = await rateLimitResponse(req, {
    namespace: "api:push-unsubscribe:delete",
    limit: 20,
    windowSeconds: 60 * 60,
  });
  if (limited) return limited;

  const { searchParams } = req.nextUrl;
  const email = searchParams.get("email");
  const token = searchParams.get("token");
  const endpoint = searchParams.get("endpoint");

  if (!email || !token || !endpoint) {
    return NextResponse.json(
      { error: "Missing required parameters: email, token, endpoint" },
      { status: 400 }
    );
  }

  if (!verifyManageAlertsToken(email, token)) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }

  await removePushSubscriptionForEmail(email, endpoint);
  return NextResponse.json({ ok: true }, { status: 200 });
}
