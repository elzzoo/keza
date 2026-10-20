// app/api/cron/deals/route.ts
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { sortDeals, type RawDeal } from "@/lib/dealsEngine";
import { DEALS_KEY } from "@/lib/redisKeys";
import { hasCronSecret } from "@/lib/auth";
import { rateLimitResponse } from "@/lib/ratelimit";
import * as Sentry from "@sentry/nextjs";
import { logError } from "@/lib/logger";

const DEALS_TTL = 25 * 60 * 60; // The daily dispatcher runs once per day.
const LAST_CRON_KEY = "keza:admin:last_cron_at";

// Routes populaires mondiales avec miles estimés (economy, aller simple)
const ROUTES_TO_CHECK: RawDeal[] = [
  { from: "DSS", to: "CDG", fromFlag: "🇸🇳", toFlag: "🇫🇷", cashPrice: 0, milesRequired: 35000, program: "Flying Blue" },
  { from: "DSS", to: "LHR", fromFlag: "🇸🇳", toFlag: "🇬🇧", cashPrice: 0, milesRequired: 30000, program: "Flying Blue" },
  { from: "JFK", to: "LHR", fromFlag: "🇺🇸", toFlag: "🇬🇧", cashPrice: 0, milesRequired: 26000, program: "Aeroplan" },
  { from: "JFK", to: "CDG", fromFlag: "🇺🇸", toFlag: "🇫🇷", cashPrice: 0, milesRequired: 30000, program: "Flying Blue" },
  { from: "LOS", to: "LHR", fromFlag: "🇳🇬", toFlag: "🇬🇧", cashPrice: 0, milesRequired: 32000, program: "LifeMiles" },
  { from: "CMN", to: "CDG", fromFlag: "🇲🇦", toFlag: "🇫🇷", cashPrice: 0, milesRequired: 18000, program: "Flying Blue" },
  { from: "CDG", to: "NRT", fromFlag: "🇫🇷", toFlag: "🇯🇵", cashPrice: 0, milesRequired: 55000, program: "Turkish Miles&Smiles" },
  { from: "DXB", to: "JFK", fromFlag: "🇦🇪", toFlag: "🇺🇸", cashPrice: 0, milesRequired: 40000, program: "Emirates Skywards" },
  { from: "CDG", to: "DXB", fromFlag: "🇫🇷", toFlag: "🇦🇪", cashPrice: 0, milesRequired: 22000, program: "Flying Blue" },
  { from: "SIN", to: "LHR", fromFlag: "🇸🇬", toFlag: "🇬🇧", cashPrice: 0, milesRequired: 48000, program: "KrisFlyer" },
];

async function fetchBestPrice(
  from: string,
  to: string,
  token: string,
): Promise<{ price: number; month: string; checkedAt: string } | null> {
  try {
    // Date flexible : 4 semaines à partir d'aujourd'hui
    const depart = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000)
      .toISOString().split("T")[0];

    const month = depart.slice(0, 7);
    const url = `https://api.travelpayouts.com/v2/prices/month-matrix?currency=usd&origin=${from}&destination=${to}&show_to_affiliates=true&month=${month}`;
    const res = await fetch(url, {
      next: { revalidate: 0 },
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json() as { data?: { price: number }[] };
    const prices = data.data?.map((d) => d.price).filter((price) => Number.isFinite(price) && price > 50) ?? [];
    if (prices.length === 0) return null;
    return { price: Math.min(...prices), month, checkedAt: new Date().toISOString() };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const limited = await rateLimitResponse(request, {
    namespace: "api:cron:deals",
    limit: 5,
    windowSeconds: 300,
  });
  if (limited) return limited;

  if (!hasCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Sentry.withMonitor("cron-deals", async () => {
    try {
      const token = process.env.TRAVELPAYOUTS_TOKEN;
      if (!token) {
        return NextResponse.json({ error: "TRAVELPAYOUTS_TOKEN not set" }, { status: 500 });
      }

      const enriched: RawDeal[] = [];

      for (const route of ROUTES_TO_CHECK) {
        const result = await fetchBestPrice(route.from, route.to, token);
        if (result) {
          enriched.push({
            ...route,
            cashPrice: result.price,
            cashSource: "travelpayouts-month-matrix",
            cashCheckedAt: result.checkedAt,
            cashSearchMonth: result.month,
          });
        }
      }

      if (enriched.length === 0) {
        return NextResponse.json({ ok: false, reason: "no prices fetched" });
      }

      const deals = sortDeals(enriched).slice(0, 8);
      await Promise.all([
        redis.set(DEALS_KEY, deals, { ex: DEALS_TTL }),
        redis.set(LAST_CRON_KEY, new Date().toISOString(), { ex: 30 * 24 * 3600 }),
      ]);

      return NextResponse.json({ ok: true, count: deals.length });
    } catch (err) {
      logError("[api/cron/deals] failed", err);
      // Generic error message to prevent information disclosure (API tokens, service errors)
      return NextResponse.json(
        { ok: false, error: "Internal server error" },
        { status: 500 }
      );
    }
  }, { schedule: { type: "crontab", value: "0 6 * * *" } });
}
