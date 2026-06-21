/**
 * KEZA × Lemon Squeezy — subscription management
 * Docs: https://docs.lemonsqueezy.com/api
 */

import crypto from "crypto";
import { z } from "zod";
import { redis } from "@/lib/redis";
import * as Sentry from "@sentry/nextjs";

// ── Redis keys ────────────────────────────────────────────────────────────────
const PRO_KEY = (email: string) => `keza:pro:${email.toLowerCase()}`;
const TRIAL_KEY = (email: string) => `keza:pro:trial:${email.toLowerCase()}`;
const TRIAL_DURATION_DAYS = 7;

interface TrialStatus {
  createdAt: string;
  expiresAt: string;
}

// ── Env helpers ───────────────────────────────────────────────────────────────
function getApiKey() {
  return process.env.LEMONSQUEEZY_API_KEY ?? "";
}
function getStoreId() {
  return process.env.LEMONSQUEEZY_STORE_ID ?? "";
}
function getVariantId() {
  return process.env.LEMONSQUEEZY_VARIANT_ID ?? "";
}
function getWebhookSecret() {
  return process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "";
}

// ── Pro status (Redis) ────────────────────────────────────────────────────────

/** Returns true if the email has an active Pro subscription. */
export async function isProUser(email: string): Promise<boolean> {
  try {
    const val = await redis.get(PRO_KEY(email));
    return val !== null && val !== "cancelled";
  } catch {
    return false; // fail open — never block a user because of Redis
  }
}

/** Persist Pro status after successful payment. */
export async function grantPro(email: string, subscriptionId: string): Promise<void> {
  await redis.set(PRO_KEY(email), subscriptionId);
}

/** Remove Pro status on cancellation / expiry. */
export async function revokePro(email: string): Promise<void> {
  await redis.set(PRO_KEY(email), "cancelled");
}

// ── Trial management (7-day free trial) ────────────────────────────────────────

/** Grant trial to new users, only once per email */
export async function grantTrialIfNew(email: string): Promise<boolean> {
  try {
    const now = new Date();
    const existingTrial = await redis.get<TrialStatus>(TRIAL_KEY(email));

    // Check if trial exists AND has not yet expired
    if (existingTrial !== null && new Date(existingTrial.expiresAt) > now) {
      return false; // Already has a valid (non-expired) trial
    }

    // If trial is expired, delete it and grant a new one
    if (existingTrial !== null && new Date(existingTrial.expiresAt) <= now) {
      await redis.del(TRIAL_KEY(email.toLowerCase()));
    }

    const expiresAt = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
    const status: TrialStatus = {
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
    const lowerEmail = email.toLowerCase();
    await redis.set(TRIAL_KEY(lowerEmail), JSON.stringify(status));
    await redis.sadd("keza:trial:pending_reminders", lowerEmail);
    return true;
  } catch {
    return false; // fail open
  }
}

/** Get trial status for a user */
export async function getTrialStatus(email: string): Promise<TrialStatus | null> {
  try {
    const trial = await redis.get<TrialStatus>(TRIAL_KEY(email));
    if (!trial) return null;
    return trial;
  } catch {
    return null; // fail open
  }
}

/** Check if user has access to Pro features (either via trial OR paid subscription) */
export async function hasProAccess(email: string): Promise<boolean> {
  try {
    // Check if user has active Pro subscription
    const isPro = await isProUser(email);
    if (isPro) return true;

    // Check if user has active trial
    const trial = await getTrialStatus(email);
    if (!trial) return false;

    const expiresAt = new Date(trial.expiresAt);
    const now = new Date();
    return expiresAt > now; // trial is still valid
  } catch {
    return false; // fail open — deny access if Redis fails
  }
}

/** Check if user needs a trial expiry reminder */
export async function needsTrialReminder(email: string): Promise<boolean> {
  try {
    const trial = await getTrialStatus(email);
    if (!trial) return false;

    // Get configurable reminder days from Redis (default: 1)
    const reminderDaysBeforeStr = await redis.get<string>("keza:config:trial_reminder_days_before_expiry");
    const reminderDaysBefore = parseInt(reminderDaysBeforeStr ?? "1", 10);

    const expiresAt = new Date(trial.expiresAt);
    const now = new Date();
    const millisecondsUntilExpiry = expiresAt.getTime() - now.getTime();
    const daysUntilExpiry = millisecondsUntilExpiry / (24 * 60 * 60 * 1000);
    return daysUntilExpiry <= reminderDaysBefore && daysUntilExpiry > 0;
  } catch {
    return false; // fail open
  }
}

/** Revoke trial for a user */
export async function revokeTrial(email: string): Promise<void> {
  try {
    await redis.del(TRIAL_KEY(email));
  } catch {
    // fail open
  }
}

// ── Checkout ──────────────────────────────────────────────────────────────────

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://keza-taupe.vercel.app";

/**
 * Create a hosted checkout URL for KEZA Pro.
 * Docs: https://docs.lemonsqueezy.com/api/checkouts/create-checkout
 */
export async function createCheckoutUrl(email: string): Promise<string> {
  const apiKey = getApiKey();
  const storeId = getStoreId();
  const variantId = getVariantId();

  if (!apiKey || !storeId || !variantId) {
    throw new Error("Lemon Squeezy env vars not configured");
  }

  const body = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          email,
          custom: { keza_email: email },
        },
        product_options: {
          redirect_url: `${BASE_URL}/pro?upgraded=1`,
          receipt_link_url: `${BASE_URL}/alertes`,
          receipt_thank_you_note: "Bienvenue dans KEZA Pro ! Vos alertes illimitées sont maintenant actives.",
        },
      },
      relationships: {
        store: { data: { type: "stores", id: storeId } },
        variant: { data: { type: "variants", id: variantId } },
      },
    },
  };

  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();

    // Capture full context in Sentry
    Sentry.withScope((scope) => {
      scope.setTag("api", "lemonsqueezy");
      scope.setContext("lemon_squeezy_error", {
        email,
        status: res.status,
        body: text,
      });
      Sentry.captureMessage(
        `Lemon Squeezy checkout failed: ${res.status}`,
        "error"
      );
    });

    throw new Error(`Lemon Squeezy checkout failed: ${res.status} ${text}`);
  }

  const json = await res.json() as { data: { attributes: { url: string } } };
  return json.data.attributes.url;
}

