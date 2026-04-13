"use client";

import { useState, useMemo } from "react";
import type { FlightResult } from "@/lib/engine";
import { FlightCard } from "./FlightCard";
import clsx from "clsx";

type Filter = "all" | "USE MILES" | "CONSIDER" | "USE CASH";

interface Props { results: FlightResult[]; loading: boolean; lang?: "fr" | "en" }

const FILTERS: { key: Filter; fr: string; en: string; color: string }[] = [
  { key: "all",       fr: "Tous",         en: "All",      color: "#94A3B8" },
  { key: "USE MILES", fr: "Miles",        en: "Miles",    color: "#93C5FD" },
  { key: "CONSIDER",  fr: "À considérer", en: "Consider", color: "#6EE7B7" },
  { key: "USE CASH",  fr: "Cash",         en: "Cash",     color: "#FCD34D" },
];

function Skeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/[0.05] animate-fade-in">
      <div className="skeleton h-11 w-full" />
      <div className="p-5 space-y-4">
        <div className="flex justify-between">
          <div className="skeleton h-10 w-24 rounded-lg" />
          <div className="skeleton h-6 w-16 rounded-full" />
          <div className="skeleton h-10 w-24 rounded-lg" />
        </div>
        <div className="skeleton h-px w-full" />
        <div className="grid grid-cols-2 gap-3">
          <div className="skeleton h-20 rounded-xl" />
          <div className="skeleton h-20 rounded-xl" />
        </div>
        <div className="skeleton h-1 rounded-full" />
        <div className="flex gap-2">
          <div className="skeleton h-7 w-32 rounded-full" />
          <div className="skeleton h-7 w-24 rounded-full ml-auto" />
        </div>
      </div>
    </div>
  );
}

export function Results({ results, loading, lang = "en" }: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  const sorted = useMemo(
    () => [...results].sort((a, b) =>
      b.value !== a.value ? b.value - a.value : (a.totalPrice ?? a.price) - (b.totalPrice ?? b.price)
    ),
    [results]
  );

  const filtered = useMemo(
    () => filter === "all" ? sorted : sorted.filter(f => f.recommendation === filter),
    [sorted, filter]
  );

  const counts = useMemo(() => ({
    "USE MILES": sorted.filter(f => f.recommendation === "USE MILES").length,
    "CONSIDER":  sorted.filter(f => f.recommendation === "CONSIDER").length,
    "USE CASH":  sorted.filter(f => f.recommendation === "USE CASH").length,
  }), [sorted]);

  const bestPrice  = sorted.length ? Math.min(...sorted.map(f => f.totalPrice ?? f.price)) : null;
  const maxSavings = sorted.length ? Math.max(...sorted.map(f => f.savings ?? 0)) : null;

  if (loading) {
    return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} />)}</div>;
  }

  if (!results.length) {
    return (
      <div className="text-center py-20 space-y-4 animate-fade-in">
        <div className="text-6xl animate-[float_6s_ease-in-out_infinite]">✈️</div>
        <div className="space-y-1.5">
          <p className="text-white font-bold text-lg">
            {lang === "fr" ? "Prêt à décoller ?" : "Ready for takeoff?"}
          </p>
          <p className="text-sm text-muted max-w-xs mx-auto leading-relaxed">
            {lang === "fr"
              ? "Entrez votre itinéraire ci-dessus pour comparer cash vs miles instantanément."
              : "Enter your route above to compare cash vs miles instantly."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Stat tiles ───────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          {
            value: sorted.length.toString(),
            label: lang === "fr" ? `vol${sorted.length > 1 ? "s" : ""} trouvé${sorted.length > 1 ? "s" : ""}` : `flight${sorted.length > 1 ? "s" : ""}`,
            color: "#94A3B8",
          },
          {
            value: bestPrice !== null ? `$${bestPrice.toFixed(0)}` : "—",
            label: lang === "fr" ? "meilleur prix" : "best price",
            color: "#FCD34D",
          },
          {
            value: maxSavings !== null && maxSavings > 0 ? `+$${maxSavings.toFixed(0)}` : "—",
            label: lang === "fr" ? "économie max" : "max saving",
            color: "#6EE7B7",
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xl font-black font-mono tabular-nums" style={{ color: stat.color }}>
              {stat.value}
            </p>
            <p className="text-[10px] text-muted mt-0.5 leading-tight">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter tabs ──────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
        {FILTERS.map(({ key, fr, en, color }) => {
          const count  = key === "all" ? sorted.length : counts[key as keyof typeof counts];
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={clsx(
                "flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150",
                active
                  ? "text-bg shadow-sm"
                  : "bg-card border border-border text-muted hover:text-white hover:border-border-light"
              )}
              style={active ? { backgroundColor: color, borderColor: color } : {}}
            >
              {!active && (
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              )}
              {lang === "fr" ? fr : en}
              <span className={clsx(
                "text-[10px] rounded-full px-1.5 py-px tabular-nums",
                active ? "bg-black/20" : "bg-surface text-muted-2"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Cards ────────────────────────────────── */}
      {filtered.length === 0 ? (
        <p className="text-center py-10 text-muted text-sm">
          {lang === "fr" ? "Aucun vol dans cette catégorie." : "No flights in this category."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((flight) => (
            <FlightCard
              key={`${flight.from}-${flight.to}-${flight.airlines[0] ?? ""}-${flight.price}`}
              flight={flight}
              lang={lang}
            />
          ))}
        </div>
      )}
    </div>
  );
}
