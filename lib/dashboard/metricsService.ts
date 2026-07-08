import { prisma } from "@/lib/db";
import type { AnalyticsDailyMetrics } from "@prisma/client";

/**
 * Dashboard Metrics Service
 * Aggregates analytics data for dashboard queries
 */

// ═══════════════════════════════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

export interface KPIMetrics {
  totalSearches: number;
  totalConversions: number;
  totalAlerts: number;
  uniqueUsers: number;
  totalRevenue: number;
  avgSearchDuration: number;
  cacheHitRate: number;
  conversionRate: number;
}

export interface RouteMetric {
  route: string;
  searchCount: number;
  conversionCount: number;
  totalRevenue: number;
  topProgram: string | null;
}

export type RouteMetrics = RouteMetric[];

export interface DailyUserMetric {
  date: string;
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  totalSearches: number;
  totalConversions: number;
  totalRevenue: number;
}

export type UserMetrics = DailyUserMetric[];

export interface AlertMetrics {
  totalAlertsAllTime: number;
  alertsFiredInPeriod: number;
  activeAlerts: number;
  alertConversionRate: number;
  topRoute: string | null;
  topProgram: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// KPI Metrics
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get key performance indicators for a date range
 * @param days Number of days to look back
 * @returns KPI metrics aggregated over the period
 */
export async function getKPIMetrics(days: number): Promise<KPIMetrics> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Run parallel queries for efficiency
  const [
    searchStats,
    conversionStats,
    alertStats,
    userStats,
    cacheStats,
  ] = await Promise.all([
    // Total searches and average duration
    prisma.analyticsSearch.aggregate({
      _count: true,
      _avg: { duration: true },
      where: {
        timestamp: { gte: startDate },
      },
    }),
    // Total conversions and revenue
    prisma.analyticsConversion.aggregate({
      _count: true,
      _sum: { conversionValue: true },
      where: {
        timestamp: { gte: startDate },
      },
    }),
    // Total alerts fired
    prisma.analyticsAlert.aggregate({
      _count: true,
      _sum: { conversionValue: true },
      where: {
        firedAt: { gte: startDate },
      },
    }),
    // Unique users
    prisma.analyticsSearch.findMany({
      distinct: ["userId"],
      select: { userId: true },
      where: {
        timestamp: { gte: startDate },
        userId: { not: null },
      },
    }),
    // Cache hit rate
    prisma.analyticsSearch.aggregate({
      _count: { _all: true, cacheHit: true },
      where: {
        timestamp: { gte: startDate },
      },
    }),
  ]);

  const totalSearches = searchStats._count;
  const totalConversions = conversionStats._count;
  const totalAlerts = alertStats._count;
  const uniqueUsers = userStats.length;
  const totalRevenue = (conversionStats._sum.conversionValue ?? 0) +
    (alertStats._sum.conversionValue ?? 0);
  const avgSearchDuration = searchStats._avg.duration ?? 0;

  // Calculate cache hit rate
  const totalSearchesForCache = cacheStats._count._all || 1;
  const cacheHits = cacheStats._count.cacheHit || 0;
  const cacheHitRate = totalSearchesForCache > 0
    ? (cacheHits / totalSearchesForCache) * 100
    : 0;

  // Calculate conversion rate
  const conversionRate = totalSearches > 0
    ? (totalConversions / totalSearches) * 100
    : 0;

