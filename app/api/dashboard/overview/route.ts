import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getKPIMetrics } from "@/lib/dashboard/metricsService";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/dashboard/overview
 * Returns key performance indicators for the specified period
 *
 * Query parameters:
 * - days: Number of days to look back (default: 30, range: 1-365)
 *
 * Response: KPIMetrics object with aggregated metrics
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const daysStr = searchParams.get("days") ?? "30";

    // Parse and validate days parameter
    const days = parseInt(daysStr, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { error: "Invalid days parameter: must be between 1 and 365" },
        { status: 400 }
      );
    }

    // Fetch KPI metrics from the service
    const kpis = await getKPIMetrics(days);

    return NextResponse.json(kpis);
  } catch (error) {
    console.error("Error fetching KPI metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch KPI metrics" },
      { status: 500 }
    );
  }
}
