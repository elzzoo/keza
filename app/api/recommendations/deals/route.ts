import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { safeGet } from "@/lib/redis";
import { logError } from "@/lib/logger";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dealsKey = `keza:deals:${session.user.email}`;
    const cached = await safeGet<string>(dealsKey);
    let deals: unknown[] = [];

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        deals = Array.isArray(parsed) ? parsed : [];
      } catch (parseErr) {
        logError("[api/recommendations/deals] Failed to parse deals from Redis", parseErr, { email: session.user.email });
        // Return empty array on parse error (Redis data corrupted)
      }
    }

    return NextResponse.json(deals);
  } catch (err) {
    logError("[api/recommendations/deals] Failed to fetch deals", err);
    return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 });
  }
}
