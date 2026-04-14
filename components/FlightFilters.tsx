"use client";

import clsx from "clsx";

export type SortBy = "value" | "price";

interface Props {
  stopFilter: "all" | "direct" | "stops";
  sortBy: SortBy;
  onStopFilter: (v: "all" | "direct" | "stops") => void;
  onSortBy: (v: SortBy) => void;
  lang: "fr" | "en";
}

export function FlightFilters({ stopFilter, sortBy, onStopFilter, onSortBy, lang }: Props) {
  const hasFilters = stopFilter !== "all" || sortBy !== "value";

  const pill = (active: boolean) => clsx(
    "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 whitespace-nowrap",
    active
      ? "bg-primary/10 text-primary border-primary/30"
      : "bg-white text-muted border-slate-200 hover:border-slate-300 hover:text-fg"
  );

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
      {/* Stop filter */}
      <button onClick={() => onStopFilter("all")} className={pill(stopFilter === "all")}>
        {lang === "fr" ? "Tous" : "All"}
      </button>
      <button onClick={() => onStopFilter("direct")} className={pill(stopFilter === "direct")}>
        Direct
      </button>
      <button onClick={() => onStopFilter("stops")} className={pill(stopFilter === "stops")}>
        {lang === "fr" ? "Avec escales" : "With stops"}
      </button>

      <span className="w-px h-4 bg-slate-200 flex-shrink-0 mx-1" />

      {/* Sort */}
      <button onClick={() => onSortBy("value")} className={pill(sortBy === "value")}>
        {lang === "fr" ? "Meilleure valeur ↑" : "Best value ↑"}
      </button>
      <button onClick={() => onSortBy("price")} className={pill(sortBy === "price")}>
        {lang === "fr" ? "Prix ↑" : "Price ↑"}
      </button>

      {/* Reset */}
      {hasFilters && (
        <>
          <span className="w-px h-4 bg-slate-200 flex-shrink-0 mx-1" />
          <button
            onClick={() => { onStopFilter("all"); onSortBy("value"); }}
            className="px-3 py-1.5 text-xs font-semibold text-danger hover:text-danger-text transition-colors whitespace-nowrap"
          >
            {lang === "fr" ? "Réinitialiser" : "Reset"}
          </button>
        </>
      )}
    </div>
  );
}
