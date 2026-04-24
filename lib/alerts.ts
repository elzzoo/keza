import "server-only";
import { redis } from "./redis";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PriceAlert {
  id: string;
  email: string;
  from: string;
  to: string;
  cabin: "economy" | "premium" | "business" | "first";
  /** Price when alert was created */
  basePrice: number;
  /** Threshold: notify when price drops below this (default: basePrice * 0.9) */
  targetPrice: number;
  createdAt: string;
  /** Last time we checked this alert */
  lastCheckedAt?: string;
  /** Last price we found */
  lastPrice?: number;
  /** Number of notifications sent */
  notifCount: number;
  active: boolean;
}

// ─── Redis keys ─────────────────────────────────────────────────────────────

const ALERTS_BY_EMAIL = (email: string) => `keza:alerts:email:${email.toLowerCase()}`;
const ALERTS_BY_ROUTE = (from: string, to: string) => `keza:alerts:route:${from}:${to}`;
const ALERT_KEY = (id: string) => `keza:alert:${id}`;
const ALL_ROUTES_KEY = "keza:alerts:routes"; // Set of "FROM:TO" active routes

// ─── ID generation ──────────────────────────────────────────────────────────

function generateId(): string {
  return `alt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Create alert ───────────────────────────────────────────────────────────

export async function createAlert(params: {
  email: string;
  from: string;
  to: string;
  cabin: string;
  currentPrice: number;
}): Promise<PriceAlert> {
  const id = generateId();
  const alert: PriceAlert = {
    id,
    email: params.email.toLowerCase().trim(),
    from: params.from.toUpperCase(),
    to: params.to.toUpperCase(),
    cabin: (params.cabin as PriceAlert["cabin"]) || "economy",
    basePrice: params.currentPrice,
    targetPrice: Math.round(params.currentPrice * 0.9), // Alert when 10%+ drop
    createdAt: new Date().toISOString(),
    notifCount: 0,
    active: true,
  };

  // Store alert data
  await redis.set(ALERT_KEY(id), alert, { ex: 90 * 86400 }); // 90 days TTL

  // Index by email
  const emailAlerts = await redis.get<string[]>(ALERTS_BY_EMAIL(alert.email)) ?? [];
  emailAlerts.push(id);
  await redis.set(ALERTS_BY_EMAIL(alert.email), emailAlerts, { ex: 90 * 86400 });

  // Index by route
  const routeAlerts = await redis.get<string[]>(ALERTS_BY_ROUTE(alert.from, alert.to)) ?? [];
  routeAlerts.push(id);
  await redis.set(ALERTS_BY_ROUTE(alert.from, alert.to), routeAlerts, { ex: 90 * 86400 });

  // Track active routes
  await redis.sadd(ALL_ROUTES_KEY, `${alert.from}:${alert.to}`);

  return alert;
}

// ─── Get alerts ─────────────────────────────────────────────────────────────

export async function getAlertsByEmail(email: string): Promise<PriceAlert[]> {
  const ids = await redis.get<string[]>(ALERTS_BY_EMAIL(email.toLowerCase())) ?? [];
  const alerts: PriceAlert[] = [];
  for (const id of ids) {
    const alert = await redis.get<PriceAlert>(ALERT_KEY(id));
    if (alert && alert.active) alerts.push(alert);
  }
  return alerts;
}

export async function getAlertsByRoute(from: string, to: string): Promise<PriceAlert[]> {
  const ids = await redis.get<string[]>(ALERTS_BY_ROUTE(from, to)) ?? [];
  const alerts: PriceAlert[] = [];
  for (const id of ids) {
    const alert = await redis.get<PriceAlert>(ALERT_KEY(id));
    if (alert && alert.active) alerts.push(alert);
  }
  return alerts;
}

export async function getAllActiveRoutes(): Promise<string[]> {
  const routes = await redis.smembers(ALL_ROUTES_KEY);
  return routes;
}

// ─── Deactivate alert ───────────────────────────────────────────────────────

export async function deactivateAlert(id: string): Promise<boolean> {
  const alert = await redis.get<PriceAlert>(ALERT_KEY(id));
  if (!alert) return false;
  alert.active = false;
  await redis.set(ALERT_KEY(id), alert, { ex: 7 * 86400 }); // Keep 7 more days then expire
  return true;
}

// ─── Update alert after check ───────────────────────────────────────────────

export async function updateAlertAfterCheck(id: string, lastPrice: number, notified: boolean): Promise<void> {
  const alert = await redis.get<PriceAlert>(ALERT_KEY(id));
  if (!alert) return;
  alert.lastCheckedAt = new Date().toISOString();
  alert.lastPrice = lastPrice;
  if (notified) alert.notifCount++;
  await redis.set(ALERT_KEY(id), alert, { ex: 90 * 86400 });
}

// ─── Send notification email ────────────────────────────────────────────────

// Configurable via RESEND_FROM_EMAIL env var.
// Default: Resend shared domain (dev/test).
// Production: set RESEND_FROM_EMAIL="KEZA Alerts <alerts@keza.app>" in Vercel env vars.
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "KEZA Alerts <onboarding@resend.dev>";

// Base URL for links in emails. Vercel sets NEXT_PUBLIC_APP_URL automatically on preview deployments.
const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://keza-taupe.vercel.app";

function withUtm(url: string, source: string, campaign: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}utm_source=${source}&utm_medium=email&utm_campaign=${campaign}`;
}

