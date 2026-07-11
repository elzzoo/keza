import { redis } from "@/lib/redis";
import { randomUUID } from "crypto";

export interface UserAlert {
  id: string;
  userId: string;
  from: string;
  to: string;
  priceThreshold: number;
  createdAt: Date;
  active: boolean;
}

/**
 * Generate a unique ID for an alert
 */
function generateId(): string {
  return `alt_${randomUUID().replace(/-/g, "")}`;
}

/**
 * Create a new alert subscription for a user
 * @param params Alert parameters including userId, route, and price threshold
 * @returns The created alert object
 */
export async function createAlert(params: {
  userId: string;
  from: string;
  to: string;
  priceThreshold: number;
}): Promise<UserAlert> {
  const id = generateId();
  const alert: UserAlert = {
    id,
    userId: params.userId,
    from: params.from,
    to: params.to,
    priceThreshold: params.priceThreshold,
    createdAt: new Date(),
    active: true,
  };

  // Store in Redis: alert:{userId}:{route}:{id}
  const key = `alert:${params.userId}:${params.from}-${params.to}:${id}`;
  await redis.set(key, JSON.stringify(alert), { ex: 90 * 24 * 60 * 60 }); // 90 day TTL

  return alert;
}

/**
 * Get all active alerts for a user
 * @param userId The user ID
 * @returns Array of alerts for the user
 */
export async function getAlerts(userId: string): Promise<UserAlert[]> {
  const pattern = `alert:${userId}:*`;
  const keys = await redis.keys(pattern);

  const alerts: UserAlert[] = [];
  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      alerts.push(JSON.parse(data as string));
    }
  }
  return alerts;
}

/**
 * Delete an alert subscription
 * @param userId The user ID
 * @param alertId The alert ID to delete
 */
export async function deleteAlert(userId: string, alertId: string): Promise<void> {
  const pattern = `alert:${userId}:*:${alertId}`;
  const keys = await redis.keys(pattern);

  for (const key of keys) {
    await redis.del(key);
  }
}
