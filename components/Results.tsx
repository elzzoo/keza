"use client";

import { useState, useMemo } from "react";
import type { FlightResult } from "@/lib/engine";
import { FlightCard } from "./FlightCard";
import clsx from "clsx";

type Filter = "all" | "USE MILES" | "CONSIDER" | "USE CASH";

interface ResultsProps {
  results: FlightResult[];
  loading: boolean;
  lang?: "fr" | "en";
}

const FILTER_CONFIG: { key: Filter; labelFr: string; labelEn: string; dot: string }[] = [
  { key: "all",       labelFr: "Tous",           labelEn: "All",       dot: "bg-muted"    },
  { key: "USE MILES", labelFr: "Miles",           labelEn: "Miles",     dot: "bg-accent"   },
  { key: "CONSIDER",  labelFr: "À considérer",   labelEn: "Consider",  dot: "bg-success"  },
  { key: "USE CASH",  labelFr: "Cash",            labelEn: "Cash",      dot: "bg-warn"     },
];

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border overflow-hidden border-l-[3px] border-l-border">
      <div className="p-4 pb-3 space-y-2">
        <div className="skeleton h-7 w-40 rounded-lg" />
        <div className="flex gap-2">
          <div className="skeleton h-5 w-20 rounded-md" />
          <div className="skeleton h-5 w-16 rounded-md" />
        </div>
      </div>
      <div className="px-4 pb-3 grid grid-cols-2 gap-2">
        <div className="skeleton h-20 rounded-xl" />
        <div className="skeleton h-20 rounded-xl" />
      </div>
      <div className="px-4 pb-4 space-y-2">
        <div className="skeleton h-1 rounded-full" />
        <div className="flex justify-between gap-2">
          <div className="skeleton h-7 w-32 rounded-full" />
          <div className="skeleton h-7 w-28 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function Results({ results, loading, lang = "en" }: ResultsProps) {
  const [filter, setFilter] = useState<Filter>("all");

  const sorted = useMemo(
    () =>
      [...results].sort((a, b) =>
        b.value !== a.value
          ? b.value - a.value
          : (a.totalPrice ?? a.price) - (b.totalPrice ?? b.price)
      ),
    [results]
  );

  const filtered = useMemo(
    () => (filter === "all" ? sorted : sorted.filter((f) => f.recommendation === filter)),
    [sorted, filter]
  );

  // Summary stats
  const bestPrice = useMemo(
    () => (sorted.length ? Math.min(...sorted.map((f) => f.totalPrice ?? f.price)) : null),
    [sorted]
  );
  const maxSavings = useMemo(
    () => (sorted.length ? Math.max(...sorted.map((f) => f.savings ?? 0)) : null),
    [sorted]
  );
  const counts = useMemo(() => ({
    "USE MILES": sorted.filter((f) => f.recommendation === "USE MILES").length,
    "CONSIDER":  sorted.filter((f) => f.recommendation === "CONSIDER").length,
    "USE CASH":  sorted.filter((f) => f.recommendation === "USE CASH").length,
  }), [sorted]);

  // ── Loading ───────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-3 animate-fade-in">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  // ── Empty ─────────────────────────────────────────
  if (results.length === 0) {
    return (
      <div className="text-center py-16 space-y-3 animate-fade-in">
        <div className="text-5xl">✈️</div>
        <div className="space-y-1">
          <p className="text-white font-bold text-base">
            {lang === "fr" ? "Prêt à décoller ?" : "Ready to fly?"}
          </p>
          <p className="text-sm text-muted max-w-xs mx-auto leading-relaxed">
            {lang === "fr"
              ? "Entrez votre itinéraire pour comparer les prix cash vs miles en temps réel."
              : "Enter your route to compare cash vs miles prices in real time."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Stats bar ─────────────────────────────── */}
      <div className="glass rounded-2xl px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <span className="text-white font-bold">
          {sorted.length} {lang === "fr"
            ? `vol${sorted.length > 1 ? "s" : ""} trouvé${sorted.length > 1 ? "s" : ""}`
            : `flight${sorted.length > 1 ? "s" : ""} found`}
        </span>
        {bestPrice !== null && (
          <span className="text-muted">
            {lang === "fr" ? "Meilleur prix" : "Best price"}
            {" "}
            <span className="font-bold text-white">${bestPrice.toFixed(0)}</span>
          </span>
        )}
        {maxSavings !== null && maxSavings > 0 && (
          <span className="text-muted">
            {lang === "fr" ? "Éco. max" : "Max saving"}
            {" "}
            <span className="font-bold text-success">+${maxSavings.toFixed(0)}</span>
          </span>
        )}
        <span className="ml-auto text-muted-2 hidden sm:block">
          {lang === "fr" ? "Trié par valeur miles" : "Sorted by miles value"}
        </span>
      </div>

      {/* ── Filter tabs ───────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
        {FILTER_CONFIG.map(({ key, labelFr, labelEn, dot }) => {
          const count = key === "all" ? sorted.length : counts[key as keyof typeof counts];
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={clsx(
                "flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150",
                active
                  ? "bg-accent text-white shadow-sm shadow-accent/25"
                  : "bg-card border border-border text-muted hover:text-white hover:border-border-light"
              )}
            >
              {!active && <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", dot)} />}
              {lang === "fr" ? labelFr : labelEn}
              <span className={clsx(
                "text-[10px] rounded-full px-1.5 py-0.5",
                active ? "bg-white/20" : "bg-surface-2 text-muted-2"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Flight cards ──────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-muted text-sm">
          {lang === "fr" ? "Aucun vol dans cette catégorie." : "No flights in this category."}
        </div>
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
