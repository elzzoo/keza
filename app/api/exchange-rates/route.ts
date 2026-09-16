import { getCachedRates } from "@/lib/exchange-rates";
import { rateLimitResponse } from "@/lib/ratelimit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/exchange-rates
 * Returns cached exchange rates for client-side use
 */
export async function GET(request: Request) {
  const limited = await rateLimitResponse(request, {
    namespace: "api:exchange-rates",
    limit: 60,
    windowSeconds: 60,
  });
  if (limited) return limited;

  try {
    const rates = await getCachedRates();
    return NextResponse.json(
      {
        rates,
        cachedAt: new Date().toISOString(),
        success: true,
      },
      {
        headers: {
          // Allow caching in browser and CDN for 1 hour
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
