import { NextRequest, NextResponse } from "next/server";
import { getAllActiveRoutes, getAlertsByRoute, type PriceAlert } from "@/lib/alerts";
import { redis } from "@/lib/redis";
import { Resend } from "resend";

// ─── Constants ───────────────────────────────────────────────────────────────

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "KEZA Alerts <onboarding@resend.dev>";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://keza-taupe.vercel.app";

function withUtm(url: string, source: string, campaign: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}utm_source=${source}&utm_medium=email&utm_campaign=${campaign}`;
}

const CABIN_LABELS: Record<PriceAlert["cabin"], string> = {
  economy: "Économique",
  premium: "Premium Éco",
  business: "Business",
  first: "Première",
};

const DIGEST_LAST_KEY = (email: string) => `keza:digest:last:${email.toLowerCase()}`;
const DIGEST_COOLDOWN_SEC = 6 * 24 * 60 * 60; // 6 days

// ─── Auth ────────────────────────────────────────────────────────────────────

function isVercelCron(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function progressPct(alert: PriceAlert): number {
  const current = alert.lastPrice ?? alert.basePrice;
  const range = alert.basePrice - alert.targetPrice;
  if (range <= 0) return 100;
  const drop = alert.basePrice - current;
  return Math.min(100, Math.max(0, Math.round((drop / range) * 100)));
}

function bookingUrl(from: string, to: string): string {
  const marker = "714947";
  return `https://www.aviasales.com/search/${from}1${to}1?marker=${marker}`;
}

// ─── Email template ──────────────────────────────────────────────────────────

function buildDigestHtml(email: string, alerts: PriceAlert[]): string {
  const manageUrl = withUtm(`${BASE_URL}/alertes`, "keza", "weekly-digest");

  const alertRows = alerts
    .map((alert) => {
      const current = alert.lastPrice ?? alert.basePrice;
      const pct = progressPct(alert);
      const barColor = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#3b82f6";
      const isTriggered = current <= alert.targetPrice;

      return `
        <div style="background:#1a1a2e;border-radius:12px;padding:16px;margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
            <div>
              <p style="margin:0;font-size:14px;font-weight:700;color:#e2e8f0;">
                ${alert.from} → ${alert.to}
              </p>
              <p style="margin:2px 0 0;font-size:11px;color:#64748b;">
                ${CABIN_LABELS[alert.cabin]}
              </p>
            </div>
            <div style="text-align:right;">
              <p style="margin:0;font-size:18px;font-weight:900;color:${isTriggered ? "#10b981" : "#e2e8f0"};">
                $${current}
              </p>
              <p style="margin:0;font-size:10px;color:#64748b;">
                cible : $${alert.targetPrice}
              </p>
            </div>
          </div>

          <div style="background:#0f172a;border-radius:99px;height:6px;margin-bottom:8px;overflow:hidden;">
            <div style="background:${barColor};height:6px;width:${pct}%;border-radius:99px;"></div>
          </div>
          <p style="margin:0 0 10px;font-size:11px;color:#64748b;">
            ${isTriggered
              ? "🎉 Prix sous le seuil — alerte déjà envoyée !"
              : `${pct}% vers l'objectif · ref. $${alert.basePrice}`}
          </p>

          <a href="${withUtm(bookingUrl(alert.from, alert.to), "keza", "weekly-digest")}"
             style="display:inline-block;background:#1e3a5f;color:#94a3b8;text-decoration:none;padding:8px 14px;border-radius:8px;font-size:12px;border:1px solid #2d4a6f;">
            Rechercher ce vol →
          </a>
        </div>
      `;
    })
    .join("");

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;background:#0a0a0f;color:#e2e8f0;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#1e3a5f,#0a0a1a);padding:24px;text-align:center;">
        <h1 style="margin:0;font-size:24px;"><span style="color:#3b82f6;">KE</span><span style="color:#e2e8f0;">ZA</span></h1>
        <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Récap hebdomadaire</p>
      </div>

      <div style="padding:24px;">
        <p style="margin:0 0 20px;font-size:15px;color:#e2e8f0;font-weight:600;">
          Tes alertes cette semaine ✈
        </p>

        ${alertRows}

        <a href="${manageUrl}"
           style="display:block;text-align:center;background:#1e3a5f;color:#94a3b8;text-decoration:none;padding:12px;border-radius:12px;font-size:13px;border:1px solid #2d4a6f;margin-top:8px;">
          Gérer toutes mes alertes →
        </a>
      </div>

      <div style="padding:16px 24px;border-top:1px solid #1e293b;text-align:center;">
        <p style="margin:0;font-size:10px;color:#334155;">
          Tu reçois cet email car tu as des alertes actives sur KEZA.
        </p>
      </div>
    </div>
  `;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    console.warn("[digest] CRON_SECRET not set — endpoint is unprotected");
  } else if (!isVercelCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
  const routes = await getAllActiveRoutes();
  const alertsByEmail = new Map<string, PriceAlert[]>();

  for (const routeKey of routes) {
    const [from, to] = routeKey.split(":");
    if (!from || !to) continue;
    const alerts = await getAlertsByRoute(from, to);
    for (const alert of alerts) {
      if (!alert.active) continue;
      const existing = alertsByEmail.get(alert.email) ?? [];
      existing.push(alert);
      alertsByEmail.set(alert.email, existing);
    }
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [email, alerts] of Array.from(alertsByEmail)) {
    const lastSent = await redis.get(DIGEST_LAST_KEY(email));
    if (lastSent) { skipped++; continue; }

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: `✈ Tes ${alerts.length} alerte${alerts.length > 1 ? "s" : ""} prix cette semaine | KEZA`,
        html: buildDigestHtml(email, alerts),
      });
      await redis.set(DIGEST_LAST_KEY(email), "1", { ex: DIGEST_COOLDOWN_SEC });
      sent++;
    } catch (err) {
      errors.push(`${email}: ${(err as Error).message}`);
    }
  }

  return NextResponse.json({
    ok: true,
    totalEmails: alertsByEmail.size,
    sent,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
    ts: new Date().toISOString(),
  });
  } catch (err) {
    console.error("[digest] fatal error:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