  return {
    totalSearches,
    totalConversions,
    totalAlerts,
    uniqueUsers,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    avgSearchDuration: Math.round(avgSearchDuration),
    cacheHitRate: Math.round(cacheHitRate * 100) / 100,
    conversionRate: Math.round(conversionRate * 100) / 100,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Route Metrics
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get top routes by search volume
 * @param days Number of days to look back
 * @param limit Maximum number of routes to return
 * @returns Array of routes with metrics, sorted by volume descending
 */
export async function getRouteMetrics(
  days: number,
  limit: number = 10,
): Promise<RouteMetrics> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get routes with search counts
  const routeSearches = await prisma.analyticsSearch.groupBy({
    by: ["route"],
    _count: true,
    where: {
      timestamp: { gte: startDate },
    },
    orderBy: {
      _count: { route: "desc" },
    },
    take: limit,
  });

  if (routeSearches.length === 0) {
    return [];
  }

  // For each route, get detailed metrics
  const routes = await Promise.all(
    routeSearches.map(async (rs: typeof routeSearches[0]) => {
      const [conversions, topProgramData] = await Promise.all([
        // Get conversion metrics for this route
        prisma.analyticsConversion.aggregate({
          _count: true,
          _sum: { conversionValue: true },
          where: {
            route: rs.route,
            timestamp: { gte: startDate },
          },
        }),
        // Get top program for this route
        prisma.analyticsSearch.groupBy({
          by: ["program"],
          _count: true,
          where: {
            route: rs.route,
            timestamp: { gte: startDate },
            program: { not: null },
          },
          orderBy: {
            _count: { program: "desc" },
          },
          take: 1,
        }),
      ]);

      return {
        route: rs.route,
        searchCount: rs._count,
        conversionCount: conversions._count,
        totalRevenue: Math.round((conversions._sum.conversionValue ?? 0) * 100) / 100,
        topProgram: topProgramData[0]?.program ?? null,
      };
    }),
  );

  return routes;
}

// ═══════════════════════════════════════════════════════════════════════════
// User Metrics (Daily Breakdown)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get daily user metrics for the past N days
 * @param days Number of days to return (typically 30)
 * @returns Array of daily metrics, one per day
 */
export async function getUserMetrics(days: number = 30): Promise<UserMetrics> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Generate array of dates for the range
  const dateArray: Date[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - i);
    dateArray.push(date);
  }

  // Get daily aggregated metrics if available
  const dailyMetricsDb = await prisma.analyticsDailyMetrics.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: "asc" },
  });

  // Create a map for quick lookup
  const dailyMetricsMap: Map<string, AnalyticsDailyMetrics> = new Map(
    dailyMetricsDb.map((m: typeof dailyMetricsDb[0]) => [m.date.toISOString().split("T")[0], m]),
  );

  // For each date, compile metrics
  const results: UserMetrics = await Promise.all(
    dateArray.map(async (date) => {
      const dateStr = date.toISOString().split("T")[0];
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      // Check if we have pre-aggregated data
      const cached = dailyMetricsMap.get(dateStr);
      if (cached) {
        return {
          date: dateStr,
          totalUsers: cached.uniqueUsers as number,
          newUsers: 0, // Would need separate tracking
          activeUsers: cached.uniqueUsers as number,
          totalSearches: cached.searchCount as number,
          totalConversions: cached.conversions as number,
          totalRevenue: Math.round((cached.totalRevenue as number) * 100) / 100,
        };
      }

      // Otherwise, compute from raw data
      const [searches, conversions, activeUsers, newUsers] = await Promise.all([
        prisma.analyticsSearch.aggregate({
          _count: true,
          where: {
            timestamp: { gte: dayStart, lt: dayEnd },
          },
        }),
        prisma.analyticsConversion.aggregate({
          _count: true,
          _sum: { conversionValue: true },
          where: {
            timestamp: { gte: dayStart, lt: dayEnd },
          },
        }),
        prisma.analyticsSearch.findMany({
          distinct: ["userId"],
          select: { userId: true },
          where: {
            timestamp: { gte: dayStart, lt: dayEnd },
            userId: { not: null },
          },
        }),
        prisma.analyticsUser.findMany({
          select: { userId: true },
          where: {
            firstSeen: { gte: dayStart, lt: dayEnd },
          },
        }),
      ]);

      return {
        date: dateStr,
        totalUsers: activeUsers.length,
        newUsers: newUsers.length,
        activeUsers: activeUsers.length,
        totalSearches: searches._count,
        totalConversions: conversions._count,
        totalRevenue: Math.round((conversions._sum.conversionValue ?? 0) * 100) / 100,
      };
    }),
  );

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// Alert Metrics
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get alert-related metrics for a date range
 * @param days Number of days to look back
 * @returns Alert metrics including conversion rates and top alert routes
 */
export async function getAlertMetrics(days: number): Promise<AlertMetrics> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Parallel queries for alert metrics
  const [
    totalAlertsAllTime,
    alertsInPeriod,
    activeAlerts,
    alertConversions,
    topRouteData,
    topProgramData,
  ] = await Promise.all([
    // Total alerts all-time
    prisma.analyticsAlert.aggregate({
      _count: true,
    }),
    // Alerts fired in period
    prisma.analyticsAlert.aggregate({
      _count: true,
      where: {
        firedAt: { gte: startDate },
      },
    }),
    // Active alerts (status = 'active')
    prisma.analyticsAlert.aggregate({
      _count: true,
      where: {
        status: "active",
      },
    }),
    // Alert conversions (alerts with conversionValue set)
    prisma.analyticsAlert.aggregate({
      _count: true,
      where: {
        firedAt: { gte: startDate },
        conversionValue: { not: null },
      },
    }),
    // Top route for alerts
    prisma.analyticsAlert.groupBy({
      by: ["route"],
      _count: true,
      where: {
        firedAt: { gte: startDate },
      },
      orderBy: {
        _count: { route: "desc" },
      },
      take: 1,
    }),
    // Top program for alerts
    prisma.analyticsAlert.groupBy({
      by: ["program"],
      _count: true,
      where: {
        firedAt: { gte: startDate },
        program: { not: null },
      },
      orderBy: {
        _count: { program: "desc" },
      },
      take: 1,
    }),
  ]);

  const totalAlerts = totalAlertsAllTime._count;
  const alertsFired = alertsInPeriod._count;
  const activeCount = activeAlerts._count;
  const conversionsCount = alertConversions._count;

  // Calculate conversion rate
  const alertConversionRate = alertsFired > 0
    ? (conversionsCount / alertsFired) * 100
    : 0;

  return {
    totalAlertsAllTime: totalAlerts,
    alertsFiredInPeriod: alertsFired,
    activeAlerts: activeCount,
    alertConversionRate: Math.round(alertConversionRate * 100) / 100,
    topRoute: topRouteData[0]?.route ?? null,
    topProgram: topProgramData[0]?.program ?? null,
  };
}
