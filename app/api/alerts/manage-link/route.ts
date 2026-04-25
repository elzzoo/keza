import { NextRequest, NextResponse } from "next/server";
import { getAlertsByEmail, sendManageAlertsEmail } from "@/lib/alerts";
import { rateLimitResponse } from "@/lib/ratelimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const limited = await rateLimitResponse(req, {
    namespace: "api:alerts-manage-link:post",
    limit: 5,
    windowSeconds: 60 * 60,
  });
  if (limited) return limited;

  try {
    const body = (await req.json()) as { email?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const alerts = await getAlertsByEmail(email);
    if (alerts.length > 0) {
      await sendManageAlertsEmail(email, alerts);
    }

    // Generic response to avoid leaking whether an email has alerts.
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/alerts/manage-link] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
