import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { logError } from "@/lib/logger";

// 1x1 transparent PNG (base64)
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

export const runtime = "edge";

// GET /api/track/open?type=confirmation|price-drop|digest&email=...
export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type") ?? "unknown";
    const email = req.nextUrl.searchParams.get("email") ?? "";
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Increment daily counter — fire and forget
    const key = `keza:email:opens:${today}`;
    redis.hincrby(key, type, 1).catch(() => {});
    // Set TTL 90 days
    redis.expire(key, 90 * 24 * 60 * 60).catch(() => {});

    // Per-email open tracking (know if this email ever opened)
    if (email) {
      const emailKey = `keza:email:opened:${email.toLowerCase()}`;
      redis.set(emailKey, new Date().toISOString(), { ex: 180 * 24 * 60 * 60 }).catch(() => {});
    }
  } catch (err) {
    logError("[track/open]", err);
  }

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
    },
  });
}
