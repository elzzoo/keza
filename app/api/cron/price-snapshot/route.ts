import { NextRequest, NextResponse } from "next/server";
import { fetchCalendarPrices } from "@/lib/engine";
import { hasCronSecret } from "@/lib/auth";
import { recordDailyPrice } from "@/lib/priceHistoryRedis";

const POPULAR_ROUTES = [
  // Africa ↔ Europe (original)
  "DSS-CDG", "ABJ-CDG", "LOS-LHR", "CMN-CDG", "NBO-CDG", "ACC-LHR",
  "JNB-LHR", "CAI-CDG", "ADD-DXB", "DSS-IST", "ABJ-IST", "CMN-JFK",
  "LOS-ATL", "NBO-DXB",
  // North America ↔ Europe (original)
  "JFK-LHR", "CDG-JFK", "LAX-CDG", "JFK-AMS", "ORD-LHR", "BOS-LHR",
  "MIA-MAD",
  // North America ↔ Asia (original)
  "JFK-NRT", "LAX-NRT", "SFO-NRT", "LAX-BKK", "LAX-SIN", "YYZ-LHR",
  // Europe ↔ Asia (original)
  "LHR-SIN", "CDG-NRT", "LHR-DXB", "LHR-BKK", "CDG-BKK", "FRA-SIN",
  "LHR-HKG",
  // Middle East hub routes (original)
  "DXB-LHR", "DXB-JFK", "DOH-LHR", "DOH-JFK", "IST-JFK",
  // Asia-Pacific (original)
  "SIN-SYD", "SIN-NRT", "HKG-LHR", "SYD-LHR",
  // Latin America (original)
  "MIA-BOG", "GRU-LHR", "GRU-CDG", "EZE-MAD", "SCL-MIA", "BOG-MAD",

  // Africa ↔ Europe (expanded)
  "DSS-LHR", "DSS-MAD", "DSS-AMS", "DSS-BRU", "DSS-FCO", "DSS-LIS",
  "ABJ-LHR", "ABJ-MAD", "ABJ-AMS", "ABJ-BRU",
  "LOS-CDG", "LOS-MAD", "LOS-AMS", "LOS-IST", "LOS-DXB",
  "CMN-LHR", "CMN-MAD", "CMN-IST", "CMN-AMS",
  "NBO-LHR", "NBO-IST",
  "ACC-CDG", "ACC-MAD", "ACC-IST",
  "JNB-CDG", "JNB-IST", "JNB-DXB",
  "CAI-LHR", "CAI-IST", "CAI-DXB",
  "TUN-CDG", "TUN-LHR", "TUN-MAD",
  "ALG-CDG", "ALG-LHR", "ALG-MAD",

  // Africa ↔ Americas
  "LOS-JFK", "LOS-IAD",
  "ACC-JFK", "ACC-IAD",
  "JNB-JFK", "JNB-MIA",
  "NBO-JFK",

  // Africa ↔ Middle East
  "LOS-DOH", "ACC-DXB", "JNB-DOH",

  // Africa intra
  "DSS-ABJ", "DSS-LOS", "DSS-CMN",

  // Europe ↔ Americas (high volume)
  "LHR-JFK", "LHR-LAX", "LHR-MIA", "LHR-YYZ", "LHR-YUL",
  "CDG-LAX", "CDG-MIA", "CDG-YUL", "CDG-YYZ", "CDG-ORD",
  "MAD-JFK", "MAD-MIA", "MAD-BOG",
  "AMS-JFK", "AMS-LAX",
  "FRA-JFK", "FRA-LAX", "FRA-YYZ",

  // Asia ↔ Americas
  "NRT-LAX", "NRT-JFK", "NRT-SFO",
  "SIN-LAX", "SIN-JFK",

  // More Middle East hubs
  "DXB-CDG", "DXB-SIN", "DXB-BKK", "DXB-SYD",
  "DOH-CDG", "DOH-SIN", "DOH-BKK",
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