// Cabin display names used in confirmation emails.
const CABIN_LABELS: Record<PriceAlert["cabin"], string> = {
  economy: "Économique",
  premium: "Premium Éco",
  business: "Business",
  first: "Première",
};

function getResend() {
  const { Resend } = require("resend") as { Resend: new (key?: string) => { emails: { send: (params: Record<string, unknown>) => Promise<unknown> } } };
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendPriceDropEmail(alert: PriceAlert, newPrice: number): Promise<boolean> {
  const drop = Math.round(((alert.basePrice - newPrice) / alert.basePrice) * 100);
  const savings = Math.round(alert.basePrice - newPrice);

  const unsubUrl = `${BASE_URL}/api/alerts/unsubscribe?id=${alert.id}`;
  const searchUrl = withUtm(`${BASE_URL}/?from=${alert.from}&to=${alert.to}`, "keza", "price-drop");

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_EMAIL,
      to: alert.email,
      subject: `✈ ${alert.from}→${alert.to} : -${drop}% ($${newPrice})`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0f;color:#e2e8f0;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1e3a5f,#0a0a1a);padding:24px;text-align:center;">
            <h1 style="margin:0;font-size:24px;"><span style="color:#3b82f6;">KE</span><span style="color:#e2e8f0;">ZA</span></h1>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Price Alert</p>
          </div>

          <div style="padding:24px;">
            <div style="background:#1a1a2e;border-radius:12px;padding:20px;text-align:center;margin-bottom:16px;">
              <p style="margin:0;font-size:14px;color:#94a3b8;">${alert.from} → ${alert.to}</p>
              <p style="margin:8px 0 0;font-size:36px;font-weight:900;color:#10b981;">$${newPrice}</p>
              <p style="margin:4px 0 0;font-size:13px;color:#94a3b8;">
                <span style="text-decoration:line-through;">$${alert.basePrice}</span>
                &nbsp;→&nbsp;
                <span style="color:#10b981;font-weight:700;">-$${savings} (-${drop}%)</span>
              </p>
            </div>

            <a href="${searchUrl}" style="display:block;text-align:center;background:#3b82f6;color:white;text-decoration:none;padding:14px;border-radius:12px;font-weight:600;font-size:14px;">
              Compare cash vs miles →
            </a>

            <p style="margin:16px 0 0;font-size:11px;color:#475569;text-align:center;">
              ${alert.cabin.charAt(0).toUpperCase() + alert.cabin.slice(1)} class · Alert set at $${alert.basePrice}
            </p>
          </div>

          <div style="padding:16px 24px;border-top:1px solid #1e293b;text-align:center;">
            <a href="${unsubUrl}" style="color:#475569;font-size:11px;text-decoration:underline;">Unsubscribe from this alert</a>
          </div>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("[alerts] email failed:", err);
    return false;
  }
}

/** Send a confirmation email when a price alert is created. Fire-and-forget — caller should not await if it doesn't need to block. */
export async function sendAlertConfirmationEmail(alert: PriceAlert): Promise<boolean> {
  const manageUrl = withUtm(`${BASE_URL}/alertes`, "keza", "confirmation");
  const unsubUrl = `${BASE_URL}/api/alerts/unsubscribe?id=${alert.id}`;

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_EMAIL,
      to: alert.email,
      subject: `✈ Alerte active : ${alert.from} → ${alert.to} | KEZA`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0f;color:#e2e8f0;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1e3a5f,#0a0a1a);padding:24px;text-align:center;">
            <h1 style="margin:0;font-size:24px;"><span style="color:#3b82f6;">KE</span><span style="color:#e2e8f0;">ZA</span></h1>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Alerte prix</p>
          </div>

          <div style="padding:24px;">
            <p style="margin:0 0 16px;font-size:15px;color:#e2e8f0;font-weight:600;">
              Ton alerte est active ✅
            </p>

            <div style="background:#1a1a2e;border-radius:12px;padding:20px;margin-bottom:16px;">
              <p style="margin:0;font-size:14px;color:#94a3b8;letter-spacing:0.05em;">
                ${alert.from} → ${alert.to} · ${CABIN_LABELS[alert.cabin]}
              </p>
              <p style="margin:10px 0 0;font-size:15px;color:#e2e8f0;">
                On t'écrit dès que le prix descend sous
                <strong style="color:#10b981;">$${alert.targetPrice}</strong>
              </p>
              <p style="margin:6px 0 0;font-size:12px;color:#475569;">
                Prix de référence : $${alert.basePrice} · Seuil : −10 %
              </p>
            </div>

            <a href="${manageUrl}"
               style="display:block;text-align:center;background:#1e3a5f;color:#94a3b8;text-decoration:none;padding:12px;border-radius:12px;font-size:13px;border:1px solid #2d4a6f;">
              Gérer mes alertes →
            </a>
          </div>

          <div style="padding:16px 24px;border-top:1px solid #1e293b;text-align:center;">
            <a href="${unsubUrl}" style="color:#475569;font-size:11px;text-decoration:underline;">
              Se désabonner de cette alerte
            </a>
          </div>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("[alerts] confirmation email failed:", err);
    return false;
  }
}
