import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { redis } from "@/lib/redis";
import { PROMOS_KEY, PROMOS_TTL_SECONDS } from "@/lib/promotions/engine";
import { hasCronSecret } from "@/lib/auth";
import { rateLimitResponse } from "@/lib/ratelimit";
import * as Sentry from "@sentry/nextjs";
import { logError } from "@/lib/logger";

export async function GET(request: Request) {
  const limited = await rateLimitResponse(request, {
    namespace: "api:cron:promotions",
    limit: 5,
    windowSeconds: 300,
  });
  if (limited) return limited;

  // CRON_SECRET is mandatory — timing-safe comparison to prevent timing attacks
  if (!hasCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Sentry.withMonitor("cron-promotions", async () => {
  try {
    // Load promotions from promotions.json
    const filePath = path.join(process.cwd(), "data", "promotions.json");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const promos = JSON.parse(fileContent);

    if (!Array.isArray(promos)) {
      throw new Error("promotions.json must be an array");
    }

    // Filter out expired promotions and validate structure
    const now = new Date();
    const validPromos = promos.filter((p) => {
      if (!p.airline || typeof p.discount !== "number") {
        logError("[cron/promotions] Invalid promo structure:", p);
        return false;
      }
      if (p.validUntil && new Date(p.validUntil) < now) {
        return false;
      }
      return true;
    });

    await redis.set(PROMOS_KEY, validPromos, { ex: PROMOS_TTL_SECONDS });

    return NextResponse.json({ ok: true, count: validPromos.length, loaded: promos.length, filtered: promos.length - validPromos.length });
  } catch (err) {
    logError("[cron/promotions] error:", err);
    return NextResponse.json({ error: "Failed to refresh promotions" }, { status: 500 });
  }
  }, { schedule: { type: "crontab", value: "15 6 * * *" } });
}
