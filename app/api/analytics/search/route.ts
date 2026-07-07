import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { rateLimitResponse } from "@/lib/ratelimit";
import { recordSearchEvent } from "@/lib/analytics/eventService";

/**
 * POST /api/analytics/search
 *
 * Record a search event for analytics tracking.
 * Validates route format (IATA code pair: CDG-DKR)
 * and records the event to the analytics database.
 *
 * Request body:
 *   {
 *     userId?: string,
 *     route: string (required, format: XXX-YYY where X,Y are uppercase letters)
 *     passengers?: number,
 *     cabin?: "economy" | "premium" | "business" | "first",
 *     tripType?: "oneway" | "roundtrip",
 *     device?: "mobile" | "tablet" | "desktop",
 *     ...other optional fields
 *   }
 *
 * Response:
 *   200: { success: true, searchId: string, route: string, timestamp: ISO8601 }
 *   400: { error: string } — validation failure
 *   429: { error: string } — rate limited
 *   500: { error: string } — database error
 */
export const maxDuration = 10;

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Apply rate limiting: 100 req/60s per IP
  const limited = await rateLimitResponse(req, {
    namespace: "api:analytics:search",
    limit: 100,
    windowSeconds: 60,
  });
  if (limited) return limited;

  try {
    // Parse request body
    const body = await req.json();
    const { userId, route, passengers, cabin, tripType, device, source, confidence } = body;

    // Validate required fields
    if (!route) {
      return NextResponse.json(
        { error: "Missing required field: route" },
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

    // Record the search event
    const searchId = await recordSearchEvent({
      userId,
      route,
      passengers,
      cabin,
      tripType,
      device,
      source,
      confidence,
    });

    // Return success response
    const timestamp = new Date().toISOString();
    return NextResponse.json(
      {
        success: true,
        searchId,
        route,
        timestamp,
      },
      { status: 200 }
    );
  } catch (error) {
    // Capture error to Sentry
    Sentry.captureException(error, {
      level: "error",
      tags: {
        component: "analytics:search",
        endpoint: "POST /api/analytics/search",
      },
    });

    console.error("Error recording search event:", error);
    return NextResponse.json(
      { error: "Failed to record search event" },
      { status: 500 }
    );
  }
}
