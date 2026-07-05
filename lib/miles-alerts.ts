import "server-only";
import { redis } from "./redis";

export interface MilesAlert {
  email: string;
  route: string;           // "SIN-LAX"
  program: string;         // "Singapore KrisFlyer"
  thresholdCpp: number;    // 0.8
  createdAt: number;       // unix timestamp
  lastFiredAt?: number;    // unix timestamp or undefined
}

const MILES_ALERT_TTL = 365 * 24 * 60 * 60; // 1 year in seconds
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Generates the Redis key for a miles alert
 */
function getMilesAlertKey(email: string, route: string, program: string): string {
  return `keza:miles-alert:${email}:${route}:${program}`;
}

/**
 * Creates a new miles alert in Redis with a 1-year TTL
 */
export async function createMilesAlert(
  alert: Omit<MilesAlert, "createdAt">
): Promise<void> {
  const key = getMilesAlertKey(alert.email, alert.route, alert.program);
  const now = Date.now();

  const storableAlert: MilesAlert = {
    ...alert,
    createdAt: now,
  };

  await redis.set(key, storableAlert, { ex: MILES_ALERT_TTL });
}

/**
 * Retrieves all miles alerts for a given email
 */
export async function getMilesAlertsByEmail(email: string): Promise<MilesAlert[]> {
  const pattern = `keza:miles-alert:${email}:*`;
  const keys = await redis.keys(pattern);

  if (keys.length === 0) {
    return [];
  }

  const alerts: MilesAlert[] = [];

  for (const key of keys) {
    const alert = await redis.get<MilesAlert>(key);
    if (alert) {
      alerts.push(alert);
    }
  }

  return alerts;
}

/**
 * Deactivates (deletes) a miles alert by its key
 */
export async function deactivateMilesAlert(alertKey: string): Promise<void> {
  await redis.del(alertKey);
}

/**
 * Checks if an alert should fire based on its cooldown period
 * Returns true if:
 * 1. Alert has never been fired (no lastFiredAt), OR
 * 2. More than 24 hours have passed since lastFiredAt
 */
export async function shouldFireAlert(alert: MilesAlert, now: number): Promise<boolean> {
  // Never fired before
  if (!alert.lastFiredAt) {
    return true;
  }

  // Check if 24 hours have passed
  const timeSinceLastFire = now - alert.lastFiredAt;
  return timeSinceLastFire >= COOLDOWN_MS;
}

/**
 * Updates the lastFiredAt timestamp for a miles alert
 */
export async function updateAlertLastFired(
  email: string,
  route: string,
  program: string,
  now: number
): Promise<void> {
  const key = getMilesAlertKey(email, route, program);

  // Fetch the current alert
  const alert = await redis.get<MilesAlert>(key);

  if (!alert) {
    // Alert not found, nothing to update
    return;
  }

  // Update the lastFiredAt timestamp
  const updatedAlert: MilesAlert = {
    ...alert,
    lastFiredAt: now,
  };

  await redis.set(key, updatedAlert, { ex: MILES_ALERT_TTL });
}
