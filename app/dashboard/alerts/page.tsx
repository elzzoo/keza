"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

interface AlertMetrics {
  totalAlertsAllTime: number;
  alertsFiredInPeriod: number;
  activeAlerts: number;
  alertConversionRate: number;
  topRoute: string | null;
  topProgram: string | null;
}

export default function AlertsPage() {
  const [metrics, setMetrics] = useState<AlertMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/dashboard/alerts?days=30");

      if (!response.ok) {
        throw new Error("Failed to fetch alert metrics");
      }

      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const activeRatio =
    metrics && metrics.totalAlertsAllTime > 0
      ? (metrics.activeAlerts / metrics.totalAlertsAllTime) * 100
      : 0;

  const conversionRate = metrics?.alertConversionRate ?? 0;

  return (
    <DashboardLayout>
      <div className="flex-1 overflow-auto bg-bg text-fg">
        <div className="p-8">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Alert Analytics</h1>
            <p className="text-muted">Track alert performance and effectiveness metrics</p>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-200">
              <p className="font-semibold">Error loading metrics</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center min-h-96">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-muted">Loading metrics...</p>
              </div>
            </div>
          )}

          {/* Metrics Content */}
          {!loading && metrics && (
            <>
              {/* Alert Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Total Alerts All Time */}
                <div className="bg-surface-1 border border-border rounded-lg p-6 dark:bg-slate-800 dark:border-slate-700">
                  <div className="flex flex-col h-full">
                    <h3 className="text-sm font-medium text-muted mb-2">
                      Total Alerts All Time
                    </h3>
                    <div className="text-3xl font-bold text-primary mb-2">
                      {metrics.totalAlertsAllTime.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted">Cumulative alerts created</p>
                  </div>
                </div>

                {/* Alerts Fired (30d) */}
                <div className="bg-surface-1 border border-border rounded-lg p-6 dark:bg-slate-800 dark:border-slate-700">
                  <div className="flex flex-col h-full">
                    <h3 className="text-sm font-medium text-muted mb-2">
                      Alerts Fired (30d)
                    </h3>
                    <div className="text-3xl font-bold text-blue-500 mb-2">
                      {metrics.alertsFiredInPeriod.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted">In the last 30 days</p>
                  </div>
                </div>

                {/* Active Alerts */}
                <div className="bg-surface-1 border border-border rounded-lg p-6 dark:bg-slate-800 dark:border-slate-700">
                  <div className="flex flex-col h-full">
                    <h3 className="text-sm font-medium text-muted mb-2">
                      Active Alerts
                    </h3>
                    <div className="text-3xl font-bold text-green-500 mb-2">
                      {metrics.activeAlerts.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted">Currently monitoring</p>
                  </div>
                </div>

                {/* Conversion Rate */}
                <div className="bg-surface-1 border border-border rounded-lg p-6 dark:bg-slate-800 dark:border-slate-700">
                  <div className="flex flex-col h-full">
                    <h3 className="text-sm font-medium text-muted mb-2">
                      Conversion Rate (%)
                    </h3>
                    <div className="text-3xl font-bold text-purple-500 mb-2">
                      {conversionRate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted">Alert to booking conversion</p>
                  </div>
                </div>
              </div>

              {/* Info Boxes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Top Route for Alerts */}
                <div className="bg-surface-1 border border-border rounded-lg p-8 dark:bg-slate-800 dark:border-slate-700">
                  <h3 className="text-sm font-medium text-muted mb-4">
                    Top Route for Alerts
                  </h3>
                  <div className="text-4xl font-bold text-primary">
                    {metrics.topRoute ? (
                      <span>{metrics.topRoute}</span>
                    ) : (
                      <span className="text-muted text-2xl">No data</span>
                    )}
                  </div>
                  {metrics.topRoute && (
                    <p className="text-xs text-muted mt-2">Most monitored route</p>
                  )}
                </div>

                {/* Top Program for Alerts */}
                <div className="bg-surface-1 border border-border rounded-lg p-8 dark:bg-slate-800 dark:border-slate-700">
                  <h3 className="text-sm font-medium text-muted mb-4">
                    Top Program for Alerts
                  </h3>
                  <div className="text-4xl font-bold text-primary capitalize">
                    {metrics.topProgram ? (
                      <span>{metrics.topProgram}</span>
                    ) : (
                      <span className="text-muted text-2xl">No data</span>
                    )}
                  </div>
                  {metrics.topProgram && (
                    <p className="text-xs text-muted mt-2">Most popular loyalty program</p>
                  )}
                </div>
              </div>

              {/* Health Indicators */}
              <div className="bg-surface-1 border border-border rounded-lg p-6 dark:bg-slate-800 dark:border-slate-700">
                <h2 className="text-lg font-semibold mb-6">Alert Health Indicators</h2>

                <div className="space-y-6">
                  {/* Active Alert Ratio */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-fg">Active Alert Ratio</span>
                      <span className="text-sm font-semibold text-primary">
                        {activeRatio.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-surface-2 rounded-full h-2 overflow-hidden dark:bg-slate-700">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                        style={{ width: `${Math.min(activeRatio, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-muted mt-2">
                      {metrics.activeAlerts} of {metrics.totalAlertsAllTime} alerts are active
                    </p>
                  </div>

                  {/* Conversion Effectiveness */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-fg">Conversion Effectiveness</span>
                      <span className="text-sm font-semibold text-primary">
                        {conversionRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-surface-2 rounded-full h-2 overflow-hidden dark:bg-slate-700">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
                        style={{ width: `${Math.min(conversionRate, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-muted mt-2">
                      {conversionRate > 50
                        ? "Excellent conversion rate"
                        : conversionRate > 20
                          ? "Good conversion rate"
                          : "Room for improvement"}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
