import { NextRequest, NextResponse } from "next/server";
import { hasAdminSecret } from "@/lib/auth";
import { redis } from "@/lib/redis";
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
    const { days } = body as { days?: unknown };

    // Validate input
    if (typeof days !== "number" || days < 0 || days > 30) {
      return NextResponse.json(
        { error: "days must be a number between 0 and 30" },
        { status: 400 }
      );
    }

    // Set the config in Redis
    await redis.set("keza:config:trial_reminder_days_before_expiry", String(Math.floor(days)));

    // Log to Sentry for audit trail
    Sentry.captureMessage(
      `Trial reminder config updated: ${days} days before expiry`,
      "info"
    );

    console.log(`[admin] Trial reminder days updated to: ${days}`);

    return NextResponse.json({
      success: true,
      message: `Trial reminder timing set to ${days} day(s) before expiry`,
      days,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[admin] Error updating trial reminder config:", message);
    return NextResponse.json({ error: message }, { status: 500 });
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

    return NextResponse.json({
      success: true,
      days,
      message: `Reminders will be sent ${days} day(s) before trial expiry`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[admin] Error reading trial reminder config:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
