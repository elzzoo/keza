import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { rateLimitResponse } from "@/lib/ratelimit";
import { recordConversionEvent } from "@/lib/analytics/eventService";

/**
 * POST /api/analytics/conversion
 *
 * Record a booking conversion event for analytics tracking.
 * Validates route format (IATA code pair: CDG-DKR)
 * and records the event to the analytics database.
 *
 * Request body:
 *   {
 *     userId: string (required),
 *     route: string (required, format: XXX-YYY where X,Y are uppercase letters),
 *     priceUSD: number (required, > 0),
 *     conversionValue: number (required, > 0),
 *     pricingSource: "DUFFEL" | "TP" (required),
 *     program?: string,
 *     milesBurned?: number,
 *     bookingReference?: string,
 *     source?: "organic" | "referral" | "paid_ad",
 *     referrer?: string,
 *   }
 *
 * Response:
 *   200: { success: true, conversionId: string, route: string, priceUSD: number, timestamp: ISO8601 }
 *   400: { error: string } — validation failure
 *   429: { error: string } — rate limited
 *   500: { error: string } — database error
 */
export const maxDuration = 10;

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Apply rate limiting: 50 req/60s per IP (stricter for conversions)
  const limited = await rateLimitResponse(req, {
    namespace: "api:analytics:conversion",
    limit: 50,
    windowSeconds: 60,
  });
  if (limited) return limited;

  try {
    // Parse request body
    const body = await req.json();
    const {
      userId,
      route,
      priceUSD,
      conversionValue,
      pricingSource,
      program,
      milesBurned,
      bookingReference,
      source,
      referrer,
    } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: "Missing required field: userId" },
        { status: 400 }
      );
    }

    if (!route) {
      return NextResponse.json(
        { error: "Missing required field: route" },
        { status: 400 }
      );
    }

    if (priceUSD === undefined || priceUSD === null) {
      return NextResponse.json(
        { error: "Missing required field: priceUSD" },
        { status: 400 }
      );
    }

    if (conversionValue === undefined || conversionValue === null) {
      return NextResponse.json(
        { error: "Missing required field: conversionValue" },
        { status: 400 }
      );
    }

    if (!pricingSource) {
      return NextResponse.json(
        { error: "Missing required field: pricingSource" },
        { status: 400 }
      );
    }

    // Validate route format: XXX-YYY (IATA code pair)
    const routeRegex = /^[A-Z]{3}-[A-Z]{3}$/;
    if (!routeRegex.test(route)) {
      return NextResponse.json(
        { error: "Invalid route format. Expected format: XXX-YYY (e.g., CDG-DKR)" },
        { status: 400 }
      );
    }

    // Validate priceUSD > 0
    if (typeof priceUSD !== "number" || priceUSD <= 0) {
      return NextResponse.json(
        { error: "priceUSD must be a number greater than 0" },
        { status: 400 }
      );
    }

    // Validate conversionValue > 0
    if (typeof conversionValue !== "number" || conversionValue <= 0) {
      return NextResponse.json(
        { error: "conversionValue must be a number greater than 0" },
        { status: 400 }
      );
    }

    // Validate pricingSource
    if (!["DUFFEL", "TP"].includes(pricingSource)) {
      return NextResponse.json(
        { error: 'pricingSource must be either "DUFFEL" or "TP"' },
        { status: 400 }
      );
    }

    // Record the conversion event
    const conversionId = await recordConversionEvent({
      userId,
      route,
      priceUSD,
      conversionValue,
      pricingSource,
      program,
      milesBurned,
      bookingReference,
      source,
      referrer,
    });

    // Return success response
    const timestamp = new Date().toISOString();
    return NextResponse.json(
      {
        success: true,
        conversionId,
        route,
        priceUSD,
        timestamp,
      },
      { status: 200 }
    );
  } catch (error) {
    // Capture error to Sentry
    Sentry.captureException(error, {
      level: "error",
      tags: {
        component: "analytics:conversion",
        endpoint: "POST /api/analytics/conversion",
      },
    });

    console.error("Error recording conversion event:", error);
    return NextResponse.json(
      { error: "Failed to record conversion event" },
      { status: 500 }
    );
  }
}
