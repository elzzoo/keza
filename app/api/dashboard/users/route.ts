import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 30;

interface UserMetrics {
  date: string;
  totalUsers: number;
  newUsers: number;
  totalSearches: number;
  totalConversions: number;
  revenue: number;
  activeUsers: number;
}

/**
 * GET /api/dashboard/users — Returns user analytics metrics
 * Query parameters:
 *   - days: Number of days to aggregate (1-365, default: 30)
 */
export async function GET(request: NextRequest) {
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

    // Fetch daily metrics for the date range
    const dailyMetrics = await prisma.analyticsDailyMetrics.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    // Fetch user metrics for the date range
    const analyticsUsers = await prisma.analyticsUser.findMany({
      where: {
        firstSeen: {
          gte: startDate,
        },
      },
    });

    // Calculate summary statistics
    const totalSearches = dailyMetrics.reduce((sum, m) => sum + m.searchCount, 0);
    const totalConversions = dailyMetrics.reduce((sum, m) => sum + m.conversions, 0);
    const totalRevenue = dailyMetrics.reduce((sum, m) => sum + m.totalRevenue, 0);
    const totalUsers = analyticsUsers.length;
    const newUsers = analyticsUsers.filter((u) => u.firstSeen >= startDate).length;
    const activeUsers = analyticsUsers.filter((u) => u.lastSeen >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;

    // Format data for chart consumption
    const chartData: UserMetrics[] = dailyMetrics.map((metric) => ({
      date: metric.date.toISOString().split("T")[0],
      totalUsers: metric.uniqueUsers,
      newUsers: 0, // This would need additional calculation or tracking
      totalSearches: metric.searchCount,
      totalConversions: metric.conversions,
      revenue: metric.totalRevenue,
      activeUsers: metric.uniqueUsers,
    }));

    return NextResponse.json(
      {
        summary: {
          totalUsers,
          newUsers,
          totalSearches,
          totalConversions,
          totalRevenue,
          activeUsers,
          period: {
            startDate: startDate.toISOString().split("T")[0],
            endDate: endDate.toISOString().split("T")[0],
            days,
          },
        },
        chartData,
        dailyBreakdown: dailyMetrics.map((m) => ({
          date: m.date.toISOString().split("T")[0],
          activeUsers: m.uniqueUsers,
          newUsers: 0,
          searches: m.searchCount,
          conversions: m.conversions,
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
