import { NextResponse } from "next/server";
import { hasAdminSecret } from "@/lib/auth";
import { logError } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    // Protect debug endpoint with admin authentication
    if (!hasAdminSecret(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
  } catch (err) {
    logError("[api/pro/debug]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
