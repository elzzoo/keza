import { NextRequest, NextResponse } from "next/server";
import { getAlertMetrics } from "@/lib/dashboard/metricsService";
import { hasAdminSession } from "@/lib/auth";
import { rateLimitResponse } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/dashboard/alerts — Returns alert metrics for a specified time period.
 * Admin-only — was previously reachable by anyone with no auth and no rate limit.
 *
 * Query parameters:
 * - days: number of days to look back (1-365, default: 30)
 *
 * Returns:
 * - 200: AlertMetrics object
 * - 400: Invalid days parameter
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  const limited = await rateLimitResponse(request, {
    namespace: "dashboard:alerts",
    limit: 60,
    windowSeconds: 60,
  });
  if (limited) return limited;

  if (!hasAdminSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const daysParam = searchParams.get("days");

    // Default to 30 days if not specified
    let days = 30;

    // Parse and validate days parameter if provided
    if (daysParam) {
      const parsedDays = parseInt(daysParam, 10);

      // Validate days is a valid number
      if (isNaN(parsedDays)) {
        return NextResponse.json(
          { error: "Invalid days parameter: must be a number" },
          { status: 400 }
        );
      }

      // Validate days is in the valid range
      if (parsedDays < 1 || parsedDays > 365) {
        return NextResponse.json(
          { error: "Invalid days parameter: must be between 1 and 365" },
          { status: 400 }
        );
      }

      days = parsedDays;
    }

    // Fetch alert metrics
    const metrics = await getAlertMetrics(days);

    return NextResponse.json(metrics, { status: 200 });
  } catch (error) {
    console.error("[api/dashboard/alerts] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
