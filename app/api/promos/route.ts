import { NextResponse } from "next/server";
import { loadPromotions } from "@/lib/promotions/engine";
import { rateLimitResponse } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limited = await rateLimitResponse(request, { namespace: "api:promos", limit: 30, windowSeconds: 60 });
  if (limited) return limited;

  try {
    const promos = await loadPromotions();
    return NextResponse.json({ promos });
  } catch {
    return NextResponse.json({ promos: [] });
  }
}
