import { NextRequest, NextResponse } from "next/server";
import { getPriceHistory, computePriceTrend } from "@/lib/priceHistory";
import { isValidIata } from "@/lib/validate";

// GET /api/price-history?from=DSS&to=CDG&days=30
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from")?.toUpperCase() ?? "";
  const to = searchParams.get("to")?.toUpperCase() ?? "";
  const days = Math.min(90, parseInt(searchParams.get("days") ?? "30", 10));

  if (!isValidIata(from) || !isValidIata(to)) {
    return NextResponse.json({ error: "Invalid IATA codes" }, { status: 400 });
  }

  const history = await getPriceHistory(from, to, days);
  const trend = computePriceTrend(history);

  return NextResponse.json(
    { history, trend },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
