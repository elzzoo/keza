"use client";

import { useState, useMemo } from "react";
import type { FlightResult } from "@/lib/engine";
import { FlightCard } from "./FlightCard";
import { FlightFilters, type SortBy } from "./FlightFilters";
import { CardRecommendation } from "./CardRecommendation";
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
    miles: "Utilisez miles",
    cash: "Payez cash",
    empty: "Aucun vol trouvé pour cette combinaison",
    emptyDesc: "Nos sources de données couvrent mieux certaines routes. Essayez :",
    emptyTips: [
      "Élargir les dates (±7 jours)",
      "Décocher le filtre \"Direct uniquement\"",
      "Utiliser DKR (Dakar ville) au lieu de DSS pour les vols long-courriers",
      "Passer par un hub (CDG, IST, DXB) pour l'Afrique ↔ USA",
    ],
    back: "← Nouvelle recherche",
    loading: "Recherche en cours…",
  },
  en: {
    results: "Results",
    found: (n: number) => `${n} flight${n > 1 ? "s" : ""} found`,
    best: "Best price",
    savings: "Max savings",
    all: "All",
    miles: "Use miles",
    cash: "Use cash",
    empty: "No flights found for this combination",
    emptyDesc: "Our data sources cover some routes better than others. Try:",
    emptyTips: [
      "Broaden the dates (±7 days)",
      "Uncheck \"Direct only\" filter",
      "Use DKR (Dakar city) instead of DSS for long-haul",
      "Route via a hub (CDG, IST, DXB) for Africa ↔ USA",
    ],
    back: "← New search",
    loading: "Searching…",
  },
};

function SkeletonCard() {
  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
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
        <div className="h-px bg-border" />
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
  const [tab, setTab] = useState<"all" | "miles" | "cash">("all");
  const [stopFilter, setStopFilter] = useState<"all" | "direct" | "stops">("all");
  const [sortBy, setSortBy] = useState<SortBy>("value");

  const counts = useMemo(() => ({
    miles: results.filter(r => r.recommendation === "USE_MILES").length,
    cash:  results.filter(r => r.recommendation === "USE_CASH").length,
  }), [results]);

  const bestPrice  = results.length ? Math.min(...results.map(r => r.totalPrice ?? 0)) : 0;
  const maxSavings = results.length ? Math.max(0, ...results.map(r => r.savings)) : 0;

  const filtered = useMemo(() => {
    let r = [...results];
    if (tab === "miles") r = r.filter(x => x.recommendation === "USE_MILES");
    if (tab === "cash")  r = r.filter(x => x.recommendation === "USE_CASH");
    if (stopFilter === "direct") r = r.filter(x => (x.stops ?? 0) === 0);
    if (stopFilter === "stops")  r = r.filter(x => (x.stops ?? 0) > 0);
    if (sortBy === "price") r.sort((a, b) => (a.totalPrice ?? 0) - (b.totalPrice ?? 0));
    else r.sort((a, b) => b.savings - a.savings);
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

  const tabStyles: Record<string, { active: string; inactive: string }> = {
    all:   { active: "bg-surface-2 text-fg border-border", inactive: "bg-surface text-muted border-border hover:border-subtle hover:text-fg" },
    miles: { active: "bg-primary/15 text-blue-400 border-primary/30", inactive: "bg-surface text-muted border-border hover:border-primary/30 hover:text-blue-400" },
    cash:  { active: "bg-warning/15 text-warning border-warning/30", inactive: "bg-surface text-muted border-border hover:border-warning/30 hover:text-warning" },
  };

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
          <div className="bg-surface rounded-xl border border-border px-4 py-3 text-center">
            <p className="text-xl font-black text-fg">{results.length}</p>
            <p className="text-[11px] text-muted mt-0.5">{lang === "fr" ? "vols trouvés" : "flights found"}</p>
          </div>
          <div className="bg-surface rounded-xl border border-border px-4 py-3 text-center">
            <p className="text-xl font-black text-warning">${bestPrice.toFixed(0)}</p>
            <p className="text-[11px] text-muted mt-0.5">{t.best}</p>
          </div>
          <div className="bg-surface rounded-xl border border-border px-4 py-3 text-center">
            <p className="text-xl font-black text-success">+${maxSavings.toFixed(0)}</p>
            <p className="text-[11px] text-muted mt-0.5">{t.savings}</p>
          </div>
        </div>
      )}

      {/* Card recommendation (transfer savings) */}
      {results.length > 0 && <CardRecommendation results={results} lang={lang} />}

      {/* Recommendation tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        {(["all", "miles", "cash"] as const).map(k => {
          const count = k === "all" ? results.length : counts[k as keyof typeof counts];
          const s = tabStyles[k];
          return (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 whitespace-nowrap",
                tab === k ? s.active : s.inactive
              )}
            >
              {t[k]}
              <span className={clsx(
                "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                tab === k ? "bg-white/15" : "bg-surface-2 text-muted"
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
        <div className="bg-surface rounded-2xl border border-border py-12 px-6 flex flex-col items-center gap-3 max-w-md mx-auto">
          <span className="text-5xl animate-float">✈️</span>
          <p className="font-bold text-fg text-center">{t.empty}</p>
          <p className="text-sm text-muted text-center">{t.emptyDesc}</p>
          <ul className="text-sm text-muted space-y-1.5 mt-2 list-disc list-inside self-start">
            {t.emptyTips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
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
