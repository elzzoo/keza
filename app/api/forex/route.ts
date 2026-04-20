import { NextResponse } from "next/server";
import { getForexRate } from "@/lib/autoCalibrate";

// Public endpoint — no auth needed (it's just a forex rate)
// Cached for 12h by Vercel edge + Redis internally

export async function GET(): Promise<NextResponse> {
  try {
    const rate = await getForexRate();
    return NextResponse.json(
      { usdToXof: rate, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=86400" } }
    );
  } catch {
    return NextResponse.json({ usdToXof: 605, updatedAt: null }, { status: 200 });
  }
}
