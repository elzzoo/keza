import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY ? `SET (${process.env.LEMONSQUEEZY_API_KEY.length} chars)` : "MISSING";
  const storeId = process.env.LEMONSQUEEZY_STORE_ID || "MISSING";
  const variantId = process.env.LEMONSQUEEZY_VARIANT_ID || "MISSING";
  const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ? "SET" : "MISSING";

  return NextResponse.json({
    apiKey,
    storeId,
    variantId,
    webhookSecret,
  });
}
