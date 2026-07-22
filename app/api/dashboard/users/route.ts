import { NextRequest, NextResponse } from "next/server";
import { getUserMetrics, getKPIMetrics } from "@/lib/dashboard/metricsService";
import { hasAdminSession } from "@/lib/auth";
import { rateLimitResponse } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * GET /api/dashboard/users — Returns user analytics metrics. Admin-only —
 * was previously reachable by anyone with no auth and no rate limit.
 * Query parameters:
 *   - days: Number of days to aggregate (1-365, default: 30)
 */
export async function GET(request: NextRequest) {
  const limited = await rateLimitResponse(request, {
    namespace: "dashboard:users",
    limit: 60,
    windowSeconds: 60,
  });
  if (limited) return limited;

  if (!hasAdminSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Parse days query parameter
    const searchParams = request.nextUrl.searchParams;
    const daysParam = searchParams.get("days");

    let days = 30; // default
    if (daysParam) {
      const parsed = parseInt(daysParam, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 365) {
        return NextResponse.json(
          {
            error: "Invalid days parameter. Must be between 1 and 365.",
          },
          { status: 400 }
        );
      }
      days = parsed;
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch user metrics and KPI data in parallel
    const [userMetricsData, kpiMetrics] = await Promise.all([
      getUserMetrics(days),
      getKPIMetrics(days),
    ]);

    // Calculate summary statistics from the data
    const totalSearches = userMetricsData.reduce((sum, m) => sum + m.totalSearches, 0);
    const totalConversions = userMetricsData.reduce((sum, m) => sum + m.totalConversions, 0);
    const totalRevenue = userMetricsData.reduce((sum, m) => sum + m.totalRevenue, 0);
    const newUsers = userMetricsData.reduce((sum, m) => sum + m.newUsers, 0);

    // Format data for line charts
    const activeUsersChartData = userMetricsData.map((d) => ({
      date: d.date,
      totalUsers: d.totalUsers,
    }));

    const conversionsChartData = userMetricsData.map((d) => ({
      date: d.date,
      totalConversions: d.totalConversions,
    }));

    return NextResponse.json(
      {
        summary: {
          totalUsers: kpiMetrics.uniqueUsers,
          newUsers,
          totalSearches,
          totalConversions,
          totalRevenue,
          activeUsers: userMetricsData[userMetricsData.length - 1]?.activeUsers ?? 0,
          period: {
            startDate: startDate.toISOString().split("T")[0],
            endDate: endDate.toISOString().split("T")[0],
            days,
          },
        },
        chartData: {
          activeUsers: activeUsersChartData,
          conversions: conversionsChartData,
        },
        dailyBreakdown: userMetricsData.map((m) => ({
          date: m.date,
          activeUsers: m.activeUsers,
          newUsers: m.newUsers,
          searches: m.totalSearches,
          conversions: m.totalConversions,
          revenue: m.totalRevenue,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching user metrics:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch user metrics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
