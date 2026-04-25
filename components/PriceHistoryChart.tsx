"use client";

import { useState, useEffect } from "react";
import type { PricePoint, PriceTrend } from "@/lib/priceHistory";

interface Props {
  from: string;
  to: string;
  lang?: "fr" | "en";
}

const TREND_ICON: Record<PriceTrend, string> = {
  up: "↑",
  down: "↓",
  stable: "→",
  unknown: "—",
};
const TREND_COLOR: Record<PriceTrend, string> = {
  up: "text-red-400",
  down: "text-success",
  stable: "text-muted",
  unknown: "text-muted",
};
const TREND_LABEL: Record<PriceTrend, { fr: string; en: string }> = {
  up: { fr: "En hausse", en: "Rising" },
  down: { fr: "En baisse", en: "Falling" },
  stable: { fr: "Stable", en: "Stable" },
  unknown: { fr: "Données insuffisantes", en: "Insufficient data" },
};

export function PriceHistoryChart({ from, to, lang = "fr" }: Props) {
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [trend, setTrend] = useState<PriceTrend>("unknown");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/price-history?from=${from}&to=${to}&days=30`)
      .then((r) => r.json())
      .then((d: { history: PricePoint[]; trend: PriceTrend }) => {
        setHistory(d.history ?? []);
        setTrend(d.trend ?? "unknown");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [from, to]);

  if (loading) return (
    <div className="rounded-2xl border border-border bg-surface p-5 animate-pulse h-32" />
  );

  if (history.length < 3) return null;

  const prices = history.map((p) => p.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  // SVG sparkline path
  const W = 400;
  const H = 80;
  const pad = 8;
  const points = history.map((p, i) => {
    const x = pad + (i / (history.length - 1)) * (W - pad * 2);
    const y = H - pad - ((p.price - minP) / range) * (H - pad * 2);
    return `${x},${y}`;
  });
  const pathD = `M ${points.join(" L ")}`;

  const latest = history[history.length - 1];
  const earliest = history[0];

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg">
          {lang === "fr" ? "Historique des prix (30j)" : "Price history (30d)"}
        </h3>
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-bold ${TREND_COLOR[trend]}`}>
            {TREND_ICON[trend]}
          </span>
          <span className={`text-xs ${TREND_COLOR[trend]}`}>
            {TREND_LABEL[trend][lang]}
          </span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-16"
          preserveAspectRatio="none"
        >
          {/* Fill area */}
          <defs>
            <linearGradient id="price-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${pathD} L ${W - pad},${H} L ${pad},${H} Z`}
            fill="url(#price-grad)"
          />
          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Last dot */}
          <circle
            cx={parseFloat(points[points.length - 1].split(",")[0])}
            cy={parseFloat(points[points.length - 1].split(",")[1])}
            r="4"
            fill="#3b82f6"
          />
        </svg>
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{earliest.date.slice(5)} — ${earliest.price}</span>
        <div className="flex items-center gap-3">
          <span>Min <span className="text-success font-bold">${minP}</span></span>
          <span>Max <span className="text-red-400 font-bold">${maxP}</span></span>
          <span>{lang === "fr" ? "Actuel" : "Current"}{" "}
            <span className="text-fg font-bold">${latest.price}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
