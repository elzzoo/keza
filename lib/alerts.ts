import "server-only";
import { randomUUID } from "crypto";
import { redis } from "./redis";
import { Resend } from "resend";
import { logError } from "@/lib/logger";
import {
  createManageAlertsToken,
  createUnsubscribeAlertToken,
} from "@/lib/alertTokens";
import { SITE_URL } from "@/lib/siteConfig";
import { airportsMap } from "@/data/airports";
import type { LiveDeal } from "@/lib/dealsEngine";

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
  /** How often to notify. "instant" = as soon as price drops (max 1/24h). "daily" = daily digest. "weekly" = weekly digest. */
  notifFrequency: "instant" | "daily" | "weekly";
  /**
   * Optional miles-value alert. When set, the cron also checks whether the
   * given program's CPP (cents per point / per mile) on this corridor is ≥
   * targetCpp. Fires independently of the cash price trigger.
   */
  milesAlert?: {
    program: string;    // e.g. "Singapore KrisFlyer"
    targetCpp: number;  // e.g. 1.5 (meaning ≥1.5¢ per mile/point)
    baseCpp: number;    // CPP at time of alert creation (context)
  };
}

// ─── Redis keys ─────────────────────────────────────────────────────────────

const ALERTS_BY_EMAIL = (email: string) => `keza:alerts:email:${email.toLowerCase()}`;
const ALERTS_BY_ROUTE = (from: string, to: string) => `keza:alerts:route:${from}:${to}`;
const ALERT_KEY = (id: string) => `keza:alert:${id}`;
const ALL_ROUTES_KEY = "keza:alerts:routes"; // Set of "FROM:TO" active routes

// ─── ID generation ──────────────────────────────────────────────────────────

function generateId(): string {
  return `alt_${randomUUID().replace(/-/g, '')}`;
}

// ─── Index helpers (atomic SET ops) ─────────────────────────────────────────

const INDEX_TTL = 90 * 86400;
const MIGRATED_KEYS = new Set<string>(); // Track keys that have been migrated to prevent re-migration

// Reads IDs from a Redis SET index. If the key was written in the old JSON-array
// format (pre-D2), migrates it transparently to a SET on first access.
async function getIdsFromIndex(key: string): Promise<string[]> {
  // If already migrated this session, skip the catch block
  if (MIGRATED_KEYS.has(key)) {
    return (await redis.smembers(key)) as string[];
  }

  const members = await redis.smembers(key).catch(async (_err) => {
    // WRONGTYPE error: key is an old JSON string — migrate to SET (one-time)
    const ids = (await redis.get<string[]>(key)) ?? [];
    if (ids.length > 0) {
      await redis.del(key);
      await redis.sadd(key, ids[0], ...ids.slice(1));
      await redis.expire(key, INDEX_TTL);
    }
    MIGRATED_KEYS.add(key); // Mark as migrated so future reads skip this
    return ids;
  });

  MIGRATED_KEYS.add(key); // Mark as migrated
  return members as string[];
}

async function addToIndex(key: string, id: string): Promise<void> {
  await redis.sadd(key, id);
  await redis.expire(key, INDEX_TTL); // refresh TTL on every write
}

async function removeFromIndex(key: string, id: string): Promise<void> {
  await redis.srem(key, id);
}

// ─── Create alert ───────────────────────────────────────────────────────────

export async function createAlert(params: {
  email: string;
  from: string;
  to: string;
  cabin: string;
  currentPrice: number;
  targetPrice?: number;  // Optional custom target — defaults to currentPrice × 0.9
  notifFrequency?: "instant" | "daily" | "weekly";
  milesAlert?: { program: string; targetCpp: number; baseCpp: number };
}): Promise<PriceAlert> {
  const id = generateId();
  // Use provided targetPrice if valid (> 0 and < currentPrice), else 90% default.
  const computedTarget = params.targetPrice && params.targetPrice > 0 && params.targetPrice < params.currentPrice
    ? Math.round(params.targetPrice)
    : Math.round(params.currentPrice * 0.9);
  const alert: PriceAlert = {
    id,
    email: params.email.toLowerCase().trim(),
    from: params.from.toUpperCase(),
    to: params.to.toUpperCase(),
    cabin: (params.cabin as PriceAlert["cabin"]) || "economy",
    basePrice: params.currentPrice,
    targetPrice: computedTarget,
    createdAt: new Date().toISOString(),
    notifCount: 0,
    active: true,
    notifFrequency: params.notifFrequency ?? "instant",
    ...(params.milesAlert ? { milesAlert: params.milesAlert } : {}),
  };

  await redis.set(ALERT_KEY(id), alert, { ex: INDEX_TTL });
  await addToIndex(ALERTS_BY_EMAIL(alert.email), id);
  await addToIndex(ALERTS_BY_ROUTE(alert.from, alert.to), id);
  await redis.sadd(ALL_ROUTES_KEY, `${alert.from}:${alert.to}`);

  return alert;
}

