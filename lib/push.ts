import "server-only";
import { redis } from "./redis";
import webpush from "web-push";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PushSubscriptionRecord {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// ─── Redis key ──────────────────────────────────────────────────────────────

const PUSH_SUBS_KEY = "keza:push:subscriptions";

// ─── VAPID setup ────────────────────────────────────────────────────────────

function setupVapid(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL ?? "mailto:contact@keza.app";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(email, publicKey, privateKey);
  return true;
}

// ─── Subscription storage ───────────────────────────────────────────────────

/** Persist a push subscription from the browser. Deduplicates by endpoint. */
export async function savePushSubscription(sub: PushSubscriptionRecord): Promise<void> {
  await redis.sadd(PUSH_SUBS_KEY, JSON.stringify(sub));
}

/** Retrieve all stored push subscriptions. */
export async function getPushSubscriptions(): Promise<PushSubscriptionRecord[]> {
  const raw = await redis.smembers(PUSH_SUBS_KEY);
  const subs: PushSubscriptionRecord[] = [];
  for (const item of raw) {
    try {
      subs.push(JSON.parse(item as string) as PushSubscriptionRecord);
    } catch {
      // Skip malformed entries
    }
  }
  return subs;
}

/** Remove a subscription that is no longer valid (endpoint gone). */
export async function removePushSubscription(endpoint: string): Promise<void> {
  const subs = await getPushSubscriptions();
  const toRemove = subs.find((s) => s.endpoint === endpoint);
  if (toRemove) {
    await redis.srem(PUSH_SUBS_KEY, JSON.stringify(toRemove));
  }
}

// ─── Send notifications ──────────────────────────────────────────────────────

export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

// ─── Per-email Redis keys ────────────────────────────────────────────────────

const PUSH_SUBS_EMAIL_KEY = (email: string) => `keza:push:subs:${email.toLowerCase()}`;
const PUSH_SUBS_TTL = 90 * 24 * 60 * 60; // 90 days in seconds

/** Save a push subscription for a specific email. TTL 90 days. */
export async function savePushSubscriptionForEmail(email: string, sub: PushSubscriptionRecord): Promise<void> {
  const key = PUSH_SUBS_EMAIL_KEY(email);
  await redis.sadd(key, JSON.stringify(sub));
  await redis.expire(key, PUSH_SUBS_TTL);
}

/** Get all push subscriptions for a specific email. */
export async function getPushSubscriptionsForEmail(email: string): Promise<PushSubscriptionRecord[]> {
  const raw = await redis.smembers(PUSH_SUBS_EMAIL_KEY(email));
  const subs: PushSubscriptionRecord[] = [];
  for (const item of raw) {
    try {
      subs.push(JSON.parse(item as string) as PushSubscriptionRecord);
    } catch {
      // Skip malformed entries
    }
  }
  return subs;
}

/** Remove a specific subscription by endpoint for a specific email. */
export async function removePushSubscriptionForEmail(email: string, endpoint: string): Promise<void> {
  const subs = await getPushSubscriptionsForEmail(email);
  const toRemove = subs.find((s) => s.endpoint === endpoint);
  if (toRemove) {
    await redis.srem(PUSH_SUBS_EMAIL_KEY(email), JSON.stringify(toRemove));
  }
}

/**
 * Send a push notification to all subscriptions for a specific email.
 * Auto-removes invalid subscriptions (410/404).
 * Returns number of successful sends.
 */
export async function sendPushToEmail(email: string, payload: PushPayload): Promise<number> {
  const subs = await getPushSubscriptionsForEmail(email);
  if (subs.length === 0) return 0;

  const configured = setupVapid();
  if (!configured) return 0;

  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        sub as Parameters<typeof webpush.sendNotification>[0],
        JSON.stringify(payload),
        { TTL: 86400 }
      );
      sent++;
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 410 || status === 404) {
        await removePushSubscriptionForEmail(email, sub.endpoint).catch(() => {});
      } else {
        console.error("[push] sendPushToEmail failed:", (err as Error).message);
      }
    }
  }

  return sent;
}

/**
 * @deprecated Use sendPushToEmail(email, payload) for targeted delivery.
 * Send a push notification to all stored subscriptions.
 * Invalid subscriptions (gone endpoints) are automatically removed.
 * Returns number of successful sends.
 */
export async function sendPushToAll(payload: PushPayload): Promise<number> {
  const subs = await getPushSubscriptions();
  if (subs.length === 0) return 0;

  const configured = setupVapid();
  if (!configured) return 0;

  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        sub as Parameters<typeof webpush.sendNotification>[0],
        JSON.stringify(payload),
        { TTL: 86400 }
      );
      sent++;
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 410 || status === 404) {
        await removePushSubscription(sub.endpoint).catch(() => {});
      } else {
        console.error("[push] sendNotification failed:", (err as Error).message);
      }
    }
  }

  return sent;
}
