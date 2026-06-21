import { redis } from "@/lib/redis";

const BALANCE_SYNC_LIMIT_PER_USER = 5; // calls per hour
const BALANCE_SYNC_COOLDOWN_HOURS = 12; // min hours between syncs
const BALANCE_SYNC_LIMIT_PER_IP = 20; // safety net per IP

/**
 * Rate limit balance/sync endpoint
 * - 5 calls/hour per authenticated user
 * - 12h min cooldown per user (prevent sync abuse)
 * - 20 calls/hour per IP (backup safety)
 */
export async function checkBalanceSyncLimit(
  userId: string,
  ip: string
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const now = Date.now();
  const userKey = `ratelimit:balance:sync:${userId}`;
  const ipKey = `ratelimit:balance:sync:ip:${ip}`;
  const cooldownKey = `ratelimit:balance:sync:cooldown:${userId}`;

  // Check per-user cooldown (12 hours)
  const lastSyncTime = await redis.get<number>(cooldownKey);
  if (lastSyncTime) {
    const hoursSinceLastSync = (now - lastSyncTime) / (1000 * 60 * 60);
    if (hoursSinceLastSync < BALANCE_SYNC_COOLDOWN_HOURS) {
      const remainingSeconds = Math.ceil(
        (BALANCE_SYNC_COOLDOWN_HOURS - hoursSinceLastSync) * 3600
      );
      return { allowed: false, retryAfterSeconds: remainingSeconds };
    }
  }

  // Check per-user hourly limit (5 calls)
  const userCount = (await redis.incr(userKey)) || 1;
  if (userCount === 1) {
    await redis.expire(userKey, 3600); // Reset every hour
  }
  if (userCount > BALANCE_SYNC_LIMIT_PER_USER) {
    return { allowed: false, retryAfterSeconds: 3600 };
  }

  // Check per-IP backup limit (20 calls)
  const ipCount = (await redis.incr(ipKey)) || 1;
  if (ipCount === 1) {
    await redis.expire(ipKey, 3600);
  }
  if (ipCount > BALANCE_SYNC_LIMIT_PER_IP) {
    return { allowed: false, retryAfterSeconds: 3600 };
  }

  // Allowed: set cooldown
  await redis.set(cooldownKey, now, { ex: BALANCE_SYNC_COOLDOWN_HOURS * 3600 });

  return { allowed: true };
}
