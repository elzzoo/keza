import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getRouteMetrics } from "@/lib/dashboard/metricsService";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/dashboard/routes
 * Returns top routes by search volume for the specified period
 *
 * Query parameters:
 * - days: Number of days to look back (default: 30, range: 1-365)
 * - limit: Maximum number of routes to return (default: 20, range: 1-100)
 *
 * Response: Array of RouteMetric objects
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const daysStr = searchParams.get("days") ?? "30";
    const limitStr = searchParams.get("limit") ?? "20";

    // Parse and validate days parameter
    const days = parseInt(daysStr, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { error: "Invalid days parameter: must be between 1 and 365" },
        { status: 400 }
      );
    }

    // Parse and validate limit parameter
    const limit = parseInt(limitStr, 10);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Invalid limit parameter: must be between 1 and 100" },
        { status: 400 }
      );
    }

    // Fetch route metrics from the service
    const routes = await getRouteMetrics(days, limit);

    return NextResponse.json(routes);
  } catch (error) {
    console.error("Error fetching route metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch route metrics" },
      { status: 500 }
    );
  }
}