// ─── Get alerts ─────────────────────────────────────────────────────────────

export async function getAlertsByEmail(email: string): Promise<PriceAlert[]> {
  const ids = await getIdsFromIndex(ALERTS_BY_EMAIL(email.toLowerCase()));
  const alerts: PriceAlert[] = [];
  for (const id of ids) {
    const alert = await redis.get<PriceAlert>(ALERT_KEY(id));
    if (alert && alert.active) alerts.push(alert);
  }
  return alerts;
}

export async function getAlertById(id: string): Promise<PriceAlert | null> {
  return await redis.get<PriceAlert>(ALERT_KEY(id));
}

export async function getAlertsByRoute(from: string, to: string): Promise<PriceAlert[]> {
  const ids = await getIdsFromIndex(ALERTS_BY_ROUTE(from, to));
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

// ─── Update alert frequency ─────────────────────────────────────────────────

export async function updateAlertFrequency(
  id: string,
  frequency: "instant" | "daily" | "weekly"
): Promise<boolean> {
  const alert = await redis.get<PriceAlert>(ALERT_KEY(id));
  if (!alert) return false;
  alert.notifFrequency = frequency;
  await redis.set(ALERT_KEY(id), alert, { ex: INDEX_TTL });
  return true;
}

// ─── Get all active alerts grouped by email ─────────────────────────────────

export async function getAllActiveAlertsByEmail(): Promise<Map<string, PriceAlert[]>> {
  const routes = await redis.smembers(ALL_ROUTES_KEY);
  const byEmail = new Map<string, PriceAlert[]>();

  for (const routeKey of routes) {
    const [from, to] = (routeKey as string).split(":");
    if (!from || !to) continue;
    const ids = await getIdsFromIndex(ALERTS_BY_ROUTE(from, to));
    for (const id of ids) {
      const alert = await redis.get<PriceAlert>(ALERT_KEY(id));
      if (!alert || !alert.active) continue;
      const existing = byEmail.get(alert.email) ?? [];
      existing.push(alert);
      byEmail.set(alert.email, existing);
    }
  }

  return byEmail;
}

// ─── Deactivate alert ───────────────────────────────────────────────────────

export async function deactivateAlert(id: string): Promise<boolean> {
  const alert = await redis.get<PriceAlert>(ALERT_KEY(id));
  if (!alert) return false;
  alert.active = false;
  await redis.set(ALERT_KEY(id), alert, { ex: 7 * 86400 });

  // Remove from email and route indexes atomically
  await removeFromIndex(ALERTS_BY_EMAIL(alert.email), id);
  await removeFromIndex(ALERTS_BY_ROUTE(alert.from, alert.to), id);

  // Remove route from active-routes Set if no active alerts remain on it
  const remaining = await getAlertsByRoute(alert.from, alert.to);
  if (remaining.length === 0) {
    await redis.srem(ALL_ROUTES_KEY, `${alert.from}:${alert.to}`);
  }

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

function emailOpenPixelUrl(type: string, email: string): string {
  return `${BASE_URL}/api/track/open?type=${encodeURIComponent(type)}&email=${encodeURIComponent(email)}`;
}

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
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendDigestEmail(
  email: string,
  items: Array<{ alert: PriceAlert; currentPrice: number }>,
  /** Top deals of the week from the deals engine — shown at top of weekly digest */
  topDeals: LiveDeal[] = [],
): Promise<boolean> {
  if (items.length === 0 && topDeals.length === 0) return false;

  const manageToken = createManageAlertsToken(email);
  const manageUrl = withUtm(
    `${BASE_URL}/alertes?email=${encodeURIComponent(email)}&token=${encodeURIComponent(manageToken ?? "")}`,
    "keza",
    "digest"
  );
  const homeUrl = withUtm(`${BASE_URL}/`, "keza", "digest");

  const isWeekly = topDeals.length > 0;
  const weekStr  = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

  /* ── Deal cards (weekly only) ─────────────────────────────────────────────── */
  const dealCards = topDeals.slice(0, 3).map(deal => {
    const savingPct = Math.round((1 - (deal.milesRequired * deal.ratio / 100) / deal.cashPrice) * 100);
    const cpp       = deal.ratio.toFixed(1);
    const searchUrl = withUtm(`${BASE_URL}/?from=${deal.from}&to=${deal.to}`, "keza", "digest-deal");
    return `
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#131c35;border-radius:12px;margin-bottom:10px;overflow:hidden;">
        <tr>
          <td style="padding:14px 16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;font-size:13px;color:#94a3b8;">
                    ${deal.fromFlag} ${deal.from} <span style="color:#3b82f6;">→</span> ${deal.to} ${deal.toFlag}
                  </p>
                  <p style="margin:2px 0 0;font-size:15px;font-weight:700;color:#e2e8f0;">${deal.program}</p>
                  <p style="margin:2px 0 0;font-size:11px;color:#f59e0b;">${deal.milesRequired.toLocaleString("fr-FR")} pts · ${cpp}¢/mile</p>
                </td>
                <td style="text-align:right;vertical-align:top;padding-left:12px;">
                  <p style="margin:0;font-size:13px;color:#64748b;text-decoration:line-through;">$${deal.cashPrice}</p>
                  ${savingPct > 0 ? `<p style="margin:2px 0 0;font-size:14px;font-weight:900;color:#10b981;">-${savingPct}%</p>` : ""}
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding-top:10px;">
                  <a href="${searchUrl}" style="display:inline-block;background:#1e3a5f;color:#60a5fa;text-decoration:none;padding:7px 14px;border-radius:8px;font-size:12px;font-weight:600;border:1px solid #2d4a6f;">
                    Comparer ce vol →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`;
  }).join("");

  /* ── Alert rows ──────────────────────────────────────────────────────────── */
  const alertRows = items.map(({ alert, currentPrice }) => {
    const belowTarget = currentPrice > 0 && currentPrice <= alert.targetPrice;
    const priceColor  = belowTarget ? "#10b981" : "#94a3b8";
    const badge       = belowTarget
      ? `<span style="background:#052e16;color:#10b981;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;border:1px solid #166534;">🎯 OBJECTIF ATTEINT</span>`
      : "";
    const fromApt = airportsMap[alert.from];
    const toApt   = airportsMap[alert.to];
    const fromFlag = fromApt?.flag ?? "";
    const toFlag   = toApt?.flag   ?? "";
    const searchUrl = withUtm(`${BASE_URL}/?from=${alert.from}&to=${alert.to}`, "keza", "digest-alert");
    return `
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#131c35;border-radius:12px;margin-bottom:8px;">
        <tr>
          <td style="padding:14px 16px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;font-size:15px;font-weight:700;color:#e2e8f0;">
                    ${fromFlag} ${alert.from} <span style="color:#3b82f6;">→</span> ${alert.to} ${toFlag}
                  </p>
                  <p style="margin:2px 0 0;font-size:11px;color:#64748b;">${CABIN_LABELS[alert.cabin]} · cible $${alert.targetPrice}</p>
                  ${badge ? `<p style="margin:4px 0 0;">${badge}</p>` : ""}
                </td>
                <td style="text-align:right;padding-left:12px;white-space:nowrap;">
                  <p style="margin:0;font-size:20px;font-weight:900;color:${priceColor};">${currentPrice > 0 ? `$${currentPrice}` : "—"}</p>
                  <a href="${searchUrl}" style="font-size:11px;color:#60a5fa;text-decoration:none;">Voir →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`;
  }).join("");

  /* ── Subject + preheader ─────────────────────────────────────────────────── */
  const subject = isWeekly
    ? `🔥 Top deals miles de la semaine + tes alertes — KEZA`
    : `✈ Récap KEZA — ${items.length} route${items.length > 1 ? "s" : ""} surveillée${items.length > 1 ? "s" : ""}`;

  const preheader = isWeekly && topDeals[0]
    ? `${topDeals[0].program} à ${topDeals[0].ratio.toFixed(1)}¢/mile · ${topDeals[0].from}→${topDeals[0].to}`
    : `${items.length} route${items.length > 1 ? "s" : ""} surveillée${items.length > 1 ? "s" : ""}`;

  /* ── Plain-text fallback ─────────────────────────────────────────────────── */
  const plainText = [
    isWeekly ? `🔥 TOP DEALS MILES — semaine du ${weekStr}` : `✈ KEZA — Récap alertes`,
    "",
    ...(isWeekly && topDeals.length > 0 ? [
      "MEILLEURS DEALS CETTE SEMAINE :",
      ...topDeals.slice(0, 3).map(d =>
        `${d.from}→${d.to} · ${d.program} · ${d.ratio.toFixed(1)}¢/mile · ${d.milesRequired.toLocaleString()} pts`
      ),
      "",
    ] : []),
    ...(items.length > 0 ? [
      "TES ALERTES :",
      ...items.map(({ alert: a, currentPrice: cp }) =>
        `${a.from}→${a.to} (${CABIN_LABELS[a.cabin]}) — cible $${a.targetPrice}${cp ? ` | actuel : $${cp}` : ""}`
      ),
      "",
    ] : []),
    `Comparer les vols :`,
    homeUrl,
    "",
    `Gérer tes alertes :`,
    manageUrl,
  ].join("\n");

  /* ── HTML ────────────────────────────────────────────────────────────────── */
  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:16px;background:#06090f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<!-- preheader -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</div>

<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#0d1117;border-radius:20px;overflow:hidden;border:1px solid #1e293b;">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#0f2340 0%,#0d1117 100%);padding:28px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <p style="margin:0;font-size:26px;font-weight:900;letter-spacing:-1px;">
          <span style="color:#3b82f6;">KE</span><span style="color:#f1f5f9;">ZA</span>
        </p>
        <p style="margin:2px 0 0;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.06em;">
          ${isWeekly ? `digest · semaine du ${weekStr}` : `récap alertes · ${weekStr}`}
        </p>
      </td>
      <td style="text-align:right;">
        <span style="background:#1e3a5f;color:#60a5fa;font-size:11px;font-weight:700;padding:5px 12px;border-radius:20px;border:1px solid #2d4a6f;">
          ${isWeekly ? "📬 Digest hebdo" : "✈ Recap alertes"}
        </span>
      </td>
    </tr></table>
  </td></tr>

  <!-- BODY -->
  <tr><td style="padding:24px 32px;">

    ${isWeekly && topDeals.length > 0 ? `
    <!-- DEALS SECTION -->
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#f59e0b;text-transform:uppercase;letter-spacing:.08em;">🔥 Meilleurs deals miles cette semaine</p>
    <p style="margin:0 0 16px;font-size:13px;color:#64748b;">Les routes avec la meilleure valeur mile actuellement</p>
    ${dealCards}
    <div style="height:24px;"></div>
    ` : ""}

    ${items.length > 0 ? `
    <!-- ALERTS SECTION -->
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;">📊 Tes alertes actives</p>
    <p style="margin:0 0 16px;font-size:13px;color:#64748b;">Prix actuel vs ton objectif</p>
    ${alertRows}
    <div style="height:16px;"></div>
    ` : ""}

    <!-- CTA -->
    <a href="${homeUrl}"
       style="display:block;text-align:center;background:#3b82f6;color:#fff;text-decoration:none;padding:15px 24px;border-radius:12px;font-weight:700;font-size:15px;margin-top:8px;">
      Comparer cash vs miles →
    </a>

    <a href="${manageUrl}"
       style="display:block;text-align:center;background:#131c35;color:#64748b;text-decoration:none;padding:12px 24px;border-radius:12px;font-size:13px;border:1px solid #1e293b;margin-top:8px;">
      Gérer mes alertes
    </a>

  </td></tr>

  <!-- FOOTER -->
  <tr><td style="padding:16px 32px;border-top:1px solid #1e293b;">
    <p style="margin:0;font-size:10px;color:#334155;text-align:center;">
      Tu reçois cet email car tu as des alertes actives sur
      <a href="${homeUrl}" style="color:#475569;text-decoration:none;">keza.app</a>.
      &nbsp;·&nbsp;
      <a href="${manageUrl}" style="color:#475569;text-decoration:none;">Se désabonner</a>
    </p>
  </td></tr>

</table>
</td></tr></table>
<img src="${emailOpenPixelUrl("digest", email)}" width="1" height="1" style="display:block;width:1px;height:1px;opacity:0;" alt="" />
</body></html>`;

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      text: plainText,
      html,
    });
    return true;
  } catch (err) {
    logError("[alerts] digest email failed:", err);
    return false;
  }
}

export async function sendPriceDropEmail(alert: PriceAlert, newPrice: number): Promise<boolean> {
  const drop = Math.round(((alert.basePrice - newPrice) / alert.basePrice) * 100);
  const savings = Math.round(alert.basePrice - newPrice);

  const unsubToken = createUnsubscribeAlertToken(alert.id);
  const unsubUrl = `${BASE_URL}/api/alerts/unsubscribe?id=${encodeURIComponent(alert.id)}&token=${encodeURIComponent(unsubToken ?? "")}`;
  const searchUrl = withUtm(`${BASE_URL}/?from=${alert.from}&to=${alert.to}`, "keza", "price-drop");

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_EMAIL,
      to: alert.email,
      subject: `✈ ${alert.from}→${alert.to} : -${drop}% ($${newPrice})`,
      text: [
        `✈ KEZA — Prix atteint !`,
        ``,
        `${alert.from} → ${alert.to} (${alert.cabin})`,
        `Prix actuel : $${newPrice}  (votre cible : $${alert.targetPrice})`,
        `Économie : -$${savings} (-${drop}%)`,
        ``,
        `Comparer cash vs miles :`,
        searchUrl,
        ``,
        `Se désabonner de cette alerte :`,
        unsubUrl,
      ].join("\n"),
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
          <img src="${emailOpenPixelUrl("price-drop", alert.email)}" width="1" height="1" style="display:block;width:1px;height:1px;opacity:0;" alt="" />
        </div>
      `,
    });
    return true;
  } catch (err) {
    logError("[alerts] email failed:", err);
    return false;
  }
}

