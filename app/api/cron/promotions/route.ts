import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { redis } from "@/lib/redis";
import { PROMOS_KEY, PROMOS_TTL_SECONDS } from "@/lib/promotions/engine";

function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a.padEnd(256));
  const bBuf = Buffer.from(b.padEnd(256));
  return timingSafeEqual(aBuf, bBuf) && a.length === b.length;
}

export async function GET(request: Request) {
  // CRON_SECRET is mandatory — timing-safe comparison to prevent timing attacks
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || !authHeader || !safeCompare(authHeader, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // validUntil = 30 days from now so promos auto-expire after each refresh cycle
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const promos = [
      { airline: "Air France",       discount: 0.15, validUntil },
      { airline: "KLM",              discount: 0.10, validUntil },
      { airline: "Emirates",         discount: 0.20, validUntil },
      { airline: "Qatar Airways",    discount: 0.12, validUntil },
      { airline: "Turkish Airlines", discount: 0.18, validUntil },
      { airline: "Lufthansa",        discount: 0.08, validUntil },
      { airline: "British Airways",  discount: 0.10, validUntil },
      { airline: "Ethiopian Airlines", discount: 0.05, validUntil },
      { airline: "Kenya Airways",    discount: 0.07, validUntil },
      { airline: "Royal Air Maroc",  discount: 0.12, validUntil },
    ];

    await redis.set(PROMOS_KEY, promos, { ex: PROMOS_TTL_SECONDS });

    return NextResponse.json({ ok: true, count: promos.length });
  } catch (err) {
    console.error("[cron/promotions] error:", err);
    return NextResponse.json({ error: "Failed to refresh promotions" }, { status: 500 });
  }
}
