import { NextResponse } from "next/server";
import { loadPromotions } from "@/lib/promotions/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const promos = loadPromotions();
    return NextResponse.json({ promos });
  } catch {
    return NextResponse.json({ promos: [] });
  }
}
