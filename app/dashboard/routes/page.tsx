"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { BarChartComponent } from "@/components/dashboard/Charts";

interface Route {
  route: string;
  searchCount: number;
  conversionCount: number;
  totalRevenue: number;
  topProgram: string | null;
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRoutes() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/dashboard/routes?days=30&limit=50");

        if (!response.ok) {
          throw new Error(`Failed to fetch routes: ${response.statusText}`);
        }

        const data: Route[] = await response.json();
        setRoutes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        console.error("Error fetching routes:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchRoutes();
  }, []);

  // Prepare chart data from top 10 routes
  const chartData = routes.slice(0, 10).map((route) => ({
    route: route.route,
    searches: route.searchCount,
  }));

  // Format number with commas
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  // Format currency
  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <DashboardLayout>
      <div className="p-8 bg-white dark:bg-slate-950 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Page Title */}
          <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
            Routes Analytics
          </h1>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-lg text-gray-600 dark:text-gray-400">
                Loading routes data...
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-300 font-medium">
                Error: {error}
              </p>
            </div>
          )}

          {/* Chart Section */}
          {!loading && routes.length > 0 && (
            <>
              <div className="mb-10 bg-white dark:bg-slate-900 p-6 rounded-lg shadow border border-gray-200 dark:border-slate-700">
                <BarChartComponent
                  title="Top 10 Routes by Search Volume"
                  data={chartData}
                  xKey="route"
                  yKey="searches"
                  fill="#3b82f6"
                  height={350}
                />
              </div>

              {/* Table Section */}
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Route
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Searches
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Conversions
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Revenue
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Top Program
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                      {routes.map((route, index) => (
                        <tr
                          key={`${route.route}-${index}`}
                          className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors duration-150 cursor-default"
                        >
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {route.route}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {formatNumber(route.searchCount)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {route.conversionCount}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {formatCurrency(route.totalRevenue)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                            {route.topProgram ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Empty State */}
                {routes.length === 0 && (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">
                      No routes data available
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
