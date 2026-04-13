import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: Request) {
  // Basic cron auth — Vercel sends the CRON_SECRET header
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const promos = [
      { airline: "Air France", discount: 0.15 },
      { airline: "KLM", discount: 0.10 },
      { airline: "Emirates", discount: 0.20 },
      { airline: "Qatar Airways", discount: 0.12 },
      { airline: "Turkish Airlines", discount: 0.18 },
      { airline: "Lufthansa", discount: 0.08 },
      { airline: "British Airways", discount: 0.10 },
      { airline: "Ethiopian Airlines", discount: 0.05 },
      { airline: "Kenya Airways", discount: 0.07 },
      { airline: "Royal Air Maroc", discount: 0.12 },
    ];

    const outPath = path.join(process.cwd(), "data", "promotions.json");
    fs.writeFileSync(outPath, JSON.stringify(promos, null, 2));

    return NextResponse.json({ ok: true, count: promos.length });
  } catch (err) {
    console.error("[cron/promotions] error:", err);
    return NextResponse.json({ error: "Failed to refresh promotions" }, { status: 500 });
  }
}
