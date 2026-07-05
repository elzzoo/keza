import { getCachedRates } from "@/lib/exchange-rates";
import { NextResponse } from "next/server";

export const revalidate = 3600; // Revalidate ISR every hour

/**
 * GET /api/exchange-rates
 * Returns cached exchange rates for client-side use
 */
export async function GET() {
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