/**
 * Send an email notifying the user that a miles-value alert fired.
 * Triggered when CPP for their chosen program on this corridor reaches the target.
 */
export async function sendMilesAlertEmail(
  alert: PriceAlert,
  currentCpp: number,
  cashPrice: number,
): Promise<boolean> {
  if (!alert.milesAlert) return false;
  const { program, targetCpp } = alert.milesAlert;
  const unsubToken = createUnsubscribeAlertToken(alert.id);
  const unsubUrl = `${BASE_URL}/api/alerts/unsubscribe?id=${encodeURIComponent(alert.id)}&token=${encodeURIComponent(unsubToken ?? "")}`;
  const searchUrl = withUtm(`${BASE_URL}/?from=${alert.from}&to=${alert.to}`, "keza", "miles-alert");
  const cppDisplay = currentCpp.toFixed(2);
  const targetDisplay = targetCpp.toFixed(2);

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_EMAIL,
      to: alert.email,
      subject: `✈ ${alert.from}→${alert.to} : ${program} vaut ${cppDisplay}¢/pt maintenant !`,
      text: [
        `✈ KEZA — Alerte Miles déclenchée !`,
        ``,
        `${alert.from} → ${alert.to} (${alert.cabin})`,
        `Programme : ${program}`,
        `Valeur actuelle : ${cppDisplay}¢ par point`,
        `Votre cible : ${targetDisplay}¢ par point`,
        `Prix cash de référence : $${Math.round(cashPrice)}`,
        ``,
        `Comparez et réservez :`,
        searchUrl,
        ``,
        `Se désabonner de cette alerte :`,
        unsubUrl,
      ].join("\n"),
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0f;color:#e2e8f0;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1e3a5f,#0a0a1a);padding:24px;text-align:center;">
            <h1 style="margin:0;font-size:24px;"><span style="color:#3b82f6;">KE</span><span style="color:#e2e8f0;">ZA</span></h1>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Miles Alert</p>
          </div>
          <div style="padding:24px;">
            <div style="background:#1a1a2e;border-radius:12px;padding:20px;text-align:center;margin-bottom:16px;">
              <p style="margin:0;font-size:14px;color:#94a3b8;">${alert.from} → ${alert.to} · ${program}</p>
              <p style="margin:8px 0 0;font-size:36px;font-weight:900;color:#f59e0b;">${cppDisplay}¢<span style="font-size:16px;color:#94a3b8;">/pt</span></p>
              <p style="margin:4px 0 0;font-size:13px;color:#94a3b8;">Votre cible : ≥${targetDisplay}¢/pt · Prix cash : $${Math.round(cashPrice)}</p>
            </div>
            <a href="${searchUrl}" style="display:block;text-align:center;background:#f59e0b;color:white;text-decoration:none;padding:14px;border-radius:12px;font-weight:600;font-size:14px;">
              Voir les options miles →
            </a>
            <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#64748b;">
              <a href="${unsubUrl}" style="color:#64748b;">Se désabonner</a>
            </p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (err) {
    logError("[alerts] miles alert email failed:", err);
    return false;
  }
}

