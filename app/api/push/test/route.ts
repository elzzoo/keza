import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getPushSubscriptions, sendPushToAll } from "@/lib/push";

// ─── Auth ────────────────────────────────────────────────────────────────────

function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a.padEnd(256));
  const bBuf = Buffer.from(b.padEnd(256));
  return timingSafeEqual(aBuf, bBuf) && a.length === b.length;
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  const param = new URL(req.url).searchParams.get("secret") ?? "";
  return safeCompare(auth, `Bearer ${secret}`) || safeCompare(param, secret);
}

// ─── POST /api/push/test ─────────────────────────────────────────────────────
// Send a test push notification to all stored subscribers.
// Protected by CRON_SECRET — call from the admin dashboard.

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
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
  if (!isAuthorized(req)) {
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
