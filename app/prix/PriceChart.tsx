// app/prix/PriceChart.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import type { Destination, Region } from "@/data/destinations";
import type { DestinationPriceHistory, MonthlyPrice } from "@/lib/priceHistory";
import type { DealRecommendation } from "@/lib/dealsEngine";

interface Props {
  histories: DestinationPriceHistory[];
  destinations: Destination[];
  lang: "fr" | "en";
}

type RegionFilter = "all" | Region;

const REGION_FILTERS: { key: RegionFilter; labelFr: string; labelEn: string }[] = [
  { key: "all",          labelFr: "Toutes",       labelEn: "All" },
  { key: "africa",       labelFr: "🌍 Afrique",   labelEn: "🌍 Africa" },
  { key: "europe",       labelFr: "🇪🇺 Europe",   labelEn: "🇪🇺 Europe" },
  { key: "americas",     labelFr: "🌎 Amériques", labelEn: "🌎 Americas" },
  { key: "asia",         labelFr: "🌏 Asie",      labelEn: "🌏 Asia" },
  { key: "middle-east",  labelFr: "🕌 M-Orient",  labelEn: "🕌 Mid-East" },
  { key: "oceania",      labelFr: "🇦🇺 Océanie",  labelEn: "🇦🇺 Oceania" },
];

const REC_COLORS: Record<DealRecommendation, string> = {
  USE_MILES: "#3b82f6",
  NEUTRAL:   "#10b981",
  USE_CASH:  "#f59e0b",
};

const REC_LABELS_FR: Record<DealRecommendation, string> = {
  USE_MILES: "MILES GAGNENT",
  NEUTRAL:   "SI TU AS LES MILES",
  USE_CASH:  "CASH GAGNE",
};

const REC_LABELS_EN: Record<DealRecommendation, string> = {
  USE_MILES: "MILES WIN",
  NEUTRAL:   "IF YOU HAVE MILES",
  USE_CASH:  "CASH WINS",
};

