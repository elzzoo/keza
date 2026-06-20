export type CabinType = "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";

export interface SeatAlertSubscription {
  email: string;
  route: string;                    // "SIN-LAX"
  cabin: CabinType;
  minPrice: number;                 // USD
  createdAt: Date;
  expiresAt: Date;
  id?: string;                      // UUID
}

export interface SeatAlertDeal {
  route: string;
  cabin: CabinType;
  currentPrice: number;
  historicalAvg: number;
  discount: number;                 // percentage
  timestamp: Date;
  premium_cabin_available?: boolean; // extra trigger
}

export function validateSeatAlert(alert: unknown): alert is SeatAlertSubscription {
  if (!alert || typeof alert !== "object") return false;
  const a = alert as Record<string, unknown>;
  return (
    typeof a.email === "string" &&
    typeof a.route === "string" &&
    ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"].includes(a.cabin as string) &&
    typeof a.minPrice === "number" &&
    a.minPrice > 0 &&
    a.createdAt instanceof Date &&
    a.expiresAt instanceof Date &&
    a.expiresAt > a.createdAt
  );
}

// Redis functions
import { redis } from "@/lib/redis";
import {
  SEAT_ALERT_KEY,
  SEAT_ALERT_INDEX,
  SEAT_ALERT_ROUTE_INDEX,
} from "@/lib/redisKeys";
import { v4 as uuidv4 } from "uuid";

const SEAT_ALERT_TTL = 90 * 24 * 60 * 60; // 90 days in seconds

export async function saveSeatAlert(alert: SeatAlertSubscription): Promise<string> {
  const id = alert.id || uuidv4();
  const key = SEAT_ALERT_KEY(alert.email, alert.route, alert.cabin);

  // Store alert with TTL
  await redis.set(key, JSON.stringify({ ...alert, id }), { ex: SEAT_ALERT_TTL });

  // Add to user's alert index
  await redis.sadd(SEAT_ALERT_INDEX(alert.email), `${alert.route}:${alert.cabin}`);

  // Add to route's alert index for cron processing
  await redis.sadd(SEAT_ALERT_ROUTE_INDEX(alert.route, alert.cabin), alert.email);

  return id;
}

export async function getSeatAlert(
  email: string,
  route: string,
  cabin: CabinType
): Promise<SeatAlertSubscription | null> {
  const key = SEAT_ALERT_KEY(email, route, cabin);
  const data = await redis.get<string>(key);
  if (!data) return null;
  try {
    return JSON.parse(data) as SeatAlertSubscription;
  } catch {
    return null;
  }
}

export async function deleteSeatAlert(
  email: string,
  route: string,
  cabin: CabinType
): Promise<void> {
  const key = SEAT_ALERT_KEY(email, route, cabin);
  await redis.del(key);
  await redis.srem(SEAT_ALERT_INDEX(email), `${route}:${cabin}`);
  await redis.srem(SEAT_ALERT_ROUTE_INDEX(route, cabin), email);
}

export async function getAllAlertsForEmail(email: string): Promise<SeatAlertSubscription[]> {
  const indexKey = SEAT_ALERT_INDEX(email);
  const pairs = await redis.smembers<string>(indexKey);

  // Build keys for batch fetch
  const validPairs: Array<{ route: string; cabin: CabinType }> = [];
  const keys: string[] = [];

  for (const pair of pairs) {
    const parts = pair.split(":");
    if (parts.length === 2) {
      const [route, cabin] = parts;
      validPairs.push({ route, cabin: cabin as CabinType });
      keys.push(SEAT_ALERT_KEY(email, route, cabin));
    }
  }

  if (keys.length === 0) return [];

  // Batch fetch all alerts
  const data = await redis.mget<string>(...keys);
  const alerts: SeatAlertSubscription[] = [];

  for (let i = 0; i < data.length; i++) {
    if (data[i]) {
      try {
        const alert = JSON.parse(data[i]) as SeatAlertSubscription;
        alerts.push(alert);
      } catch {
        // Skip corrupted entries
      }
    }
  }

  return alerts;
}

export async function getAllAlertsForRoute(
  route: string,
  cabin: CabinType
): Promise<SeatAlertSubscription[]> {
  const indexKey = SEAT_ALERT_ROUTE_INDEX(route, cabin);
  const emails = await redis.smembers<string>(indexKey);

  // Build keys for batch fetch
  const keys = emails.map((email) => SEAT_ALERT_KEY(email, route, cabin));

  if (keys.length === 0) return [];

  // Batch fetch all alerts
  const data = await redis.mget<string>(...keys);
  const alerts: SeatAlertSubscription[] = [];

  for (const item of data) {
    if (item) {
      try {
        const alert = JSON.parse(item) as SeatAlertSubscription;
        alerts.push(alert);
      } catch {
        // Skip corrupted entries
      }
    }
  }

  return alerts;
}
