import { NextRequest, NextResponse } from "next/server";
import { hasAdminSecret } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { logWarn, logError } from "@/lib/logger";
import { trialReminderDaysSchema } from "@/lib/adminSchemas";
import * as Sentry from "@sentry/nextjs";

/**
 * POST /api/admin/config/trial-reminder-days
 *
 * Update the number of days before trial expiry to send a reminder.
 * Requires ADMIN_SECRET in Authorization header.
 *
 * Body: { days: number }
 * Example: { days: 3 }
 */
export async function POST(req: NextRequest) {
  // Verify admin secret
  if (!hasAdminSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = trialReminderDaysSchema.safeParse(body);

    if (!result.success) {
      const error = result.error.issues[0];
      return NextResponse.json(
        { error: `${error.path.join(".")}: ${error.message}` },
        { status: 400 }
      );
    }

    const { days } = result.data;

    // Set the config in Redis
    await redis.set("keza:config:trial_reminder_days_before_expiry", String(Math.floor(days)));

    // Log to Sentry for audit trail
    Sentry.captureMessage(
      `Trial reminder config updated: ${days} days before expiry`,
      "info"
    );

    logWarn("[admin] Trial reminder days updated", undefined, { days });

    return NextResponse.json({
      success: true,
      message: `Trial reminder timing set to ${days} day(s) before expiry`,
      days,
    });
  } catch (err) {
    logError("[admin] Error updating trial reminder config", err);
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}

/**
 * GET /api/admin/config/trial-reminder-days
 *
 * Retrieve the current trial reminder configuration.
 * Requires ADMIN_SECRET in Authorization header.
 */
export async function GET(req: NextRequest) {
  // Verify admin secret
  if (!hasAdminSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const daysStr = await redis.get<string>("keza:config:trial_reminder_days_before_expiry");
    const days = parseInt(daysStr ?? "1", 10);

    // Validate bounds (config should always be within 0-30, but validate on read as safety check)
    if (!Number.isInteger(days) || days < 0 || days > 30) {
      logWarn("[admin] Trial reminder config out of bounds, using default", undefined, { storedValue: daysStr, parsedValue: days });
      const defaultDays = 1;
      return NextResponse.json({
        success: true,
        days: defaultDays,
        message: `Config corrupted, using default: ${defaultDays} day(s) before trial expiry`,
      });
    }

    return NextResponse.json({
      success: true,
      days,
      message: `Reminders will be sent ${days} day(s) before trial expiry`,
    });
  } catch (err) {
    logError("[admin] Error reading trial reminder config", err);
    return NextResponse.json({ error: "Failed to read config" }, { status: 500 });
  }
}