/**
 * Send a pre-deactivation warning email when an alert is about to reach its
 * notification limit (notifCount === 4, one notification remaining).
 * Lets users know the alert will expire and provides a one-click renewal link.
 * Fire-and-forget safe — caller should not await if it doesn't need to block.
 */
export async function sendAlertPreDeactivationEmail(alert: PriceAlert): Promise<boolean> {
  const manageToken = createManageAlertsToken(alert.email);
  const renewUrl = manageToken
    ? `${BASE_URL}/alertes?email=${encodeURIComponent(alert.email)}&token=${encodeURIComponent(manageToken)}&renew=${encodeURIComponent(alert.id)}`
    : `${BASE_URL}/alertes`;

  try {
    const resend = getResend();
    await resend.emails.send({
      from:    FROM_EMAIL,
      to:      alert.email,
      subject: `⚠️ Votre alerte ${alert.from}→${alert.to} expire bientôt`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0f;color:#e2e8f0;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1e3a5f,#0a0a1a);padding:24px;">
            <h1 style="margin:0;font-size:20px;"><span style="color:#3b82f6;">KE</span><span>ZA</span></h1>
            <p style="margin:4px 0 0;font-size:13px;color:#f59e0b;">Alerte prix — Dernière notification</p>
          </div>
          <div style="padding:24px;">
            <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#fbbf24;">
              ⚠️ Votre alerte ${alert.from}→${alert.to} va s'éteindre
            </p>
            <p style="margin:0 0 16px;font-size:14px;color:#94a3b8;line-height:1.6;">
              Cette notification est la <strong style="color:#e2e8f0;">dernière</strong> pour cette alerte.
              Elle sera désactivée automatiquement après envoi pour éviter le spam.
            </p>
            <div style="background:#1a1a2e;border-radius:12px;padding:16px;margin-bottom:16px;">
              <p style="margin:0;font-size:12px;color:#64748b;">Votre alerte</p>
              <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#e2e8f0;">${alert.from} → ${alert.to}</p>
              <p style="margin:2px 0 0;font-size:12px;color:#64748b;">${alert.cabin} · cible $${alert.targetPrice}</p>
            </div>
            <a href="${renewUrl}" style="display:block;text-align:center;background:#3b82f6;color:white;text-decoration:none;padding:14px;border-radius:12px;font-weight:600;font-size:14px;">
              🔄 Renouveler l'alerte
            </a>
            <p style="margin:16px 0 0;font-size:11px;color:#64748b;text-align:center;">
              Vous pouvez aussi créer une nouvelle alerte directement depuis les résultats KEZA.
            </p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (err) {
    logError("[alerts] pre-deactivation email failed:", err);
    return false;
  }
}

/** Send a confirmation email when a price alert is created. Fire-and-forget — caller should not await if it doesn't need to block. */
export async function sendAlertConfirmationEmail(alert: PriceAlert): Promise<boolean> {
  const manageToken = createManageAlertsToken(alert.email);
  const unsubToken = createUnsubscribeAlertToken(alert.id);
  const manageUrl = withUtm(
    `${BASE_URL}/alertes?email=${encodeURIComponent(alert.email)}&token=${encodeURIComponent(manageToken ?? "")}`,
    "keza",
    "confirmation"
  );
  const unsubUrl = `${BASE_URL}/api/alerts/unsubscribe?id=${encodeURIComponent(alert.id)}&token=${encodeURIComponent(unsubToken ?? "")}`;

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_EMAIL,
      to: alert.email,
      subject: `✈ Alerte active : ${alert.from} → ${alert.to} | KEZA`,
      text: [
        `✈ KEZA — Alerte créée !`,
        ``,
        `Route : ${alert.from} → ${alert.to} (${CABIN_LABELS[alert.cabin]})`,
        `Prix de référence : $${alert.basePrice}`,
        `On t'écrit dès que le prix descend sous $${alert.targetPrice} (−10 %)`,
        ``,
        `Gérer mes alertes :`,
        manageUrl,
        ``,
        `Se désabonner :`,
        unsubUrl,
      ].join("\n"),
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
          <img src="${emailOpenPixelUrl("confirmation", alert.email)}" width="1" height="1" style="display:block;width:1px;height:1px;opacity:0;" alt="" />
        </div>
      `,
    });
    return true;
  } catch (err) {
    logError("[alerts] confirmation email failed:", err);
    return false;
  }
}

export async function sendOnboardingJ3Email(
  alert: PriceAlert,
  currentPrice: number | null
): Promise<boolean> {
  const manageToken = createManageAlertsToken(alert.email);
  const manageUrl = withUtm(
    `${SITE_URL}/alertes?email=${encodeURIComponent(alert.email)}&token=${encodeURIComponent(manageToken ?? "")}`,
    "keza",
    "onboarding-j3"
  );
  const ctaUrl = withUtm(`${SITE_URL}/flights/${alert.from}-${alert.to}`, "keza", "onboarding-j3");

  const fromCity = airportsMap[alert.from]?.city ?? alert.from;
  const toCity = airportsMap[alert.to]?.city ?? alert.to;

  const belowTarget = currentPrice !== null && currentPrice <= alert.targetPrice;
  const priceColor = belowTarget ? "#10b981" : "#94a3b8";
  const priceBlock =
    currentPrice !== null
      ? `
        <div style="background:#1a1a2e;border-radius:12px;padding:16px;margin-bottom:16px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Prix le plus bas actuellement</p>
          <p style="margin:8px 0 0;font-size:32px;font-weight:900;color:${priceColor};">$${currentPrice}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#64748b;">Cible : $${alert.targetPrice}</p>
        </div>
      `
      : `
        <div style="background:#1a1a2e;border-radius:12px;padding:16px;margin-bottom:16px;text-align:center;">
          <p style="margin:0;font-size:13px;color:#64748b;">Aucun prix disponible pour le moment — on continue de surveiller.</p>
        </div>
      `;

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_EMAIL,
      to: alert.email,
      subject: `✈ Mise à jour KEZA — ta route ${alert.from} → ${alert.to}`,
      text: [
        `✈ KEZA — 3 jours de surveillance`,
        ``,
        `Route : ${fromCity} → ${toCity} (${alert.from} → ${alert.to}, ${CABIN_LABELS[alert.cabin]})`,
        currentPrice !== null
          ? `Prix actuel : $${currentPrice} | Cible : $${alert.targetPrice}`
          : `Aucun prix disponible pour le moment — surveillance en cours.`,
        ``,
        `Voir les offres :`,
        ctaUrl,
        ``,
        `Gérer mes alertes :`,
        manageUrl,
      ].join("\n"),
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0f;color:#e2e8f0;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1e3a5f,#0a0a1a);padding:24px;text-align:center;">
            <h1 style="margin:0;font-size:24px;"><span style="color:#3b82f6;">KE</span><span style="color:#e2e8f0;">ZA</span></h1>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Suivi de route</p>
          </div>

          <div style="padding:24px;">
            <p style="margin:0 0 16px;font-size:15px;color:#e2e8f0;font-weight:600;">
              3 jours sous surveillance 👀
            </p>

            <div style="background:#1a1a2e;border-radius:12px;padding:16px;margin-bottom:16px;">
              <p style="margin:0;font-size:14px;color:#94a3b8;letter-spacing:0.05em;">
                ${fromCity} → ${toCity}
              </p>
              <p style="margin:4px 0 0;font-size:12px;color:#475569;">
                ${alert.from} → ${alert.to} · ${CABIN_LABELS[alert.cabin]}
              </p>
            </div>

            ${priceBlock}

            <p style="margin:0 0 16px;font-size:13px;color:#94a3b8;line-height:1.6;">
              KEZA surveille les prix en continu — on t'alertera dès qu'une baisse se présente.
            </p>

            <a href="${ctaUrl}"
               style="display:block;text-align:center;background:#3b82f6;color:white;text-decoration:none;padding:14px;border-radius:12px;font-weight:600;font-size:14px;margin-bottom:8px;">
              Voir les offres maintenant →
            </a>

            <a href="${manageUrl}"
               style="display:block;text-align:center;background:#1e3a5f;color:#94a3b8;text-decoration:none;padding:12px;border-radius:12px;font-size:13px;border:1px solid #2d4a6f;">
              Gérer mes alertes →
            </a>
          </div>

          <div style="padding:16px 24px;border-top:1px solid #1e293b;text-align:center;">
            <p style="margin:0;font-size:10px;color:#334155;">
              Tu reçois cet email car tu as une alerte active sur KEZA.
            </p>
          </div>
          <img src="${emailOpenPixelUrl("onboarding-j3", alert.email)}" width="1" height="1" style="display:block;width:1px;height:1px;opacity:0;" alt="" />
        </div>
      `,
    });
    return true;
  } catch (err) {
    logError("[alerts] onboarding j3 email failed:", err);
    return false;
  }
}

