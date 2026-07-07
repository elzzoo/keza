import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 30;

interface KPIOverview {
  totalSearches: number;
  conversions: number;
  alertsFired: number;
  revenue: number;
  uniqueUsers: number;
  conversionRate: number;
  cacheHitRate: number;
  avgSearchDuration: number;
}

/**
 * GET /api/dashboard/overview — Returns KPI overview metrics
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

    // Fetch all relevant metrics for the date range
    const searches = await prisma.analyticsSearch.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const alerts = await prisma.analyticsAlert.findMany({
      where: {
        firedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const conversions = await prisma.analyticsConversion.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const users = await prisma.analyticsUser.findMany({
      where: {
        firstSeen: {
          gte: startDate,
        },
      },
    });

    // Calculate KPI metrics
    const totalSearches = searches.length;
    const alertsFired = alerts.length;
    const totalConversions = conversions.length;
    const totalRevenue = conversions.reduce((sum, c) => sum + c.conversionValue, 0);
    const uniqueUsers = new Set(searches.map((s) => s.userId).filter(Boolean)).size;

    // Conversion rate (conversions / searches)
    const conversionRate = totalSearches > 0
      ? (totalConversions / totalSearches) * 100
      : 0;

    // Cache hit rate (searches with cacheHit = true / total searches)
    const cacheHits = searches.filter((s) => s.cacheHit).length;
    const cacheHitRate = totalSearches > 0
      ? (cacheHits / totalSearches) * 100
      : 0;

    // Average search duration in milliseconds
    const searchesWithDuration = searches.filter((s) => s.duration !== null);
    const avgSearchDuration = searchesWithDuration.length > 0
      ? searchesWithDuration.reduce((sum, s) => sum + (s.duration || 0), 0) / searchesWithDuration.length
      : 0;

    const kpis: KPIOverview = {
      totalSearches,
      conversions: totalConversions,
      alertsFired,
      revenue: Math.round(totalRevenue * 100) / 100,
      uniqueUsers,
      conversionRate: Math.round(conversionRate * 10) / 10,
      cacheHitRate: Math.round(cacheHitRate * 10) / 10,
      avgSearchDuration: Math.round(avgSearchDuration),
    };

    return NextResponse.json(
      {
        kpis,
        period: {
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
          days,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching dashboard overview:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch dashboard overview",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
