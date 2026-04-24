// app/api/cron/deals/route.ts
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { redis } from "@/lib/redis";
import { sortDeals, type RawDeal } from "@/lib/dealsEngine";
import { DEALS_KEY } from "@/lib/redisKeys";

const DEALS_TTL = 7 * 60 * 60; // 7h (cron tourne toutes les 6h, safety window)
const LAST_CRON_KEY = "keza:admin:last_cron_at";

function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a.padEnd(256));
  const bBuf = Buffer.from(b.padEnd(256));
  return timingSafeEqual(aBuf, bBuf) && a.length === b.length;
}

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

async function fetchBestPrice(from: string, to: string, token: string): Promise<number | null> {
  try {
    // Date flexible : 4 semaines à partir d'aujourd'hui
    const depart = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000)
      .toISOString().split("T")[0];

    const url = `https://api.travelpayouts.com/v2/prices/month-matrix?currency=usd&origin=${from}&destination=${to}&show_to_affiliates=true&month=${depart.slice(0,7)}&token=${token}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    const data = await res.json() as { data?: { price: number }[] };
    if (!data.data?.length) return null;
    return Math.min(...data.data.map((d) => d.price));
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth   = request.headers.get("authorization");
  const url    = new URL(request.url);
  const paramSecret = url.searchParams.get("secret");
  const authorized =
    secret &&
    (safeCompare(auth ?? "", `Bearer ${secret}`) || safeCompare(paramSecret ?? "", secret));
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "TRAVELPAYOUTS_TOKEN not set" }, { status: 500 });
  }

  const enriched: RawDeal[] = [];

  for (const route of ROUTES_TO_CHECK) {
    const price = await fetchBestPrice(route.from, route.to, token);
    if (price && price > 50) {
      enriched.push({ ...route, cashPrice: price });
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
}
