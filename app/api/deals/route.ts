// app/api/deals/route.ts
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { DEALS_KEY } from "@/lib/redisKeys";
import type { LiveDeal } from "@/lib/dealsEngine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Fallback statique si le cron n'a pas encore tourné
const FALLBACK_DEALS: LiveDeal[] = [
  { from: "DSS", to: "CDG", fromFlag: "🇸🇳", toFlag: "🇫🇷", cashPrice: 680, milesRequired: 35000, program: "Flying Blue",  ratio: 1.94, recommendation: "USE_MILES", multiplier: "×1.9" },
  { from: "JFK", to: "LHR", fromFlag: "🇺🇸", toFlag: "🇬🇧", cashPrice: 520, milesRequired: 26000, program: "Aeroplan",     ratio: 2.00, recommendation: "USE_MILES", multiplier: "×2.0" },
  { from: "LOS", to: "LHR", fromFlag: "🇳🇬", toFlag: "🇬🇧", cashPrice: 490, milesRequired: 32000, program: "LifeMiles",    ratio: 1.53, recommendation: "USE_MILES", multiplier: "×1.5" },
  { from: "CMN", to: "CDG", fromFlag: "🇲🇦", toFlag: "🇫🇷", cashPrice: 320, milesRequired: 18000, program: "Flying Blue",  ratio: 1.78, recommendation: "USE_MILES", multiplier: "×1.8" },
  { from: "CDG", to: "NRT", fromFlag: "🇫🇷", toFlag: "🇯🇵", cashPrice: 610, milesRequired: 55000, program: "Miles&Smiles", ratio: 1.11, recommendation: "NEUTRAL",   multiplier: "×1.1" },
];

export async function GET() {
  try {
    const cached = await redis.get<LiveDeal[]>(DEALS_KEY);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return NextResponse.json({ deals: cached, source: "live" });
    }
  } catch {
    // Redis unavailable — use fallback silently
  }
  return NextResponse.json({ deals: FALLBACK_DEALS, source: "fallback" });
}
