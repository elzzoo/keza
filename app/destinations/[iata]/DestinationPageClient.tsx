"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchForm } from "@/components/SearchForm";
import { Results } from "@/components/Results";
import type { Destination } from "@/data/destinations";
import { DESTINATIONS } from "@/data/destinations";
import type { DealRecommendation } from "@/lib/dealsEngine";
import type { DestinationPriceHistory } from "@/lib/priceHistory";
import type { FlightResult } from "@/lib/engine";
import { PriceAlertForm } from "@/components/PriceAlertForm";

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  dest: Destination;
  cpm: number;
  recommendation: DealRecommendation;
  history: DestinationPriceHistory;
}

// ─── Constants ───────────────────────────────────────────────────────────────

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

// ─── Sparkline builder ───────────────────────────────────────────────────────

export function buildSparklinePoints(history: DestinationPriceHistory) {
  const prices = history.monthlyPrices.map((m) => m.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  const points = history.monthlyPrices.map((m, i) => ({
    x: (i / 11) * 380 + 10,
    y: 70 - ((m.price - minP) / range) * 60 + 5,
    isBest: history.bestMonths.includes(i),
    isWorst: history.worstMonths.includes(i),
    label: m.monthLabel,
    price: m.price,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  const area =
    `M ${points[0].x},75 ` +
    points.map((p) => `L ${p.x},${p.y}`).join(" ") +
    ` L ${points[points.length - 1].x},75 Z`;

  return { points, polyline, area, minP, maxP };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DestinationPageClient({ dest, cpm, recommendation, history }: Props) {
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [results, setResults] = useState<FlightResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const fr = lang === "fr";

  const recLabels = fr ? REC_LABELS_FR : REC_LABELS_EN;
  const color = REC_COLORS[recommendation];

  // Sparkline
  const { points, polyline, area, minP, maxP } = useMemo(
    () => buildSparklinePoints(history),
    [history]
  );
  const minIdx = points.findIndex((p) => p.price === minP);
  const maxIdx = points.findIndex((p) => p.price === maxP);

  // Best/worst month labels
  const bestLabels = history.bestMonths.map((i) => history.monthlyPrices[i].monthLabel);
  const worstLabels = history.worstMonths.map((i) => history.monthlyPrices[i].monthLabel);

  // KEZA note — cheapest month
  const cheapestMonth = useMemo(
    () => history.monthlyPrices.reduce((min, m) => m.price < min.price ? m : min),
    [history]
  );

  // Related destinations — same region, max 4
  const related = useMemo(
    () => DESTINATIONS.filter((d) => d.iata !== dest.iata && d.region === dest.region).slice(0, 4),
    [dest.iata, dest.region]
  );

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header lang={lang} onLangChange={setLang} />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pb-12">
        {/* Breadcrumb */}
        <nav className="pt-4 pb-2 text-xs text-muted">
          <Link href="/" className="hover:text-fg transition-colors">KEZA</Link>
          <span className="mx-1.5">/</span>
          <Link href="/carte" className="hover:text-fg transition-colors">
            {"Destinations"}
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-fg">{dest.city}</span>
        </nav>

        {/* Hero */}
        <div className="pt-4 pb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">{dest.flag}</span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-fg leading-tight">
                {dest.city}
              </h1>
              <p className="text-sm text-muted">{dest.country}</p>
            </div>
          </div>

          {/* Recommendation badge */}
          <div
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black mb-3"
            style={{
              backgroundColor: `${color}22`,
              color,
              border: `1px solid ${color}44`,
            }}
          >
            {recLabels[recommendation]}
          </div>

          <p className="text-sm text-muted">
            {fr
              ? `Vols depuis Dakar estimés à $${dest.cashEstimateUsd} · ${(dest.milesEstimate / 1000).toFixed(0)}k miles`
              : `Flights from Dakar estimated at $${dest.cashEstimateUsd} · ${(dest.milesEstimate / 1000).toFixed(0)}k miles`
            }
          </p>
        </div>

        {/* Deal card */}
        <div className="bg-surface border border-border rounded-2xl p-4 mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-muted mb-1">{fr ? "Cash" : "Cash"}</div>
              <div className="text-xl font-black text-fg">${dest.cashEstimateUsd}</div>
            </div>
            <div>
              <div className="text-xs text-muted mb-1">{fr ? "Miles" : "Miles"}</div>
              <div className="text-xl font-black text-fg">
                {(dest.milesEstimate / 1000).toFixed(0)}k
              </div>
            </div>
            <div>
              <div className="text-xs text-muted mb-1">CPM</div>
              <div className="text-xl font-black text-fg">
                {cpm.toFixed(1)}¢
              </div>
            </div>
          </div>
        </div>

        {/* Compare CTA */}
        <div className="mb-6">
          <Link
            href={`/comparer?a=${dest.iata}`}
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg border border-border hover:border-primary/40 rounded-xl px-4 py-2.5 transition-all hover:bg-primary/5"
          >
            📊 {fr ? "Comparer avec d'autres destinations →" : "Compare with other destinations →"}
          </Link>
        </div>

        {/* Sparkline */}
        <div className="bg-surface border border-border rounded-2xl p-4 mb-4">
          <h2 className="text-sm font-bold text-fg uppercase tracking-wide mb-3">
            {fr ? "Prix estimés sur 12 mois" : "Estimated prices over 12 months"}
          </h2>

          <svg
            role="img"
            viewBox="0 0 400 90"
            className="w-full"
            aria-label={fr ? "Graphique de saisonnalité" : "Seasonality chart"}
          >
            <defs>
              <linearGradient id={`grad-${dest.iata}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={color} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Area fill */}
            <path d={area} fill={`url(#grad-${dest.iata})`} />

            {/* Line */}
            <polyline
              points={polyline}
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Data points */}
            {points.map((p, i) => (
              <circle
                key={i}
                className="data-point"
                cx={p.x}
                cy={p.y}
                r={3}
                fill={
                  p.isBest ? "#10b981" :
                  p.isWorst ? "#ef4444" :
                  "#6b7280"
                }
              />
            ))}

            {/* Month labels — every other month */}
            {points
              .filter((_, i) => i % 2 === 0)
              .map((p, i) => (
                <text
                  key={i}
                  x={p.x}
                  y={88}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#6b7280"
                >
                  {p.label}
                </text>
              ))}

            {/* Min price label */}
            <text
              x={points[minIdx].x}
              y={points[minIdx].y - 6}
              textAnchor="middle"
              fontSize="8"
              fill="#10b981"
              fontWeight="bold"
            >
              ${minP}
            </text>

            {/* Max price label */}
            <text
              x={points[maxIdx].x}
              y={Math.max(points[maxIdx].y - 6, 8)}
              textAnchor="middle"
              fontSize="8"
              fill="#ef4444"
              fontWeight="bold"
            >
              ${maxP}
            </text>
          </svg>

          {/* Best / worst badges */}
          <div className="flex flex-wrap gap-2 mt-3">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-400">
              ✓ {bestLabels.join(" · ")}
            </div>
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] font-semibold text-red-400">
              ✕ {worstLabels.join(" · ")}
            </div>
          </div>

          {/* KEZA note */}
          <p className="text-xs text-muted mt-3 border-t border-border pt-3">
            💡 {fr
              ? `En ${cheapestMonth.monthLabel}, tes miles valent ${cheapestMonth.cpm.toFixed(1)}¢/mile → ${REC_LABELS_FR[cheapestMonth.recommendation]}`
              : `In ${cheapestMonth.monthLabel}, your miles are worth ${cheapestMonth.cpm.toFixed(1)}¢/mile → ${REC_LABELS_EN[cheapestMonth.recommendation]}`
            }
          </p>
        </div>

        {/* Search form */}
        <div className="mb-2">
          <p className="text-xs text-muted mb-3">
            {fr
              ? "Prix live — entre tes dates pour une comparaison exacte :"
              : "Live prices — enter your dates for an exact comparison:"
            }
          </p>
          <SearchForm
            onResults={(r) => { setResults(r); setHasSearched(true); }}
            onLoading={setLoading}
            lang={lang}
            initialFrom="DSS"
            initialTo={dest.iata}
          />
        </div>

        {/* Price alert */}
        {!hasSearched && (
          <div className="mt-4">
            <PriceAlertForm
              from="DSS"
              to={dest.iata}
              cabin="economy"
              currentPrice={dest.cashEstimateUsd}
              lang={lang}
            />
          </div>
        )}

        {/* Results */}
        {(hasSearched || loading) && (
          <div className="mt-6">
            <Results
              results={results}
              loading={loading}
              lang={lang}
              onBack={() => { setResults([]); setHasSearched(false); }}
            />
          </div>
        )}

        {/* Related destinations */}
        {related.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">
              {fr ? "Destinations similaires" : "Similar destinations"}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {related.map((d) => (
                <Link
                  key={d.iata}
                  href={`/destinations/${d.iata.toLowerCase()}`}
                  className="bg-surface border border-border rounded-xl px-4 py-3 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{d.flag}</span>
                    <div>
                      <div className="text-sm font-bold text-fg">{d.city}</div>
                      <div className="text-[11px] text-muted">{d.country}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer lang={lang} />
    </div>
  );
}
