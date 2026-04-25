import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { rateLimitResponse } from "@/lib/ratelimit";
import { isValidEmail } from "@/lib/validate";
import { Resend } from "resend";
import { logError } from "@/lib/logger";

const WAITLIST_KEY = "keza:pro:waitlist";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://keza-taupe.vercel.app";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "KEZA <onboarding@resend.dev>";

export async function POST(req: NextRequest) {
  const limited = await rateLimitResponse(req, {
    namespace: "api:pro:waitlist",
    limit: 5,
    windowSeconds: 60 * 60,
  });
  if (limited) return limited;

  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    // Store in Redis sorted set (score = timestamp for ordering)
    const score = Date.now();
    await redis.zadd(WAITLIST_KEY, { score, member: email });

    // Send confirmation email (fire-and-forget)
    const resend = new Resend(process.env.RESEND_API_KEY);
    resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "✅ Tu es sur la liste d'attente KEZA Pro",
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0f;color:#e2e8f0;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1e3a5f,#0a0a1a);padding:24px;text-align:center;">
            <h1 style="margin:0;font-size:24px;"><span style="color:#3b82f6;">KE</span><span style="color:#e2e8f0;">ZA</span> <span style="color:#f59e0b;font-size:18px;">Pro</span></h1>
          </div>
          <div style="padding:24px;">
            <p style="margin:0 0 16px;font-size:15px;font-weight:600;">Tu es sur la liste ✅</p>
            <p style="margin:0 0 16px;font-size:14px;color:#94a3b8;">
              On te contactera en priorité dès que KEZA Pro est disponible.<br/>
              Tu auras accès à des alertes illimitées, des notifications multi-devices et l'historique complet des prix.
            </p>
            <div style="background:#1a1a2e;border-radius:12px;padding:16px;margin-bottom:16px;">
              <p style="margin:0;font-size:13px;color:#64748b;">Ce qui t'attend avec KEZA Pro :</p>
              <ul style="margin:8px 0 0;padding-left:16px;color:#94a3b8;font-size:13px;line-height:1.8;">
                <li>Alertes illimitées (vs 3 en gratuit)</li>
                <li>Notifications push sur tous tes appareils</li>
                <li>Historique des prix sur 6 mois</li>
                <li>Alertes multi-passagers</li>
              </ul>
            </div>
            <a href="${BASE_URL}" style="display:block;text-align:center;background:#1e3a5f;color:#94a3b8;text-decoration:none;padding:12px;border-radius:12px;font-size:13px;border:1px solid #2d4a6f;">
              Retourner sur KEZA →
            </a>
          </div>
        </div>
      `,
    }).catch(() => {});

    const position = await redis.zrank(WAITLIST_KEY, email);

    return NextResponse.json({
      ok: true,
      position: position !== null ? position + 1 : null,
    }, { status: 201 });
  } catch (err) {
    logError("[api/pro/waitlist]", err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

// GET — count waitlist size (for admin)
export async function GET(_req: NextRequest) {
  try {
    const count = await redis.zcard(WAITLIST_KEY);
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
