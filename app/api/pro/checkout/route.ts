import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createCheckoutUrl } from "@/lib/lemonsqueezy";
import { rateLimitResponse } from "@/lib/ratelimit";
import { isValidEmail } from "@/lib/validate";
import { logError } from "@/lib/logger";

// POST /api/pro/checkout — create a Lemon Squeezy checkout session
export async function POST(req: NextRequest) {
  return Sentry.withMonitor("checkout-api", async () => {
    const limited = await rateLimitResponse(req, {
      namespace: "api:pro:checkout",
      limit: 10,
      windowSeconds: 60 * 60,
    });
    if (limited) return limited;

    try {
      const body = await req.json();
      const { email } = body as { email?: string };

      if (!email || !isValidEmail(email)) {
        return NextResponse.json({ error: "Valid email required" }, { status: 400 });
      }

      const url = await createCheckoutUrl(email.trim().toLowerCase());
      return NextResponse.json({ url });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logError("[api/pro/checkout] Failed to create checkout", err);
      Sentry.captureException(err, {
        tags: { route: "checkout" },
      });
      // If env vars not set, return 503 with clear message
      if (message.includes("not configured")) {
        return NextResponse.json(
          { error: "Payments not yet configured" },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
