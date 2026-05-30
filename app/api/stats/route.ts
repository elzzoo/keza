import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { rateLimitResponse } from "@/lib/ratelimit";

// GET /api/stats — public lightweight stats for social proof bar
// Cached 5 min in CDN, recomputed on miss
export async function GET(req: NextRequest) {
  const limited = await rateLimitResponse(req, { namespace: "api:stats", limit: 60, windowSeconds: 60 });
  if (limited) return limited;
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [searchesToday, activeAlerts, totalSaved] = await Promise.all([
      redis.get<number>(`keza:stats:searches:${today}`).catch(() => null),
      redis.scard("keza:alerts:routes").catch(() => null),
      redis.get<number>("keza:stats:total_savings_usd").catch(() => null),
    ]);

    return NextResponse.json(
      {
        searches_today: Number(searchesToday ?? 0),
        active_alerts:  Number(activeAlerts  ?? 0),
        total_saved_usd: Number(totalSaved   ?? 0),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { searches_today: 0, active_alerts: 0, total_saved_usd: 0 },
      { headers: { "Cache-Control": "public, s-maxage=60" } }
    );
  }
}
