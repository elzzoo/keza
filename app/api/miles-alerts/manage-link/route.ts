import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createManageAlertsToken } from "@/lib/alertTokens";
import { getMilesAlertsByEmail } from "@/lib/miles-alerts";
import { rateLimitResponse } from "@/lib/ratelimit";
import { SITE_URL } from "@/lib/siteConfig";
import { isValidEmail } from "@/lib/validate";
import { logError } from "@/lib/logger";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Xalifly Alerts <onboarding@resend.dev>";

function withUtm(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set("utm_source", "keza");
  parsed.searchParams.set("utm_medium", "email");
  parsed.searchParams.set("utm_campaign", "miles-alerts-manage");
  return parsed.toString();
}

async function sendManageMilesAlertsEmail(email: string, alertCount: number): Promise<boolean> {
  const token = createManageAlertsToken(email);
  if (!token) return false;

  const manageUrl = withUtm(
    `${SITE_URL}/miles-alerts?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`
  );

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Gerer tes alertes miles | Xalifly",
      text: [
        "Xalifly - Acceder a tes alertes miles",
        "",
        `Tu as ${alertCount} alerte${alertCount > 1 ? "s" : ""} miles active${alertCount > 1 ? "s" : ""}.`,
        "",
        "Gerer mes alertes miles (lien valable 7 jours) :",
        manageUrl,
      ].join("\n"),
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0f;color:#e2e8f0;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1e3a5f,#0a0a1a);padding:24px;text-align:center;">
            <h1 style="margin:0;font-size:24px;"><span style="color:#3b82f6;">Xali</span><span style="color:#e2e8f0;">fly</span></h1>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Gestion des alertes miles</p>
          </div>
          <div style="padding:24px;">
            <p style="margin:0 0 16px;font-size:15px;color:#e2e8f0;font-weight:600;">
              Accede a tes ${alertCount} alerte${alertCount > 1 ? "s" : ""} miles active${alertCount > 1 ? "s" : ""}
            </p>
            <a href="${manageUrl}"
               style="display:block;text-align:center;background:#3b82f6;color:white;text-decoration:none;padding:14px;border-radius:12px;font-weight:600;font-size:14px;">
              Gerer mes alertes miles
            </a>
            <p style="margin:16px 0 0;font-size:11px;color:#64748b;text-align:center;">
              Ce lien expire dans 7 jours.
            </p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (err) {
    logError("[api/miles-alerts/manage-link] email failed:", err);
    return false;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const limited = await rateLimitResponse(req, {
    namespace: "api:miles-alerts-manage-link:post",
    limit: 5,
    windowSeconds: 60 * 60,
  });
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const alerts = await getMilesAlertsByEmail(email);
    if (alerts.length > 0) {
      await sendManageMilesAlertsEmail(email, alerts.length);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("[api/miles-alerts/manage-link] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
