"use client";

import { useState, useCallback } from "react";
import clsx from "clsx";
import type { FlightResult } from "@/lib/engine";

interface SearchParams {
  from: string;
  to: string;
  cabin: string;
  tripType: "oneway" | "roundtrip";
  passengers?: number;
}

interface DateComparison {
  date: string;
  loading: boolean;
  error?: string;
  result?: FlightResult;
}

interface MultiDateCompareProps {
  searchParams: SearchParams;
  lang: "fr" | "en";
  formatPrice?: (usd: number) => string;
}

const t = {
  title: { fr: "Comparaison multi-dates", en: "Multi-date comparison" },
  addBtn: { fr: "+ Comparer des dates", en: "+ Compare dates" },
  close: { fr: "Fermer", en: "Close" },
  date: { fr: "Date", en: "Date" },
  cash: { fr: "Prix cash", en: "Cash price" },
  miles: { fr: "Meilleure option miles", en: "Best miles option" },
  savings: { fr: "Économies", en: "Savings" },
  reco: { fr: "Recommandation", en: "Recommendation" },
  best: { fr: "Meilleur choix", en: "Best choice" },
  loading: { fr: "Chargement...", en: "Loading..." },
  error: { fr: "Erreur", en: "Error" },
  maxDates: { fr: "Maximum 3 dates", en: "Maximum 3 dates" },
  remove: { fr: "Retirer", en: "Remove" },
  noResults: { fr: "Aucun résultat", en: "No results" },
  useMiles: { fr: "MILES GAGNENT", en: "USE MILES" },
  useCash: { fr: "CASH GAGNE", en: "USE CASH" },
};

export function MultiDateCompare({ searchParams, lang, formatPrice }: MultiDateCompareProps) {
  const [open, setOpen] = useState(false);
  const [dates, setDates] = useState<DateComparison[]>([]);
  const [dateInput, setDateInput] = useState("");

  const fmt = formatPrice ?? ((v: number) => `$${v.toFixed(0)}`);

  const fetchDate = useCallback(async (date: string) => {
    const body = {
      from: searchParams.from,
      to: searchParams.to,
      date,
      tripType: searchParams.tripType,
      cabin: searchParams.cabin,
      passengers: searchParams.passengers ?? 1,
      userPrograms: [],
    };

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const results: FlightResult[] = data.results ?? [];
      // Pick the best result (highest savings)
      const best = results.length > 0
        ? results.reduce((a, b) => (b.savings > a.savings ? b : a), results[0])
        : undefined;
      return best;
    } catch {
      throw new Error(lang === "fr" ? "Erreur de recherche" : "Search error");
    }
  }, [searchParams, lang]);

  const addDate = useCallback(async () => {
    if (!dateInput || dates.length >= 3) return;
    if (dates.some((d) => d.date === dateInput)) return;

    const newEntry: DateComparison = { date: dateInput, loading: true };
    setDates((prev) => [...prev, newEntry]);
    setDateInput("");

    try {
      const result = await fetchDate(dateInput);
      setDates((prev) =>
        prev.map((d) => (d.date === dateInput ? { ...d, loading: false, result } : d))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error";
      setDates((prev) =>
        prev.map((d) => (d.date === dateInput ? { ...d, loading: false, error: msg } : d))
      );
    }
  }, [dateInput, dates, fetchDate]);

  const removeDate = (date: string) => {
    setDates((prev) => prev.filter((d) => d.date !== date));
  };

  // Find the best date (highest savings among loaded results)
  const bestDate = dates
    .filter((d) => d.result && !d.loading && !d.error)
    .sort((a, b) => (b.result!.savings ?? 0) - (a.result!.savings ?? 0))[0]?.date;

  const getRecoLabel = (reco?: string) => {
    if (!reco) return "-";
    if (reco === "USE_MILES") return t.useMiles[lang];
    return t.useCash[lang];
  };

  const getRecoClasses = (reco?: string) => {
    if (reco === "USE_MILES") return "bg-primary/15 text-blue-400 border-primary/30";
    return "bg-warning/10 text-warning border-warning/25";
  };

  if (!open) {
    return (
      <div className="animate-fade-up">
        <button
          onClick={() => setOpen(true)}
          className="w-full py-3 px-4 rounded-xl border border-dashed border-border hover:border-primary/50 bg-surface/50 hover:bg-surface text-muted hover:text-fg text-sm font-medium transition-all hover-lift"
        >
          {t.addBtn[lang]}
        </button>
      </div>
    );
  }

  return (
    <div className="animate-scale-in bg-surface rounded-2xl border border-border p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-fg">{t.title[lang]}</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-muted hover:text-fg transition-colors"
        >
          {t.close[lang]}
        </button>
      </div>

      {/* Date input */}
      {dates.length < 3 && (
        <div className="flex gap-2">
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-bg border border-border text-fg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={addDate}
            disabled={!dateInput}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              dateInput
                ? "bg-primary text-white hover:bg-primary/90 hover-lift"
                : "bg-border text-muted cursor-not-allowed"
            )}
          >
            +
          </button>
        </div>
      )}
      {dates.length >= 3 && (
        <p className="text-xs text-muted">{t.maxDates[lang]}</p>
      )}

      {/* Results cards */}
      {dates.length > 0 && (
        <div className="space-y-3">
          {dates.map((d) => (
            <div
              key={d.date}
              className={clsx(
                "relative rounded-xl border p-3 sm:p-4 transition-all",
                d.date === bestDate && !d.loading && !d.error
                  ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                  : "border-border bg-bg"
              )}
            >
              {/* Best badge */}
              {d.date === bestDate && !d.loading && !d.error && (
                <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">
                  {t.best[lang]}
                </span>
              )}

              {/* Date header + remove */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-fg">
                  {new Date(d.date + "T00:00:00").toLocaleDateString(
                    lang === "fr" ? "fr-FR" : "en-US",
                    { weekday: "short", day: "numeric", month: "short" }
                  )}
                </span>
                <button
                  onClick={() => removeDate(d.date)}
                  className="text-[10px] text-muted hover:text-fg transition-colors"
                >
                  {t.remove[lang]}
                </button>
              </div>

              {/* Loading */}
              {d.loading && (
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  {t.loading[lang]}
                </div>
              )}

              {/* Error */}
              {d.error && (
                <p className="text-xs text-red-400">{d.error}</p>
              )}

              {/* Result */}
              {!d.loading && !d.error && d.result && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted">{t.cash[lang]}</span>
                    <p className="font-bold text-fg">{fmt(d.result.cashCost ?? d.result.totalPrice)}</p>
                  </div>
                  <div>
                    <span className="text-muted">{t.miles[lang]}</span>
                    <p className="font-bold text-fg">
                      {d.result.milesCost
                        ? `${d.result.milesCost.toLocaleString()} mi`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted">{t.savings[lang]}</span>
                    <p className="font-bold text-fg">{fmt(d.result.savings)}</p>
                  </div>
                  <div>
                    <span className="text-muted">{t.reco[lang]}</span>
                    <span
                      className={clsx(
                        "inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold border",
                        getRecoClasses(d.result.recommendation)
                      )}
                    >
                      {getRecoLabel(d.result.recommendation)}
                    </span>
                  </div>
                </div>
              )}

              {/* No results */}
              {!d.loading && !d.error && !d.result && (
                <p className="text-xs text-muted">{t.noResults[lang]}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
