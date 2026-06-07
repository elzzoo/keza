import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { logWarn } from "@/lib/logger";
import { needsTrialReminder } from "@/lib/lemonsqueezy";
import { sendTrialReminderEmail } from "@/lib/resend";

// Vercel cron header validation
function validateCronSecret(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !authHeader) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    logWarn("[cron/trial-reminder] Starting trial reminder scan");

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

    return NextResponse.json({ reminded });
  } catch (err) {
    logWarn("[cron/trial-reminder] Failed", String(err));
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
