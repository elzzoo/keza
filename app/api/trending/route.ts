import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { airportsMap } from "@/data/airports";
import { logError } from "@/lib/logger";

// GET /api/trending — top searched routes (last 3 days), max 6
// Used by TrendingRoutesWidget on homepage
export async function GET() {
  try {
    const days: string[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }

    // Aggregate scores across last 3 days
    const scoreMap = new Map<string, number>();
    await Promise.all(
      days.map(async (day) => {
        try {
          // zrange with rev+byscore: top 20 entries
          const entries = await redis.zrange(`keza:stats:routes:${day}`, 0, 19, { rev: true });
          if (!Array.isArray(entries)) return;
          // entries is alternating [member, score] when withScores=true but here it's just members
          // Use zrangebyscore approach instead
          const withScores = await redis.zrange(`keza:stats:routes:${day}`, 0, 19, {
            rev: true,
            withScores: true,
          }) as Array<string | number>;
          // Result is [member, score, member, score, ...]
          for (let i = 0; i < withScores.length - 1; i += 2) {
            const member = withScores[i] as string;
            const score  = Number(withScores[i + 1]);
            scoreMap.set(member, (scoreMap.get(member) ?? 0) + score);
          }
        } catch {
          // skip this day
        }
      })
    );

    if (scoreMap.size === 0) {
      return NextResponse.json(
        { routes: [] },
        { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
      );
    }

    // Sort by score, take top 6
    const sorted = [...scoreMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const routes = sorted
      .map(([key, count]) => {
        const [from, to] = key.split("-");
        if (!from || !to) return null;
        const fromAirport = airportsMap[from];
        const toAirport   = airportsMap[to];
        if (!fromAirport || !toAirport) return null;
        return {
          from,
          to,
          fromCity: fromAirport.city,
          fromCityEn: fromAirport.cityEn,
          toCity: toAirport.city,
          toCityEn: toAirport.cityEn,
          fromFlag: fromAirport.flag,
          toFlag: toAirport.flag,
          count,
        };
      })
      .filter(Boolean);

    return NextResponse.json(
      { routes },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (err) {
    logError("[api/trending]", err);
    return NextResponse.json(
      { routes: [] },
      { headers: { "Cache-Control": "public, s-maxage=60" } }
    );
  }
}