// SVG viewBox: 0 0 400 80. Points mapped into y ∈ [5, 75].
function buildSparkline(monthlyPrices: MonthlyPrice[]): {
  polylinePoints: string;
  areaPath: string;
  dots: { x: number; y: number; price: number; isBest: boolean; isWorst: boolean }[];
  minPrice: number;
  maxPrice: number;
  minIdx: number;
  maxIdx: number;
} {
  const prices = monthlyPrices.map((m) => m.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;

  const dots = monthlyPrices.map((m, i) => {
    const x = (i / 11) * 400;
    const y = 75 - ((m.price - minPrice) / range) * 70;
    return { x, y, price: m.price, isBest: false, isWorst: false };
  });

  const minIdx = prices.indexOf(minPrice);
  const maxIdx = prices.indexOf(maxPrice);

  dots[minIdx].isBest = true;
  dots[maxIdx].isWorst = true;

  const polylinePoints = dots.map((d) => `${d.x.toFixed(1)},${d.y.toFixed(1)}`).join(" ");
  const areaPath = `M0,80 L${dots.map((d) => `${d.x.toFixed(1)},${d.y.toFixed(1)}`).join(" L")} L400,80 Z`;

  return { polylinePoints, areaPath, dots, minPrice, maxPrice, minIdx, maxIdx };
}

export function PriceChart({ histories, destinations, lang }: Props) {
  const recLabels = lang === "fr" ? REC_LABELS_FR : REC_LABELS_EN;

  // Default: Africa → first Africa destination (CMN = Casablanca)
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("africa");
  const [selectedIata, setSelectedIata] = useState<string>("CMN");
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number | null>(null);

  const filteredDests = useMemo(
    () =>
      regionFilter === "all"
        ? destinations
        : destinations.filter((d) => d.region === regionFilter),
    [destinations, regionFilter]
  );

  const handleRegionChange = (key: RegionFilter) => {
    setRegionFilter(key);
    const first = key === "all" ? destinations[0] : destinations.find((d) => d.region === key);
    if (first) setSelectedIata(first.iata);
    setSelectedMonthIdx(null);
  };

  // Reset selected month when destination changes
  useEffect(() => {
    setSelectedMonthIdx(null);
  }, [selectedIata]);

  const selectedDest = destinations.find((d) => d.iata === selectedIata) ?? destinations[0];
  const history = histories.find((h) => h.iata === selectedIata) ?? histories[0];
  const { monthlyPrices, bestMonths, worstMonths } = history;

  const bestMonthLabels = bestMonths.map((i) => monthlyPrices[i].monthLabel);
  const worstMonthLabels = worstMonths.map((i) => monthlyPrices[i].monthLabel);
  const cheapestMonth = monthlyPrices[bestMonths[0] ?? 0];
  const displayMonth = selectedMonthIdx !== null ? monthlyPrices[selectedMonthIdx] : cheapestMonth;
  const chartColor = REC_COLORS[cheapestMonth.recommendation];

  const { polylinePoints, areaPath, dots, minPrice, maxPrice, minIdx, maxIdx } =
    buildSparkline(monthlyPrices);

  // x-axis label positions (every other month: Jan Mar Mai Jul Sep Nov)
  const xAxisLabels = [0, 2, 4, 6, 8, 10].map((i) => ({
    x: (i / 11) * 400,
    label: monthlyPrices[i].monthLabel,
  }));

  const gradId = `grad-${selectedIata}`;

  return (
    <div>
      {/* Region filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none -mx-4 px-4">
        {REGION_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => handleRegionChange(f.key)}
            aria-pressed={regionFilter === f.key}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
              regionFilter === f.key
                ? "bg-primary/15 border-primary/35 text-blue-400"
                : "bg-transparent border-border text-muted hover:text-fg hover:border-border/60"
            }`}
          >
            {lang === "fr" ? f.labelFr : f.labelEn}
          </button>
        ))}
      </div>

      {/* Destination pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none -mx-4 px-4">
        {filteredDests.map((d) => (
          <button
            key={d.iata}
            onClick={() => setSelectedIata(d.iata)}
            aria-pressed={selectedIata === d.iata}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
              selectedIata === d.iata
                ? "bg-primary/15 border-primary/35 text-blue-400"
                : "bg-transparent border-border text-muted hover:text-fg hover:border-border/60"
            }`}
          >
            {d.flag} {d.city}
          </button>
        ))}
      </div>

      {/* Chart card */}
      <div className="bg-surface border border-border rounded-2xl p-5">
        {/* Destination header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{selectedDest.flag}</span>
          <div>
            <div className="font-black text-fg text-base">{selectedDest.city}</div>
            <div className="text-xs text-muted">{selectedDest.country} · depuis Dakar (DSS)</div>
          </div>
        </div>

        {/* Hint text */}
        <p className="text-[11px] text-muted mb-1">
          {lang === "fr" ? "Clique sur un mois pour voir sa recommandation" : "Click a month to see its recommendation"}
        </p>

        {/* Sparkline SVG */}
        <div className="relative">
          <svg
            viewBox="0 0 400 90"
            className="w-full"
            style={{ height: "120px" }}
            aria-label={`Graphique des prix pour ${selectedDest.city}`}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColor} stopOpacity={0.25} />
                <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Area fill */}
            <path d={areaPath} fill={`url(#${gradId})`} />

            {/* Line */}
            <polyline
              points={polylinePoints}
              fill="none"
              stroke={chartColor}
              strokeWidth={2}
              strokeLinejoin="round"
            />

            {/* Dots */}
            {dots.map((dot, i) => (
              <circle
                key={i}
                cx={dot.x}
                cy={dot.y}
                r={selectedMonthIdx === i ? 6 : dot.isBest || dot.isWorst ? 4 : 2.5}
                fill={dot.isBest ? "#10b981" : dot.isWorst ? "#ef4444" : chartColor}
                opacity={1}
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedMonthIdx(i)}
              />
            ))}

            {/* Min price label */}
            <text
              x={dots[minIdx].x + (minIdx < 6 ? 6 : -6)}
              y={dots[minIdx].y - 5}
              textAnchor={minIdx < 6 ? "start" : "end"}
              fontSize={9}
              fill="#10b981"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              ${minPrice}
            </text>

            {/* Max price label */}
            <text
              x={dots[maxIdx].x + (maxIdx < 6 ? 6 : -6)}
              y={dots[maxIdx].y - 5}
              textAnchor={maxIdx < 6 ? "start" : "end"}
              fontSize={9}
              fill="#ef4444"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              ${maxPrice}
            </text>

            {/* X-axis month labels */}
            {xAxisLabels.map(({ x, label }) => (
              <text
                key={label}
                x={x}
                y={88}
                textAnchor="middle"
                fontSize={8}
                fill="#64748b"
                fontFamily="sans-serif"
              >
                {label}
              </text>
            ))}
          </svg>
        </div>

        {/* Best / worst month badges */}
        <div className="flex gap-3 mt-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-success/10 border border-success/25 rounded-lg px-3 py-1.5">
            <span className="text-success text-xs font-bold">✓</span>
            <span className="text-success text-xs font-semibold">{bestMonthLabels.join(" · ")}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-1.5">
            <span className="text-red-400 text-xs font-bold">✕</span>
            <span className="text-red-400 text-xs font-semibold">{worstMonthLabels.join(" · ")}</span>
          </div>
        </div>

        {/* KEZA note */}
        <div
          className="mt-3 rounded-xl px-4 py-3 text-xs"
          style={{
            backgroundColor: `${REC_COLORS[displayMonth.recommendation]}15`,
            border: `1px solid ${REC_COLORS[displayMonth.recommendation]}30`,
          }}
        >
          <span className="mr-1">💡</span>
          <span className="font-bold text-muted mr-1">
            {selectedMonthIdx !== null
              ? displayMonth.monthLabel
              : (lang === "fr" ? "Meilleur mois" : "Best month")}
            {" "}—
          </span>
          <span className="text-muted">
            En{" "}
            <strong style={{ color: REC_COLORS[displayMonth.recommendation] }}>
              {displayMonth.monthLabel}
            </strong>
            , tes miles valent{" "}
            <strong style={{ color: REC_COLORS[displayMonth.recommendation] }}>
              {displayMonth.cpm.toFixed(1)}¢/mile
            </strong>{" "}
            →{" "}
            <strong style={{ color: REC_COLORS[displayMonth.recommendation] }}>
              {recLabels[displayMonth.recommendation]}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}
