import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { logWarn, logError } from "@/lib/logger";
import { rateLimitResponse } from "@/lib/ratelimit";
import { needsTrialReminder } from "@/lib/lemonsqueezy";
import { sendTrialReminderEmail } from "@/lib/resend";
import { hasCronSecret } from "@/lib/auth";

// Unified handler for both GET (Vercel Cron) and POST (Inngest, backup dispatcher)
async function handleTrialReminder() {
  try {
    // Lifecycle log, not a warning — every daily run starts one, so sending
    // it through logWarn (which forwards to Sentry as a message) generated
    // a Sentry entry for a routine, expected event. Plain console.log keeps
    // it visible in Vercel function logs without the Sentry noise.
    console.log("[cron/trial-reminder] Starting trial reminder scan");

    const pendingKeys = await redis.smembers("keza:trial:pending_reminders");
    let reminded = 0;

    for (const email of pendingKeys) {
      if (await needsTrialReminder(email)) {
        try {
          await sendTrialReminderEmail(email);
          reminded++;
          // Remove from pending set after reminding
          await redis.srem("keza:trial:pending_reminders", email);
        } catch (err) {
          logWarn(`[cron] Failed to send trial reminder to ${email}`, String(err));
        }
      }
    }

    logWarn(`[cron/trial-reminder] Reminded ${reminded} users`);
    return { reminded, success: true };
  } catch (err) {
    logWarn("[cron/trial-reminder] Failed", String(err));
    throw err;
  }
}

export async function GET(request: Request) {
  try {
    const limited = await rateLimitResponse(request, {
      namespace: "api:cron:trial-reminder",
      limit: 5,
      windowSeconds: 300,
    });
    if (limited) return limited;

    if (!hasCronSecret(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const result = await handleTrialReminder();
    return NextResponse.json(result);
  } catch (err) {
    logError("[api/cron/trial-reminder] GET", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const limited = await rateLimitResponse(request, {
      namespace: "api:cron:trial-reminder",
      limit: 5,
      windowSeconds: 300,
    });
    if (limited) return limited;

    if (!hasCronSecret(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const result = await handleTrialReminder();
    return NextResponse.json(result);
  } catch (err) {
    logError("[api/cron/trial-reminder] POST", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
