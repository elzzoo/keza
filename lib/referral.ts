/**
 * KEZA Referral Program
 *
 * Flow:
 * 1. User visits /alertes → gets a unique referral link (?ref=CODE)
 * 2. Friend visits KEZA with ?ref=CODE → cookie is set
 * 3. Friend creates first alert → referrer earns +1 alert credit
 * 4. Referrer receives email notification
 * 5. Credit is applied: effective free limit = 3 + credits
 */

import crypto from "crypto";
import { redis } from "@/lib/redis";
import { Resend } from "resend";

// ── Redis keys ────────────────────────────────────────────────────────────────
const REF_CODE_KEY = (email: string) => `keza:ref:code:${email.toLowerCase()}`;
const REF_EMAIL_KEY = (code: string) => `keza:ref:email:${code}`;
const REF_CREDITS_KEY = (email: string) => `keza:ref:credits:${email.toLowerCase()}`;
const REF_CONVERTS_KEY = (email: string) => `keza:ref:converts:${email.toLowerCase()}`;
// Track which emails have already been counted as referral conversions (avoid double-credit)
const REF_CONVERTED_KEY = (email: string) => `keza:ref:converted:${email.toLowerCase()}`;

export const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://keza-taupe.vercel.app";

// ── Code generation ───────────────────────────────────────────────────────────

/** Returns the existing referral code for an email, or creates one. */
export async function getOrCreateReferralCode(email: string): Promise<string> {
  const existing = await redis.get(REF_CODE_KEY(email));
  if (existing) return existing as string;

  // Generate 8-char alphanumeric code from email hash
  const code = crypto
    .createHash("sha256")
    .update(email.toLowerCase() + (process.env.HMAC_SECRET ?? "keza"))
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();

  await redis.set(REF_CODE_KEY(email), code);
  await redis.set(REF_EMAIL_KEY(code), email.toLowerCase());
  return code;
}

/** Resolve a referral code → referrer email, or null if invalid. */
export async function resolveReferralCode(code: string): Promise<string | null> {
  const email = await redis.get(REF_EMAIL_KEY(code));
  return email ? String(email) : null;
}

// ── Credits ───────────────────────────────────────────────────────────────────

/** Number of bonus alert slots earned via referrals. */
export async function getReferralCredits(email: string): Promise<number> {
  try {
    const val = await redis.get(REF_CREDITS_KEY(email));
    return val ? parseInt(String(val), 10) : 0;
  } catch {
    return 0;
  }
}

/** Number of successful referral conversions. */
export async function getReferralConversions(email: string): Promise<number> {
  try {
    const val = await redis.get(REF_CONVERTS_KEY(email));
    return val ? parseInt(String(val), 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Process a referral conversion: called when a new user creates their first alert.
 * - Checks if the referred email has already been counted (idempotent)
 * - Credits the referrer +1 alert slot
 * - Sends email notification to referrer
 */
export async function processReferralConversion(
  referredEmail: string,
  referralCode: string
): Promise<void> {
  try {
    // Idempotency: only credit once per referred email
    const alreadyConverted = await redis.get(REF_CONVERTED_KEY(referredEmail));
    if (alreadyConverted) return;

    const referrerEmail = await resolveReferralCode(referralCode);
    if (!referrerEmail) return;

    // Don't credit self-referral
    if (referrerEmail.toLowerCase() === referredEmail.toLowerCase()) return;

    // Mark as converted
    await redis.set(REF_CONVERTED_KEY(referredEmail), referrerEmail);

    // Increment credits and conversion count for referrer
    await redis.incr(REF_CREDITS_KEY(referrerEmail));
    await redis.incr(REF_CONVERTS_KEY(referrerEmail));

    // Send notification email (fire-and-forget)
    sendReferralNotificationEmail(referrerEmail, referredEmail).catch(() => {});
  } catch {
    // Never crash alert creation because of referral logic
  }
}

// ── Email ─────────────────────────────────────────────────────────────────────

async function sendReferralNotificationEmail(
  referrerEmail: string,
  referredEmail: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const resend = new Resend(apiKey);
  const fromDomain = process.env.RESEND_FROM_DOMAIN ?? "keza-taupe.vercel.app";
  const fromAddress = `KEZA <noreply@${fromDomain}>`;

  const maskedEmail = referredEmail.replace(/(.{2}).*(@.*)/, "$1***$2");

  await resend.emails.send({
    from: fromAddress,
    to: referrerEmail,
    subject: "🎉 Ton ami a rejoint KEZA — +1 alerte débloquée !",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#f1f5f9;background:#0f172a;padding:32px;border-radius:12px">
        <h1 style="font-size:24px;font-weight:900;margin:0 0 8px">
          <span style="color:#3b82f6">KE</span>ZA
        </h1>
        <h2 style="font-size:18px;font-weight:700;margin:24px 0 8px">
          🎉 Ton ami a rejoint KEZA !
        </h2>
        <p style="color:#94a3b8;font-size:14px;line-height:1.6">
          <strong style="color:#f1f5f9">${maskedEmail}</strong> vient de créer sa première alerte prix grâce à ton lien de parrainage.
        </p>
        <div style="background:#1e293b;border-radius:8px;padding:16px;margin:20px 0;text-align:center">
          <p style="color:#94a3b8;font-size:12px;margin:0 0 4px">Ton bonus</p>
          <p style="color:#3b82f6;font-size:24px;font-weight:900;margin:0">+1 alerte débloquée</p>
          <p style="color:#94a3b8;font-size:12px;margin:4px 0 0">Automatiquement appliqué sur ton compte</p>
        </div>
        <p style="color:#64748b;font-size:12px;margin-top:24px">
          Continue à partager ton lien pour débloquer encore plus d'alertes gratuites.
        </p>
      </div>
    `,
  });
}
