import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE = "keza_admin_session";
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

export function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a.padEnd(256));
  const bBuf = Buffer.from(b.padEnd(256));
  return timingSafeEqual(aBuf, bBuf) && a.length === b.length;
}

export function hasBearerSecret(request: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  const authHeader = request.headers.get("authorization") ?? "";
  return safeCompare(authHeader, `Bearer ${secret}`);
}

export function hasCronSecret(request: Request): boolean {
  return hasBearerSecret(request, process.env.CRON_SECRET);
}

export function hasAdminSecret(request: Request): boolean {
  return hasBearerSecret(
    request,
    process.env.ADMIN_SECRET ?? process.env.CRON_SECRET
  );
}

function getAdminSecret(): string | undefined {
  return process.env.ADMIN_SECRET ?? process.env.CRON_SECRET;
}

function signAdminSession(exp: number, secret: string): string {
  return createHmac("sha256", secret).update(String(exp)).digest("base64url");
}

export function createAdminSessionToken(now = Date.now()): string | null {
  const secret = getAdminSecret();
  if (!secret) return null;

  const exp = Math.floor(now / 1000) + ADMIN_SESSION_TTL_SECONDS;
  const sig = signAdminSession(exp, secret);
  return `${exp}.${sig}`;
}

export function verifyAdminSessionToken(token: string | undefined, now = Date.now()): boolean {
  const secret = getAdminSecret();
  if (!secret || !token) return false;

  const [expRaw, sig] = token.split(".");
  if (!expRaw || !sig) return false;

  const exp = Number(expRaw);
  if (!Number.isInteger(exp) || exp <= Math.floor(now / 1000)) return false;

  const expected = signAdminSession(exp, secret);
  return safeCompare(sig, expected);
}

export function adminSessionMaxAgeSeconds(): number {
  return ADMIN_SESSION_TTL_SECONDS;
}
