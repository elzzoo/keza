import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { redis } from "@/lib/redis";
import { rateLimitResponse } from "@/lib/ratelimit";
import { logError, logWarn } from "@/lib/logger";
import { sendDiscordAlert } from "@/lib/discord";
import { SITE_URL } from "@/lib/siteConfig";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "KEZA Alerts <onboarding@resend.dev>";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const ContactSchema = z.object({
  name:     z.string().min(1).max(100),
  company:  z.string().min(1).max(100),
  email:    z.string().email(),
  teamSize: z.string().min(1),
  message:  z.string().max(2000).optional(),
});

type ContactPayload = z.infer<typeof ContactSchema>;

export async function POST(request: Request) {
  const limited = await rateLimitResponse(request, {
    namespace: "api:contact:post",
    limit: 5,
    windowSeconds: 60 * 60,
  });
  if (limited) return limited;

  try {
    const raw = await request.json();
    const result = ContactSchema.safeParse(raw);

    if (!result.success) {
      const first = result.error.issues[0];
      const message = first
        ? `${first.path.join(".")}: ${first.message}`
        : "Invalid input";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const body: ContactPayload = result.data;

    const entry = { ...body, receivedAt: new Date().toISOString() };

    // Store in Redis list — keep last 500 leads
    const key = "keza:b2b:leads";
    await redis.lpush(key, JSON.stringify(entry));
    await redis.ltrim(key, 0, 499);

    // Fire-and-forget: confirmation email to the user (logged on failure)
    resend.emails.send({
      from: FROM,
      to: [body.email],
      subject: "✅ KEZA — on a bien reçu votre demande",
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0f;color:#e2e8f0;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1e3a5f,#0a0a1a);padding:24px;text-align:center;">
            <h1 style="margin:0;font-size:24px;"><span style="color:#3b82f6;">KE</span><span style="color:#e2e8f0;">ZA</span></h1>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">KEZA Entreprises</p>
          </div>
          <div style="padding:24px;">
            <p style="margin:0 0 16px;font-size:15px;color:#e2e8f0;line-height:1.7;">
              Bonjour ${esc(body.name)}, merci pour votre intérêt pour KEZA Entreprises. Notre équipe vous répondra sous 24h. En attendant, n'hésitez pas à explorer keza.app.
            </p>
            <a href="${SITE_URL}"
               style="display:block;text-align:center;background:#3b82f6;color:white;text-decoration:none;padding:14px;border-radius:12px;font-weight:600;font-size:14px;">
              Explorer KEZA →
            </a>
          </div>
          <div style="padding:16px 24px;border-top:1px solid #1e293b;text-align:center;">
            <p style="margin:0;font-size:10px;color:#334155;">KEZA · Cash ou Miles ?</p>
          </div>
        </div>
      `,
    }).catch((err) => {
      logWarn("[api/contact] Failed to send confirmation email", String(err), { email: body.email });
    });

    // Fire-and-forget: Discord notification to the team
    sendDiscordAlert("🏢 Nouveau lead B2B", [{
      title: `${esc(body.name)} — ${esc(body.company)}`,
      color: 0x3b82f6,
      fields: [
        { name: "Email", value: body.email, inline: true },
        { name: "Équipe", value: body.teamSize, inline: true },
        { name: "Message", value: body.message || "—", inline: false },
      ],
    }]).catch(() => {});

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    logError("[api/contact] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
