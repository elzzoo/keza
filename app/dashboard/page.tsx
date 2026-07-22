"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
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
        const routesData = await routesRes.json();
        setRoutes(routesData.routes || []);
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

  // Mock data for search volume trend
  const searchVolumeTrendData: ChartDataPoint[] = [
    { date: "Jan 1", searches: 2400 },
    { date: "Jan 2", searches: 1398 },
    { date: "Jan 3", searches: 9800 },
    { date: "Jan 4", searches: 3908 },
    { date: "Jan 5", searches: 4800 },
    { date: "Jan 6", searches: 3800 },
    { date: "Jan 7", searches: 4300 },
  ];

  // Transform route data for bar chart
  const routeChartData = routes.map((route) => ({
    route: route.route,
    conversions: route.conversionCount,
  }));

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-slate-950">
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              Loading dashboard...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-slate-950">
          <div className="text-center">
            <p className="text-lg font-medium text-red-600 dark:text-red-400">
              Error: {error}
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!kpis) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-slate-950">
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              No data available
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
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
              icon="📊"
              format="number"
            />

            {/* 2. Conversions */}
            <KPICard
              title="Conversions"
              value={kpis.totalConversions}
              icon="✅"
              format="number"
            />

            {/* 3. Alerts Fired */}
            <KPICard
              title="Alerts Fired"
              value={kpis.totalAlerts}
              icon="🔔"
              format="number"
            />

            {/* 4. Revenue */}
            <KPICard
              title="Revenue"
              value={kpis.totalRevenue}
              icon="💰"
              format="currency"
              unit="USD"
            />

            {/* 5. Unique Users */}
            <KPICard
              title="Unique Users"
              value={kpis.uniqueUsers}
              icon="👥"
              format="number"
            />

            {/* 6. Conversion Rate */}
            <KPICard
              title="Conversion Rate"
              value={kpis.conversionRate}
              icon="📈"
              format="percentage"
            />

            {/* 7. Cache Hit Rate */}
            <KPICard
              title="Cache Hit Rate"
              value={kpis.cacheHitRate}
              icon="⚡"
              format="percentage"
            />

            {/* 8. Avg Search Duration */}
            <KPICard
              title="Avg Search Duration"
              value={kpis.avgSearchDuration}
              icon="⏱️"
              format="number"
              unit="ms"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Search Volume Trend Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 border border-gray-200 dark:border-slate-700">
              <LineChartComponent
                title="Search Volume Trend"
                data={searchVolumeTrendData}
                dataKey="searches"
                xKey="date"
                stroke="#3b82f6"
                height={300}
              />
            </div>

            {/* Top Routes Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 border border-gray-200 dark:border-slate-700">
              {routeChartData.length > 0 ? (
                <BarChartComponent
                  title="Top 5 Routes by Conversions"
                  data={routeChartData}
                  xKey="route"
                  yKey="conversions"
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
    </DashboardLayout>
  );
}
