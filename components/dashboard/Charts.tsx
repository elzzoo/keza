"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { useEffect, useState } from "react";

// Color palette for pie chart
const COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
];

interface LineChartProps {
  title: string;
  data: Array<Record<string, any>>;
  dataKey: string;
  xKey: string;
  stroke?: string;
  height?: number;
}

interface BarChartProps {
  title: string;
  data: Array<Record<string, any>>;
  xKey: string;
  yKey: string;
  fill?: string;
  height?: number;
}

interface PieChartProps {
  title: string;
  data: Array<{ name: string; value: number }>;
  height?: number;
}

/**
 * LineChartComponent
 * Renders a line chart with grid, tooltip, and legend
 * Supports dark mode and customizable stroke color
 */
export function LineChartComponent({
  title,
  data,
  dataKey,
  xKey,
  stroke = "#3b82f6",
  height = 300,
}: LineChartProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Detect dark mode from document class or system preference
    const hasDarkClass = document.documentElement.classList.contains("dark");
    setIsDarkMode(hasDarkClass);

    // Only setup media query listener if matchMedia is available (not in test environment)
    if (typeof window !== "undefined" && window.matchMedia) {
      const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
      setIsDarkMode(hasDarkClass || darkModeQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        setIsDarkMode(e.matches);
      };

      darkModeQuery.addEventListener("change", handleChange);
      return () => darkModeQuery.removeEventListener("change", handleChange);
    }
  }, []);

  const textColor = isDarkMode ? "#e5e7eb" : "#374151";
  const gridColor = isDarkMode ? "#4b5563" : "#e5e7eb";

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey={xKey} stroke={textColor} />
          <YAxis stroke={textColor} />
          <Tooltip
            contentStyle={{
              backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
              borderColor: isDarkMode ? "#4b5563" : "#e5e7eb",
              color: textColor,
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={stroke}
            dot={{ fill: stroke }}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * BarChartComponent
 * Renders a bar chart with grid, tooltip, and legend
 * Supports dark mode and customizable bar fill color
 */
export function BarChartComponent({
  title,
  data,
  xKey,
  yKey,
  fill = "#3b82f6",
  height = 300,
}: BarChartProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Detect dark mode from document class or system preference
    const hasDarkClass = document.documentElement.classList.contains("dark");
    setIsDarkMode(hasDarkClass);

    // Only setup media query listener if matchMedia is available (not in test environment)
    if (typeof window !== "undefined" && window.matchMedia) {
      const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
      setIsDarkMode(hasDarkClass || darkModeQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        setIsDarkMode(e.matches);
      };

      darkModeQuery.addEventListener("change", handleChange);
      return () => darkModeQuery.removeEventListener("change", handleChange);
    }
  }, []);

  const textColor = isDarkMode ? "#e5e7eb" : "#374151";
  const gridColor = isDarkMode ? "#4b5563" : "#e5e7eb";

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey={xKey} stroke={textColor} />
          <YAxis stroke={textColor} />
          <Tooltip
            contentStyle={{
              backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
              borderColor: isDarkMode ? "#4b5563" : "#e5e7eb",
              color: textColor,
            }}
          />
          <Legend />
          <Bar dataKey={yKey} fill={fill} isAnimationActive={true} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * PieChartComponent
 * Renders a pie chart with colored cells and percentage labels
 * Supports dark mode and rotating color palette
 */
export function PieChartComponent({
  title,
  data,
  height = 300,
}: PieChartProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Detect dark mode from document class or system preference
    const hasDarkClass = document.documentElement.classList.contains("dark");
    setIsDarkMode(hasDarkClass);

    // Only setup media query listener if matchMedia is available (not in test environment)
    if (typeof window !== "undefined" && window.matchMedia) {
      const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
      setIsDarkMode(hasDarkClass || darkModeQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        setIsDarkMode(e.matches);
      };

      darkModeQuery.addEventListener("change", handleChange);
      return () => darkModeQuery.removeEventListener("change", handleChange);
    }
  }, []);

  // Calculate total for percentage display
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const textColor = isDarkMode ? "#e5e7eb" : "#374151";

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => {
              const percentage = ((value / total) * 100).toFixed(1);
              return `${name}: ${percentage}%`;
            }}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            isAnimationActive={true}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
              borderColor: isDarkMode ? "#4b5563" : "#e5e7eb",
              color: textColor,
            }}
            formatter={(value: number) => {
              const percentage = ((value / total) * 100).toFixed(1);
              return `${value} (${percentage}%)`;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
