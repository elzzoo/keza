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
  const pairs = (await redis.smembers(indexKey)) as string[];

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
  const data = (await redis.mget(...keys)) as (string | null)[];
  const alerts: SeatAlertSubscription[] = [];

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (item !== null) {
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

export async function getAllAlertsForRoute(
  route: string,
  cabin: CabinType
): Promise<SeatAlertSubscription[]> {
  const indexKey = SEAT_ALERT_ROUTE_INDEX(route, cabin);
  const emails = (await redis.smembers(indexKey)) as string[];

  // Build keys for batch fetch
  const keys = emails.map((email) => SEAT_ALERT_KEY(email, route, cabin));

  if (keys.length === 0) return [];

  // Batch fetch all alerts
  const data = (await redis.mget(...keys)) as (string | null)[];
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

// ─── Deal detection functions ────────────────────────────────────────────────

import { getPriceHistory } from "@/lib/priceHistoryRedis";
import { fetchCalendarPrices } from "@/lib/engine/travelpayouts";
import { CABIN_MULTIPLIERS } from "@/lib/dynamicAwardEngine";

// Map uppercase cabin types to lowercase multiplier keys
const CABIN_MULTIPLIER_MAP: Record<CabinType, keyof typeof CABIN_MULTIPLIERS> =
  {
    ECONOMY: "economy",
    PREMIUM_ECONOMY: "premium_economy",
    BUSINESS: "business",
    FIRST: "first",
  };

export async function detectDeal(
  route: string,
  cabin: CabinType,
  currentPrice: number
): Promise<SeatAlertDeal | null> {
  const [from, to] = route.split("-");
  if (!from || !to) return null;

  // Fetch historical average (last 30 days)
  const history = await getPriceHistory(from, to);
  if (!history || history.length < 5) return null; // Need minimum data

  const historicalAvg =
    history.reduce((sum, p) => sum + p.price, 0) / history.length;

  // Apply cabin multiplier to compare apples-to-apples
  const cabinMultiplierKey = CABIN_MULTIPLIER_MAP[cabin];
  const cabinMultiplier = CABIN_MULTIPLIERS[cabinMultiplierKey] ?? 1.0;
  const adjustedHistorical = historicalAvg * cabinMultiplier;

  // Deal: price < 80% of historical average
  const dealThreshold = adjustedHistorical * 0.8;
  const isDeal = currentPrice < dealThreshold;

  if (!isDeal) return null;

  return {
    route,
    cabin,
    currentPrice,
    historicalAvg: adjustedHistorical,
    discount: ((adjustedHistorical - currentPrice) / adjustedHistorical) * 100,
    timestamp: new Date(),
  };
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function getAllActiveRouteCabinPairs(): Promise<
  Array<{ route: string; cabin: CabinType }>
> {
  const pairs: Array<{ route: string; cabin: CabinType }> = [];

  try {
    // Scan for all SEAT_ALERT_ROUTE_INDEX keys
    // Pattern: keza:setalerts:route:ROUTE:CABIN
    let cursor = "0";
    const pattern = "keza:setalerts:route:*";

    do {
      let nextCursor = cursor;
      let keys: string[] = [];

      try {
        const result = await redis.scan(cursor, { match: pattern });
        [nextCursor, keys] = [result[0], result[1] as string[]];
      } catch {
        // Log scan error but continue with next iteration
        break;
      }

      for (const key of keys) {
        // Parse key: keza:setalerts:route:ROUTE:CABIN
        const parts = key.split(":");
        if (parts.length >= 5) {
          // Join middle parts in case route has colons (unlikely but safe)
          const route = parts.slice(3, -1).join(":");
          const cabin = parts[parts.length - 1];

          if (
            ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"].includes(
              cabin
            )
          ) {
            pairs.push({
              route,
              cabin: cabin as CabinType,
            });
          }
        }
      }

      cursor = nextCursor;
    } while (cursor !== "0");
  } catch {
    // Return empty array on error
    return [];
  }

  return pairs;
}

export async function processAllSeatAlerts(): Promise<{
  checked: number;
  notified: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let checked = 0;
  let notified = 0;

  // Get all unique (route, cabin) pairs with active alerts
  const routeCabinPairs = await getAllActiveRouteCabinPairs();

  for (const { route, cabin } of routeCabinPairs) {
    try {
      // Fetch current price for this cabin
      const [from, to] = route.split("-");
      if (!from || !to) continue;

      // Get current month for price search
      const month = getCurrentMonth();

      // Search the route for calendar prices
      const prices = await fetchCalendarPrices(from, to, month).catch(() => []);

      if (!prices.length) continue;

      // Find minimum price
      const minPrice = Math.min(...prices.map((p) => p.price));

      // Check for deals - detectDeal will apply cabin multiplier internally
      const deal = await detectDeal(route, cabin, minPrice);

      if (deal) {
        // Send notifications to all subscribers for this route/cabin
        const subscribers = await getAllAlertsForRoute(route, cabin);

        // Apply cabin multiplier for subscriber comparison
        const cabinMultiplierKey = CABIN_MULTIPLIER_MAP[cabin];
        const cabinMultiplier = CABIN_MULTIPLIERS[cabinMultiplierKey] ?? 1.0;
        const adjustedPrice = Math.round(minPrice * cabinMultiplier);

        for (const subscriber of subscribers) {
          checked++;

          try {
            // Check if deal meets subscriber's minPrice threshold
            if (subscriber.minPrice > 0 && adjustedPrice <= subscriber.minPrice) {
              const emailSent = await sendSeatAlertEmail(
                subscriber.email,
                route,
                cabin,
                adjustedPrice,
                subscriber.minPrice
              );
              if (emailSent) {
                notified++;
              }
            }
          } catch (err) {
            errors.push(
              `Error notifying ${subscriber.email} for ${route}-${cabin}: ${String(err)}`
            );
          }
        }
      }
    } catch (err) {
      errors.push(
        `Error processing ${route}-${cabin}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  return { checked, notified, errors };
}

// ── Email notifications (via Resend) ──────────────────────────────────────────

import { Resend } from "resend";
import { airportsMap } from "@/data/airports";
import { logError } from "@/lib/logger";

const resend = new Resend(process.env.RESEND_API_KEY);
const SENDER_EMAIL = process.env.KEZA_EMAIL_SENDER || "alerts@keza.app";

/**
 * Send seat alert email notification to a subscriber
 */
export async function sendSeatAlertEmail(
  email: string,
  route: string,
  cabin: CabinType,
  currentPrice: number,
  subscribedPrice: number
): Promise<boolean> {
  try {
    const [from, to] = route.split("-");
    const fromAirport = airportsMap[from];
    const toAirport = airportsMap[to];

    const fromCity = fromAirport?.city || from;
    const toCity = toAirport?.city || to;
    const cabinLabel = {
      ECONOMY: "Economy",
      PREMIUM_ECONOMY: "Premium Economy",
      BUSINESS: "Business",
      FIRST: "First Class",
    }[cabin] || cabin;

    const savings = subscribedPrice - currentPrice;
    const savingsPercent = Math.round((savings / subscribedPrice) * 100);

    const subject = `🎯 Alert: ${from} → ${to} ${cabinLabel} now $${currentPrice}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; }
    .price { font-size: 48px; font-weight: bold; }
    .savings { background: #dcfce7; color: #166534; padding: 10px 20px; border-radius: 4px; display: inline-block; margin-top: 10px; }
    .cta { background: #667eea; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; display: inline-block; margin-top: 20px; }
    .footer { color: #999; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✈️ Great Deal Found!</h1>
      <div class="price">$${currentPrice}</div>
      <p>${fromCity} → ${toCity} • ${cabinLabel}</p>
      <div class="savings">Save $${savings} (${savingsPercent}%)</div>
    </div>

    <p style="margin-top: 20px;">Your alert for ${fromCity} to ${toCity} found a great deal!</p>
    <p>You set your alert at <strong>$${subscribedPrice}</strong> and flights are now available at <strong>$${currentPrice}</strong>.</p>

    <center>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://keza.app"}/flights/${route}" class="cta">
        View Flights →
      </a>
    </center>

    <div class="footer">
      <p>This is an automated alert from Xalifly. You received this because you set a price alert for ${from}→${to}.</p>
      <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://keza.app"}/alertes" style="color: #667eea;">Manage alerts</a></p>
    </div>
  </div>
</body>
</html>
    `;

    const result = await resend.emails.send({
      from: SENDER_EMAIL,
      to: email,
      subject,
      html: htmlContent,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return !!(result && (result as any).id); // true if email sent successfully
  } catch (err) {
    logError("[sendSeatAlertEmail] Failed to send alert", err);
    return false;
  }
}
