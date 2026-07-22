"use client";

import { useEffect, useState } from "react";
import type { LiveDeal } from "@/lib/dealsEngine";

interface Props {
  lang: "fr" | "en";
  onDealClick?: (from: string, to: string) => void;
}

const L = {
  fr: {
    label: "Meilleur deal maintenant",
    miles: "miles",
    cta: "Rechercher ce vol →",
    value: (cpp: string) => `${cpp}¢ par mile`,
    saving: (pct: number) => `${pct}% moins cher en miles`,
  },
  en: {
    label: "Best deal right now",
    miles: "miles",
    cta: "Search this flight →",
    value: (cpp: string) => `${cpp}¢ per mile`,
    saving: (pct: number) => `${pct}% cheaper with miles`,
  },
};

export function DealSpotlight({ lang, onDealClick }: Props) {
  const t = L[lang];
  const [deal, setDeal] = useState<LiveDeal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/deals")
      .then(r => r.json())
      .then((data: { deals: LiveDeal[] }) => {
        const best = (data.deals ?? [])
          .filter(d => d.recommendation === "USE_MILES")
          .sort((a, b) => b.ratio - a.ratio)[0] ?? null;
        setDeal(best);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (!loading && !deal) return null;

  if (loading || !deal) {
    return (
      <div className="w-full h-16 bg-surface rounded-2xl animate-pulse border border-amber-500/10" />
    );
  }

  const savingPct = Math.round((1 - (deal.milesRequired * deal.ratio / 100) / deal.cashPrice) * 100);
  const cpp = deal.ratio.toFixed(1);

  return (
    <button
      onClick={() => onDealClick?.(deal.from, deal.to)}
      // from-amber-950 (near-black) was previously unprefixed, so it also
      // applied in light mode: blended into a white "to-surface" it produced
      // a muddy, low-contrast tan gradient instead of the intended dark
      // amber glow. Kept for dark mode, given a lighter equivalent for light.
      className="w-full text-left group relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-100 to-surface hover:from-amber-200 dark:from-amber-950/40 dark:to-surface dark:hover:from-amber-900/50 transition-all duration-200"
    >
      {/* Glow accent */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 dark:from-amber-500/5 to-transparent pointer-events-none" />

      <div className="relative px-4 py-3.5 flex items-center gap-4">
        {/* Pulsing dot + label */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-400 animate-pulse" />
          <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400/70 uppercase tracking-widest writing-vertical hidden sm:block" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
            {t.label}
          </span>
        </div>

        {/* Route */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-muted mb-0.5">
            <span className="text-base">{deal.fromFlag}</span>
            <span>{deal.from}</span>
            <span>→</span>
            <span>{deal.to}</span>
            <span className="text-base">{deal.toFlag}</span>
          </div>
          <div className="font-bold text-fg text-sm truncate">{deal.program}</div>
          <div className="text-xs text-amber-700 dark:text-amber-400/80 mt-0.5">
            {deal.milesRequired.toLocaleString()} {t.miles} · {t.value(cpp)}
          </div>
        </div>

        {/* Price comparison */}
        <div className="flex-shrink-0 text-right">
          <div className="text-xs text-muted line-through">${deal.cashPrice}</div>
          <div className="font-black text-amber-700 dark:text-amber-400 text-lg leading-tight">
            {deal.milesRequired.toLocaleString()}
            <span className="text-xs font-normal text-muted ml-0.5">pts</span>
          </div>
          {savingPct > 0 && (
            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">-{savingPct}%</div>
          )}
        </div>

        {/* Arrow */}
        <div className="flex-shrink-0 text-amber-700/50 dark:text-amber-400/50 group-hover:text-amber-700 dark:group-hover:text-amber-400 group-hover:translate-x-1 transition-all text-lg">→</div>
      </div>

      {/* Bottom label on mobile */}
      <div className="sm:hidden px-4 pb-2 text-[10px] text-amber-700/60 dark:text-amber-400/60 font-semibold uppercase tracking-widest">
        {t.label}
      </div>
    </button>
  );
}
