import "server-only";
import { createHmac } from "crypto";
import { safeCompare } from "@/lib/auth";

type AlertTokenAction = "manage" | "unsubscribe";

interface AlertTokenPayload {
  sub: string;
  action: AlertTokenAction;
  exp: number;
}

const MANAGE_TTL_SECONDS = 7 * 24 * 60 * 60;
const UNSUBSCRIBE_TTL_SECONDS = 180 * 24 * 60 * 60;

function getTokenSecret(): string | undefined {
  return process.env.ALERT_TOKEN_SECRET ?? process.env.ADMIN_SECRET ?? process.env.CRON_SECRET;
}

function base64UrlJson(payload: AlertTokenPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function createToken(payload: AlertTokenPayload): string | null {
  const secret = getTokenSecret();
  if (!secret) return null;

  const encodedPayload = base64UrlJson(payload);
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

function readToken(token: string | null | undefined): AlertTokenPayload | null {
  const secret = getTokenSecret();
  if (!secret || !token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = sign(encodedPayload, secret);
  if (!safeCompare(signature, expected)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as AlertTokenPayload;
    if (!payload.sub || !payload.action || !Number.isInteger(payload.exp)) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createManageAlertsToken(email: string): string | null {
  return createToken({
    sub: email.trim().toLowerCase(),
    action: "manage",
    exp: Math.floor(Date.now() / 1000) + MANAGE_TTL_SECONDS,
  });
}

export function verifyManageAlertsToken(email: string, token: string | null | undefined): boolean {
  const payload = readToken(token);
  return (
    payload?.action === "manage" &&
    safeCompare(payload.sub, email.trim().toLowerCase())
  );
}

export function createUnsubscribeAlertToken(alertId: string): string | null {
  return createToken({
    sub: alertId,
    action: "unsubscribe",
    exp: Math.floor(Date.now() / 1000) + UNSUBSCRIBE_TTL_SECONDS,
  });
}

export function verifyUnsubscribeAlertToken(alertId: string, token: string | null | undefined): boolean {
  const payload = readToken(token);
  return payload?.action === "unsubscribe" && safeCompare(payload.sub, alertId);
}
