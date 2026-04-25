import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getPushSubscriptions, sendPushToAll } from "@/lib/push";
import { hasCronSecret } from "@/lib/auth";

// ─── POST /api/push/test ─────────────────────────────────────────────────────
// Send a test push notification to all stored subscribers.
// Protected by CRON_SECRET — call from the admin dashboard.

export async function POST(req: NextRequest) {
  if (!hasCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subs = await getPushSubscriptions();
  if (subs.length === 0) {
    return NextResponse.json({ ok: false, reason: "no subscribers" });
  }

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json(
      { ok: false, reason: "VAPID keys not configured — run node scripts/generate-vapid.mjs and add to Vercel env" },
      { status: 503 }
    );
  }

  const sent = await sendPushToAll({
    title: "🔔 KEZA — Test notification",
    body: "Le push fonctionne ! / Push notifications are working!",
    url: "/alertes",
  });

  return NextResponse.json({ ok: true, sent, total: subs.length });
}

// ─── GET /api/push/test — status check ──────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!hasCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subs = await getPushSubscriptions();
  const vapidConfigured =
    !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY;

  return NextResponse.json({
    subscribers: subs.length,
    vapidConfigured,
    ready: vapidConfigured && subs.length > 0,
  });
}