// ── Webhook signature verification ───────────────────────────────────────────

/**
 * Verify the X-Signature header from Lemon Squeezy.
 * Returns true if the signature is valid.
 */
export function verifyLemonWebhook(rawBody: string, signature: string): boolean {
  const secret = getWebhookSecret();
  if (!secret) return false;
  try {
    const hmac = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ── Webhook event types ───────────────────────────────────────────────────────

export type LemonEventName =
  | "subscription_created"
  | "subscription_updated"
  | "subscription_cancelled"
  | "subscription_expired"
  | "subscription_resumed"
  | "subscription_paused";

export interface LemonWebhookPayload {
  meta: {
    event_name: LemonEventName;
    custom_data?: { keza_email?: string };
  };
  data: {
    id: string;
    attributes: {
      user_email: string;
      status: string; // "active" | "cancelled" | "expired" | "paused" | "past_due"
      ends_at: string | null;
    };
  };
}

export const lemonWebhookPayloadSchema = z.object({
  meta: z.object({
    event_name: z.enum(["subscription_created", "subscription_updated", "subscription_cancelled", "subscription_expired", "subscription_resumed", "subscription_paused"]),
    custom_data: z.object({ keza_email: z.string().email() }).optional(),
  }),
  data: z.object({
    id: z.string().min(1),
    attributes: z.object({
      user_email: z.string().email(),
      status: z.enum(["active", "cancelled", "expired", "paused", "past_due"]),
      ends_at: z.string().nullable(),
    }),
  }),
});

// ── Subscription event logging ────────────────────────────────────────────────

/**
 * Log Pro subscription events to Sentry for business analytics.
 * Events: created, updated, cancelled, expired
 */
export function logSubscriptionEvent(
  event: "created" | "updated" | "cancelled" | "expired",
  email: string,
  _details?: Record<string, unknown>
): void {
  const message = `Pro subscription event: ${event} (${email})`;

  // Log to Sentry as INFO level (not an error)
  Sentry.captureMessage(message, "info");
}