export async function sendOnboardingJ7Email(alert: PriceAlert): Promise<boolean> {
  const manageToken = createManageAlertsToken(alert.email);
  const manageUrl = withUtm(
    `${SITE_URL}/alertes?email=${encodeURIComponent(alert.email)}&token=${encodeURIComponent(manageToken ?? "")}`,
    "keza",
    "onboarding-j7"
  );
  const shareUrl = withUtm(SITE_URL, "keza", "onboarding-j7-share");
  const proUrl = withUtm(`${SITE_URL}/pro`, "keza", "onboarding-j7-pro");

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_EMAIL,
      to: alert.email,
      subject: `🎯 KEZA — invite un ami et débloquez des avantages`,
      text: [
        `KEZA — Ta route est surveillée depuis 7 jours`,
        ``,
        `Partage KEZA avec un ami qui voyage et accède en avant-première à KEZA Pro`,
        `(alertes illimitées, digest personnalisé).`,
        ``,
        `Partager KEZA :`,
        shareUrl,
        ``,
        `Découvrir KEZA Pro :`,
        proUrl,
        ``,
        `Gérer mes alertes :`,
        manageUrl,
      ].join("\n"),
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0f;color:#e2e8f0;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1e3a5f,#0a0a1a);padding:24px;text-align:center;">
            <h1 style="margin:0;font-size:24px;"><span style="color:#3b82f6;">KE</span><span style="color:#e2e8f0;">ZA</span></h1>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">1 semaine ensemble</p>
          </div>

          <div style="padding:24px;">
            <p style="margin:0 0 16px;font-size:15px;color:#e2e8f0;font-weight:600;">
              Ta route est surveillée depuis 7 jours 🎯
            </p>

            <p style="margin:0 0 20px;font-size:14px;color:#94a3b8;line-height:1.7;">
              Partage KEZA avec un ami qui voyage aussi — et accède en avant-première à
              <strong style="color:#e2e8f0;">KEZA Pro</strong>
              (alertes illimitées, digest personnalisé).
            </p>

            <a href="${shareUrl}"
               style="display:block;text-align:center;background:#3b82f6;color:white;text-decoration:none;padding:14px;border-radius:12px;font-weight:600;font-size:14px;margin-bottom:8px;">
              Partager KEZA →
            </a>

            <a href="${proUrl}"
               style="display:block;text-align:center;background:#1e3a5f;color:#94a3b8;text-decoration:none;padding:12px;border-radius:12px;font-size:13px;border:1px solid #2d4a6f;margin-bottom:8px;">
              Découvrir KEZA Pro →
            </a>

            <a href="${manageUrl}"
               style="display:block;text-align:center;background:transparent;color:#475569;text-decoration:none;padding:10px;border-radius:12px;font-size:12px;">
              Gérer mes alertes →
            </a>
          </div>

          <div style="padding:16px 24px;border-top:1px solid #1e293b;text-align:center;">
            <p style="margin:0;font-size:10px;color:#334155;">
              Tu reçois cet email car tu as une alerte active sur KEZA.
            </p>
          </div>
          <img src="${emailOpenPixelUrl("onboarding-j7", alert.email)}" width="1" height="1" style="display:block;width:1px;height:1px;opacity:0;" alt="" />
        </div>
      `,
    });
    return true;
  } catch (err) {
    logError("[alerts] onboarding j7 email failed:", err);
    return false;
  }
}

export async function sendManageAlertsEmail(email: string, alerts: PriceAlert[]): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const manageToken = createManageAlertsToken(normalizedEmail);
  if (!manageToken) return false;

  const manageUrl = withUtm(
    `${BASE_URL}/alertes?email=${encodeURIComponent(normalizedEmail)}&token=${encodeURIComponent(manageToken)}`,
    "keza",
    "manage-alerts"
  );

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM_EMAIL,
      to: normalizedEmail,
      subject: `Gérer tes alertes prix | KEZA`,
      text: [
        `KEZA — Accéder à tes alertes`,
        ``,
        `Tu as ${alerts.length} alerte${alerts.length > 1 ? "s" : ""} active${alerts.length > 1 ? "s" : ""}.`,
        ``,
        `Gérer mes alertes (lien valable 7 jours) :`,
        manageUrl,
      ].join("\n"),
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0f;color:#e2e8f0;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#1e3a5f,#0a0a1a);padding:24px;text-align:center;">
            <h1 style="margin:0;font-size:24px;"><span style="color:#3b82f6;">KE</span><span style="color:#e2e8f0;">ZA</span></h1>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Gestion des alertes</p>
          </div>
          <div style="padding:24px;">
            <p style="margin:0 0 16px;font-size:15px;color:#e2e8f0;font-weight:600;">
              Accède à tes ${alerts.length} alerte${alerts.length > 1 ? "s" : ""} active${alerts.length > 1 ? "s" : ""}
            </p>
            <a href="${manageUrl}"
               style="display:block;text-align:center;background:#3b82f6;color:white;text-decoration:none;padding:14px;border-radius:12px;font-weight:600;font-size:14px;">
              Gérer mes alertes
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
    logError("[alerts] manage email failed:", err);
    return false;
  }
}
