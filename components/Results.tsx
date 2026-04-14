"use client";

import { useState, useMemo } from "react";
import type { FlightResult } from "@/lib/engine";
import { FlightCard } from "./FlightCard";
import { FlightFilters, type SortBy } from "./FlightFilters";
import clsx from "clsx";

interface Props {
  results: FlightResult[];
  loading: boolean;
  lang: "fr" | "en";
  onBack: () => void;
}

const L = {
  fr: {
    results: "Résultats",
    found: (n: number) => `${n} vol${n > 1 ? "s" : ""} trouvé${n > 1 ? "s" : ""}`,
    best: "Meilleur prix",
    savings: "Économie max",
    all: "Tous",
    miles: "Miles",
    consider: "À considérer",
    cash: "Cash",
    empty: "Aucun vol trouvé",
    emptyDesc: "Essayez d'autres dates ou destinations.",
    back: "← Nouvelle recherche",
    loading: "Recherche en cours…",
  },
  en: {
    results: "Results",
    found: (n: number) => `${n} flight${n > 1 ? "s" : ""} found`,
    best: "Best price",
    savings: "Max savings",
    all: "All",
    miles: "Miles",
    consider: "Consider",
    cash: "Cash",
    empty: "No flights found",
    emptyDesc: "Try different dates or destinations.",
    back: "← New search",
    loading: "Searching…",
  },
};

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
      <div className="skeleton h-10 rounded-none" />
      <div className="p-5 space-y-4">
        <div className="flex justify-between">
          <div className="skeleton h-10 w-16 rounded-lg" />
          <div className="skeleton h-6 w-20 rounded-full" />
          <div className="skeleton h-10 w-16 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-6 w-24 rounded-lg" />
          <div className="skeleton h-6 w-20 rounded-lg" />
        </div>
        <div className="h-px bg-slate-100" />
        <div className="grid grid-cols-2 gap-3">
          <div className="skeleton h-20 rounded-xl" />
          <div className="skeleton h-20 rounded-xl" />
        </div>
        <div className="skeleton h-3 rounded-full" />
      </div>
    </div>
  );
}

export function Results({ results, loading, lang, onBack }: Props) {
  const t = L[lang];
  const [tab, setTab] = useState<"all" | "miles" | "consider" | "cash">("all");
  const [stopFilter, setStopFilter] = useState<"all" | "direct" | "stops">("all");
  const [sortBy, setSortBy] = useState<SortBy>("value");

  const counts = useMemo(() => ({
    miles:   results.filter(r => r.recommendation === "USE MILES").length,
    consider:results.filter(r => r.recommendation === "CONSIDER").length,
    cash:    results.filter(r => r.recommendation === "USE CASH").length,
  }), [results]);

  const bestPrice   = results.length ? Math.min(...results.map(r => r.totalPrice ?? 0)) : 0;
  const maxSavings  = results.length ? Math.max(0, ...results.map(r => r.savings ?? 0)) : 0;

  const filtered = useMemo(() => {
    let r = [...results];
    if (tab === "miles")   r = r.filter(x => x.recommendation === "USE MILES");
    if (tab === "consider") r = r.filter(x => x.recommendation === "CONSIDER");
    if (tab === "cash")    r = r.filter(x => x.recommendation === "USE CASH");
    if (stopFilter === "direct") r = r.filter(x => (x.stops ?? 0) === 0);
    if (stopFilter === "stops")  r = r.filter(x => (x.stops ?? 0) > 0);
    if (sortBy === "price") r.sort((a, b) => (a.totalPrice ?? 0) - (b.totalPrice ?? 0));
    else r.sort((a, b) => b.value - a.value);
    return r;
  }, [results, tab, stopFilter, sortBy]);

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm text-muted font-medium">{t.loading}</span>
        </div>
        {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Back + header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-sm text-muted hover:text-fg transition-colors font-medium flex items-center gap-1"
        >
          {t.back}
        </button>
        <span className="text-xs text-subtle">{t.found(results.length)}</span>
      </div>

      {/* Stat tiles */}
      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 text-center">
            <p className="text-xl font-black text-fg">{results.length}</p>
            <p className="text-[11px] text-muted mt-0.5">{lang === "fr" ? "vols trouvés" : "flights found"}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 text-center">
            <p className="text-xl font-black text-warning">${bestPrice.toFixed(0)}</p>
            <p className="text-[11px] text-muted mt-0.5">{t.best}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 text-center">
            <p className="text-xl font-black text-success">+${maxSavings.toFixed(0)}</p>
            <p className="text-[11px] text-muted mt-0.5">{t.savings}</p>
          </div>
        </div>
      )}

      {/* Recommendation tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        {(["all", "miles", "consider", "cash"] as const).map(k => {
          const count = k === "all" ? results.length : counts[k as keyof typeof counts];
          const styles = {
            all:     tab === k ? "bg-slate-900 text-white border-slate-900" : "bg-white text-muted border-slate-200 hover:border-slate-300",
            miles:   tab === k ? "bg-blue-600 text-white border-blue-600" : "bg-white text-muted border-slate-200 hover:border-blue-200 hover:text-blue-600",
            consider:tab === k ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-muted border-slate-200 hover:border-emerald-200 hover:text-emerald-600",
            cash:    tab === k ? "bg-amber-500 text-white border-amber-500" : "bg-white text-muted border-slate-200 hover:border-amber-200 hover:text-amber-600",
          };
          return (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 whitespace-nowrap",
                styles[k]
              )}
            >
              {t[k]}
              <span className={clsx(
                "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                tab === k ? "bg-white/20" : "bg-slate-100 text-muted"
              )}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      {results.length > 0 && (
        <FlightFilters
          stopFilter={stopFilter}
          sortBy={sortBy}
          onStopFilter={setStopFilter}
          onSortBy={setSortBy}
          lang={lang}
        />
      )}

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card py-16 flex flex-col items-center gap-3">
          <span className="text-5xl animate-float">✈️</span>
          <p className="font-bold text-fg">{t.empty}</p>
          <p className="text-sm text-muted">{t.emptyDesc}</p>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {filtered.map((f, i) => (
            <div key={i} className="animate-fade-up">
              <FlightCard flight={f} lang={lang} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
