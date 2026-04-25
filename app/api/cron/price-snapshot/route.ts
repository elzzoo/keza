import { NextRequest, NextResponse } from "next/server";
import { fetchCalendarPrices } from "@/lib/engine";
import { hasCronSecret } from "@/lib/auth";
import { recordDailyPrice } from "@/lib/priceHistoryRedis";

const POPULAR_ROUTES = [
  "DSS-CDG",
  "ABJ-CDG",
  "LOS-LHR",
  "CMN-CDG",
  "NBO-CDG",
  "ACC-LHR",
  "JNB-LHR",
  "CAI-CDG",
  "ADD-DXB",
  "DSS-IST",
  "ABJ-IST",
  "CMN-JFK",
  "LOS-ATL",
  "NBO-DXB",
  "JFK-LHR",
  "CDG-JFK",
  "LAX-CDG",
  "JFK-AMS",
  "ORD-LHR",
  "BOS-LHR",
  "MIA-MAD",
  "JFK-NRT",
  "LAX-NRT",
  "SFO-NRT",
  "LAX-BKK",
  "LAX-SIN",
  "YYZ-LHR",
  "LHR-SIN",
  "CDG-NRT",
  "LHR-DXB",
  "LHR-BKK",
  "CDG-BKK",
  "FRA-SIN",
  "LHR-HKG",
  "DXB-LHR",
  "DXB-JFK",
  "DOH-LHR",
  "DOH-JFK",
  "IST-JFK",
  "SIN-SYD",
  "SIN-NRT",
  "HKG-LHR",
  "SYD-LHR",
  "MIA-BOG",
  "GRU-LHR",
  "GRU-CDG",
  "EZE-MAD",
  "SCL-MIA",
  "BOG-MAD",
];

// GET /api/cron/price-snapshot — record daily prices for popular routes
export async function GET(req: NextRequest) {
  if (!hasCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let recorded = 0;
  const errors: string[] = [];

  for (const route of POPULAR_ROUTES) {
    const [from, to] = route.split("-");
    if (!from || !to) continue;

    try {
      const now = new Date();
      const month1 = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const month2 = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;

      const [prices1, prices2] = await Promise.all([
        fetchCalendarPrices(from, to, month1).catch(() => []),
        fetchCalendarPrices(from, to, month2).catch(() => []),
      ]);

      const allPrices = [
        ...prices1.map((day) => day.price),
        ...prices2.map((day) => day.price),
      ].filter((p) => typeof p === "number" && p > 0 && !isNaN(p));

      if (allPrices.length === 0) continue;

      const cheapest = Math.min(...allPrices);

      // Fire-and-forget — never let a Redis failure crash the loop
      recordDailyPrice(from, to, cheapest).catch(() => {});

      recorded++;
    } catch (err) {
      errors.push(`${route}: ${(err as Error).message}`);
    }
  }

  return NextResponse.json({
    recorded,
    total: POPULAR_ROUTES.length,
    errors,
  });
}
