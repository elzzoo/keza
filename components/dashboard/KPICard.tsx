"use client";

import clsx from "clsx";

interface KPICardProps {
  /** Title of the KPI metric */
  title: string;
  /** The numeric value to display */
  value: number;
  /** Optional icon to display (emoji or character) */
  icon?: string;
  /** Optional trend value (positive or negative percentage) */
  trend?: number;
  /** Format for displaying the value: "number" | "currency" | "percentage" */
  format?: "number" | "currency" | "percentage";
  /** Optional unit for the value (e.g., "USD", "km") */
  unit?: string;
}

/**
 * Format a numeric value according to the specified format
 * @param value - The number to format
 * @param format - The format type: "number" | "currency" | "percentage"
 * @param unit - Optional unit (e.g., "USD" for currency)
 * @returns Formatted string
 */
function formatValue(
  value: number,
  format: "number" | "currency" | "percentage" = "number",
  unit?: string
): string {
  switch (format) {
    case "currency": {
      const formatter = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: unit || "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      return formatter.format(value);
    }
    case "percentage": {
      const formatter = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      });
      return `${formatter.format(value)}%`;
    }
    case "number":
    default: {
      const formatter = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      return formatter.format(value);
    }
  }
}

export function KPICard({
  title,
  value,
  icon,
  trend,
  format = "number",
  unit,
}: KPICardProps) {
  const formattedValue = formatValue(value, format, unit);
  const isTrendPositive = trend !== undefined && trend >= 0;
  const trendArrow = isTrendPositive ? "↑" : "↓";
  const trendValue = Math.abs(trend || 0);

  return (
    <div className={clsx(
      "rounded-lg shadow p-6",
      "bg-white dark:bg-slate-900",
      "border border-gray-200 dark:border-slate-700"
    )}>
      {/* Header with title and icon */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </h3>
        {icon && <span className="text-xl">{icon}</span>}
      </div>

      {/* Main value */}
      <div className="flex items-baseline justify-between">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {formattedValue}
        </div>

        {/* Trend indicator */}
        {trend !== undefined && (
          <div
            className={clsx(
              "text-sm font-semibold",
              isTrendPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}
          >
            {trendArrow} {trendValue}%
          </div>
        )}
      </div>

      {/* Unit display (if present and not currency) */}
      {unit && format !== "currency" && (
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
          {unit}
        </p>
      )}
    </div>
  );
}
