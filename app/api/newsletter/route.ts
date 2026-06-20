import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { rateLimitResponse } from "@/lib/ratelimit";
import { isValidEmail } from "@/lib/validate";
import { Resend } from "resend";
import { logError, logWarn } from "@/lib/logger";

const NEWSLETTER_KEY = "keza:newsletter:subscribers";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://keza-taupe.vercel.app";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "KEZA <onboarding@resend.dev>";

export async function POST(req: NextRequest) {
  const limited = await rateLimitResponse(req, {
    namespace: "api:newsletter",
    limit: 5,
    windowSeconds: 60 * 60,
  });
  if (limited) return limited;

  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const lang  = body?.lang === "en" ? "en" : "fr";

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: lang === "fr" ? "Email invalide" : "Invalid email" }, { status: 400 });
    }

    // Check if already subscribed
    const score = await redis.zscore(NEWSLETTER_KEY, email);
    if (score !== null) {
      return NextResponse.json({ ok: true, alreadySubscribed: true });
    }

    // Store in Redis sorted set (score = timestamp)
    await redis.zadd(NEWSLETTER_KEY, { score: Date.now(), member: email });

    // Send welcome email (fire-and-forget, logged on failure)
    const resend = new Resend(process.env.RESEND_API_KEY);
    const subject = lang === "fr"
      ? "✅ Les meilleures offres miles, chaque semaine"
      : "✅ Best miles deals, every week";

    resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html: lang === "fr" ? buildFrEmail() : buildEnEmail(),
    }).catch((err) => {
      logWarn("[api/newsletter] Failed to send welcome email", String(err), { email, lang });
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    logError("[api/newsletter]", err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

// GET — subscriber count (admin only)
export async function GET(req: NextRequest) {
  // Subscriber count is internal data — protect with ADMIN_SECRET.
  const { hasAdminSecret } = await import("@/lib/auth");
  if (!hasAdminSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const count = await redis.zcard(NEWSLETTER_KEY);
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

function buildFrEmail(): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0f;color:#e2e8f0;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#1e3a5f,#0a0a1a);padding:24px;text-align:center;">
        <h1 style="margin:0;font-size:24px;"><span style="color:#3b82f6;">KE</span><span style="color:#e2e8f0;">ZA</span></h1>
        <p style="margin:8px 0 0;font-size:13px;color:#64748b;">Deals miles · Chaque semaine</p>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px;font-size:15px;font-weight:600;">Bienvenue dans la newsletter KEZA ✅</p>
        <p style="margin:0 0 16px;font-size:14px;color:#94a3b8;">
          Chaque semaine, tu recevras les meilleures opportunités miles pour tes routes préférées —
          quand miles valent vraiment plus que cash.
        </p>
        <div style="background:#1a1a2e;border-radius:12px;padding:16px;margin-bottom:16px;">
          <p style="margin:0;font-size:13px;color:#64748b;">Au programme :</p>
          <ul style="margin:8px 0 0;padding-left:16px;color:#94a3b8;font-size:13px;line-height:1.8;">
            <li>Deals diaspora : DSS, LOS, ABJ, CMN ↔ Paris, Londres</li>
            <li>Sweet spots business & première classe</li>
            <li>Alertes transferts bonus (2× Amex MR, Chase UR…)</li>
            <li>Cash vs miles : les routes où ça vaut vraiment le coup</li>
          </ul>
        </div>
        <a href="${BASE_URL}" style="display:block;text-align:center;background:#1e3a5f;color:#94a3b8;text-decoration:none;padding:12px;border-radius:12px;font-size:13px;border:1px solid #2d4a6f;">
          Voir les deals en direct →
        </a>
      </div>
      <div style="padding:12px 24px;text-align:center;font-size:11px;color:#475569;border-top:1px solid #1a1a2e;">
        Tu peux te désabonner à tout moment.
      </div>
    </div>
  `;
}

function buildEnEmail(): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0f;color:#e2e8f0;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#1e3a5f,#0a0a1a);padding:24px;text-align:center;">
        <h1 style="margin:0;font-size:24px;"><span style="color:#3b82f6;">KE</span><span style="color:#e2e8f0;">ZA</span></h1>
        <p style="margin:8px 0 0;font-size:13px;color:#64748b;">Miles deals · Every week</p>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px;font-size:15px;font-weight:600;">Welcome to the KEZA newsletter ✅</p>
        <p style="margin:0 0 16px;font-size:14px;color:#94a3b8;">
          Every week, you'll receive the best miles opportunities for your favourite routes —
          when miles genuinely beat cash prices.
        </p>
        <div style="background:#1a1a2e;border-radius:12px;padding:16px;margin-bottom:16px;">
          <p style="margin:0;font-size:13px;color:#64748b;">What's included:</p>
          <ul style="margin:8px 0 0;padding-left:16px;color:#94a3b8;font-size:13px;line-height:1.8;">
            <li>Diaspora deals: DSS, LOS, ABJ, CMN ↔ Paris, London</li>
            <li>Business & first class sweet spots</li>
            <li>Transfer bonus alerts (2× Amex MR, Chase UR…)</li>
            <li>Cash vs miles: routes where miles actually win</li>
          </ul>
        </div>
        <a href="${BASE_URL}/en" style="display:block;text-align:center;background:#1e3a5f;color:#94a3b8;text-decoration:none;padding:12px;border-radius:12px;font-size:13px;border:1px solid #2d4a6f;">
          See live deals →
        </a>
      </div>
      <div style="padding:12px 24px;text-align:center;font-size:11px;color:#475569;border-top:1px solid #1a1a2e;">
        You can unsubscribe at any time.
      </div>
    </div>
  `;
}
