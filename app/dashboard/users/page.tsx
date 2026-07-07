"use client";

import { useCallback, useEffect, useState } from "react";
import { LineChartComponent } from "@/components/dashboard/Charts";

interface UserMetricsPoint {
  date: string;
  totalUsers: number;
}

interface ConversionsPoint {
  date: string;
  totalConversions: number;
}

interface DailyBreakdown {
  date: string;
  activeUsers: number;
  newUsers: number;
  searches: number;
  conversions: number;
  revenue: number;
}

interface ApiResponse {
  summary: {
    totalUsers: number;
    newUsers: number;
    totalSearches: number;
    totalConversions: number;
    totalRevenue: number;
    activeUsers: number;
    period: {
      startDate: string;
      endDate: string;
      days: number;
    };
  };
  chartData: {
    activeUsers: UserMetricsPoint[];
    conversions: ConversionsPoint[];
  };
  dailyBreakdown: DailyBreakdown[];
}

interface DashboardState {
  metrics: ApiResponse | null;
  loading: boolean;
  error: string | null;
}

export default function UsersPage() {
  const [state, setState] = useState<DashboardState>({
    metrics: null,
    loading: true,
    error: null,
  });

  const fetchMetrics = useCallback(async (days: number = 30) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch(`/api/dashboard/users?days=${days}`);
      if (!response.ok) {
        throw new Error("Failed to fetch user metrics");
      }
      const data: ApiResponse = await response.json();
      setState({ metrics: data, loading: false, error: null });
    } catch (err) {
      setState({
        metrics: null,
        loading: false,
        error: err instanceof Error ? err.message : "An error occurred",
      });
    }
  }, []);

  useEffect(() => {
    fetchMetrics(30);
  }, [fetchMetrics]);

  if (state.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard metrics...</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:bg-red-900/20 dark:border-red-800">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-300">
              Error Loading Dashboard
            </h3>
            <p className="mt-2 text-red-700 dark:text-red-400">{state.error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!state.metrics) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-gray-600 dark:text-gray-400">No data available</p>
        </div>
      </div>
    );
  }

  const { summary, chartData, dailyBreakdown } = state.metrics;

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(`${dateStr}T00:00:00`);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="bg-gray-50 dark:bg-slate-950 min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            User Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Last {summary.period.days} days · {formatDate(summary.period.startDate)} to{" "}
            {formatDate(summary.period.endDate)}
          </p>
        </div>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Users"
            value={formatNumber(summary.totalUsers)}
            color="blue"
          />
          <StatCard
            label="New Users"
            value={formatNumber(summary.newUsers)}
            color="green"
          />
          <StatCard
            label="Total Searches"
            value={formatNumber(summary.totalSearches)}
            color="purple"
          />
          <StatCard
            label="Conversions"
            value={formatNumber(summary.totalConversions)}
            color="amber"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:bg-slate-900 dark:border-slate-700">
            <LineChartComponent
              title="Active Users Over Time"
              data={chartData.activeUsers}
              dataKey="totalUsers"
              xKey="date"
              stroke="#3b82f6"
              height={300}
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:bg-slate-900 dark:border-slate-700">
            <LineChartComponent
              title="Conversions Trend"
              data={chartData.conversions}
              dataKey="totalConversions"
              xKey="date"
              stroke="#10b981"
              height={300}
            />
          </div>
        </div>

        {/* Daily Breakdown Table */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden dark:bg-slate-900 dark:border-slate-700">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Daily Breakdown
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Active Users
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    New Users
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Searches
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Conversions
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {dailyBreakdown.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-600 dark:text-gray-400"
                    >
                      No data available
                    </td>
                  </tr>
                ) : (
                  dailyBreakdown.map((row) => (
                    <tr
                      key={row.date}
                      className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <td className="px-6 py-3 text-gray-900 dark:text-white font-medium">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-900 dark:text-white font-semibold">
                        {formatNumber(row.activeUsers)}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-900 dark:text-white">
                        {formatNumber(row.newUsers)}
                      </td>
                      <td className="px-6 py-3 text-right text-gray-900 dark:text-white">
                        {formatNumber(row.searches)}
                      </td>
                      <td className="px-6 py-3 text-right text-green-600 dark:text-green-400 font-semibold">
                        {formatNumber(row.conversions)}
                      </td>
                      <td className="px-6 py-3 text-right text-blue-600 dark:text-blue-400 font-semibold">
                        {formatCurrency(row.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "blue",
}: {
  label: string;
  value: string | number;
  color?: "blue" | "green" | "purple" | "amber";
}) {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300",
    green: "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300",
    purple: "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300",
    amber: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300",
  };

  return (
    <div className={`rounded-xl border p-6 ${colorClasses[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
