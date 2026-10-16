"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { KPICard } from "@/components/dashboard/KPICard";

// recharts was previously imported statically here, making this route (and
// /dashboard/users, /dashboard/routes) the 3 largest bundles in the app
// (347-349kB First Load JS) despite being admin-only pages.
const LineChartComponent = dynamic(
  () => import("@/components/dashboard/Charts").then((m) => m.LineChartComponent),
  { ssr: false }
);
const BarChartComponent = dynamic(
  () => import("@/components/dashboard/Charts").then((m) => m.BarChartComponent),
  { ssr: false }
);

interface KPIMetrics {
  totalSearches: number;
  totalConversions: number;
  totalAlerts: number;
  uniqueUsers: number;
  totalRevenue: number;
  avgSearchDuration: number;
  cacheHitRate: number;
  conversionRate: number;
  dailySearches: ChartDataPoint[];
}

interface RouteMetric {
  route: string;
  searchCount: number;
  conversionCount: number;
  totalRevenue: number;
  topProgram: string | null;
}

interface ChartDataPoint {
  date: string;
  searches: number;
}

type DashboardIconName =
  | "searches"
  | "conversions"
  | "alerts"
  | "revenue"
  | "users"
  | "conversionRate"
  | "cache"
  | "duration";

function DashboardIcon({ name }: { name: DashboardIconName }) {
  const common = {
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "searches") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
        <path d="M5 19V9" {...common} />
        <path d="M12 19V5" {...common} />
        <path d="M19 19v-7" {...common} />
      </svg>
    );
  }

  if (name === "conversions") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
        <path d="M5 13l4 4L19 7" {...common} />
      </svg>
    );
  }

  if (name === "alerts") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
        <path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Z" {...common} />
        <path d="M10 21h4" {...common} />
      </svg>
    );
  }

  if (name === "revenue") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
        <path d="M12 3v18" {...common} />
        <path d="M17 7.5C15.8 6.5 14.2 6 12.5 6 9.5 6 8 7.1 8 9s1.4 2.7 4.5 3.2C15.7 12.7 17 13.8 17 15.8S15.2 19 12.3 19c-2 0-3.7-.6-5.1-1.8" {...common} />
      </svg>
    );
  }

  if (name === "users") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
        <path d="M16 11a4 4 0 1 0-8 0" {...common} />
        <path d="M4 21a8 8 0 0 1 16 0" {...common} />
        <path d="M18 8a3 3 0 0 1 2 5" {...common} />
      </svg>
    );
  }

  if (name === "conversionRate") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
        <path d="M4 17l5-5 4 4 7-9" {...common} />
        <path d="M15 7h5v5" {...common} />
      </svg>
    );
  }

  if (name === "cache") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
        <path d="M13 2L4 14h7l-1 8 10-13h-7l1-7Z" {...common} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
      <circle cx="12" cy="12" r="8" {...common} />
      <path d="M12 7v5l3 3" {...common} />
    </svg>
  );
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPIMetrics | null>(null);
  const [routes, setRoutes] = useState<RouteMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch overview KPIs
        const overviewRes = await fetch("/api/dashboard/overview?days=30");
        if (!overviewRes.ok) {
          throw new Error(`Failed to fetch overview: ${overviewRes.statusText}`);
        }
        const overviewData: KPIMetrics = await overviewRes.json();
        setKpis(overviewData);

        // Fetch top routes
        const routesRes = await fetch("/api/dashboard/routes?days=30&limit=5");
        if (!routesRes.ok) {
          throw new Error(`Failed to fetch routes: ${routesRes.statusText}`);
        }
        const routesData: RouteMetric[] = await routesRes.json();
        setRoutes(routesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        setKpis(null);
        setRoutes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Transform route data for bar chart
  const routeChartData = routes.map((route) => ({
    route: route.route,
    searches: route.searchCount,
  }));

  if (loading) {
    return (
        <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-slate-950">
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              Loading dashboard...
            </p>
          </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-slate-950">
          <div className="text-center">
            <p className="text-lg font-medium text-red-600 dark:text-red-400">
              Error: {error}
            </p>
          </div>
        </div>
    );
  }

  if (!kpis) {
    return (
        <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-slate-950">
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              No data available
            </p>
          </div>
        </div>
    );
  }

  return (
      <div className="bg-gray-50 dark:bg-slate-950 min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Dashboard Overview
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Key metrics and insights for the last 30 days
            </p>
          </div>

          {/* KPI Cards Grid - 8 Cards in 2 rows of 4 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* 1. Total Searches */}
            <KPICard
              title="Total Searches"
              value={kpis.totalSearches}
              icon={<DashboardIcon name="searches" />}
              format="number"
            />

            {/* 2. Conversions */}
            <KPICard
              title="Conversions"
              value={kpis.totalConversions}
              icon={<DashboardIcon name="conversions" />}
              format="number"
            />

            {/* 3. Alerts Fired */}
            <KPICard
              title="Alerts Fired"
              value={kpis.totalAlerts}
              icon={<DashboardIcon name="alerts" />}
              format="number"
            />

            {/* 4. Revenue */}
            <KPICard
              title="Revenue"
              value={kpis.totalRevenue}
              icon={<DashboardIcon name="revenue" />}
              format="currency"
              unit="USD"
            />

            {/* 5. Unique Users */}
            <KPICard
              title="Unique Users"
              value={kpis.uniqueUsers}
              icon={<DashboardIcon name="users" />}
              format="number"
            />

            {/* 6. Conversion Rate */}
            <KPICard
              title="Conversion Rate"
              value={kpis.conversionRate}
              icon={<DashboardIcon name="conversionRate" />}
              format="percentage"
            />

            {/* 7. Cache Hit Rate */}
            <KPICard
              title="Cache Hit Rate"
              value={kpis.cacheHitRate}
              icon={<DashboardIcon name="cache" />}
              format="percentage"
            />

            {/* 8. Avg Search Duration */}
            <KPICard
              title="Avg Search Duration"
              value={kpis.avgSearchDuration}
              icon={<DashboardIcon name="duration" />}
              format="number"
              unit="ms"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Search Volume Trend Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 border border-gray-200 dark:border-slate-700">
              {kpis.dailySearches.some((day) => day.searches > 0) ? (
                <LineChartComponent
                  title="Search Volume Trend"
                  data={kpis.dailySearches}
                  dataKey="searches"
                  xKey="date"
                  stroke="#3b82f6"
                  height={300}
                />
              ) : (
                <div className="flex h-[300px] items-center justify-center text-gray-600 dark:text-gray-400">
                  No search data available
                </div>
              )}
            </div>

            {/* Top Routes Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 border border-gray-200 dark:border-slate-700">
              {routeChartData.length > 0 ? (
                <BarChartComponent
                  title="Top 5 Routes by Searches"
                  data={routeChartData}
                  xKey="route"
                  yKey="searches"
                  fill="#10b981"
                  height={300}
                />
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <p className="text-gray-600 dark:text-gray-400">
                    No route data available
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}
