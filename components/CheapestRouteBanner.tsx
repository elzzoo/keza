"use client";

import { useEffect, useState } from "react";
import type { LiveDeal } from "@/lib/dealsEngine";

interface Props {
  lang: "fr" | "en";
  onDealClick?: (from: string, to: string) => void;
  formatPrice?: (usd: number) => string;
}

const L = {
  fr: {
    label:  "Vol du jour",
    from:   "à partir de",
    cta:    "Voir ce vol →",
    cash:   "meilleur prix cash",
  },
  en: {
    label:  "Flight of the day",
    from:   "from",
    cta:    "See this flight →",
    cash:   "best cash price",
  },
};

export function CheapestRouteBanner({ lang, onDealClick, formatPrice }: Props) {
  const t = L[lang];
  const fmt = formatPrice ?? ((usd: number) => `$${Math.round(usd)}`);
  const [deal, setDeal] = useState<LiveDeal | null>(null);

  useEffect(() => {
    fetch("/api/deals")
      .then(r => r.json())
      .then((data: { deals: LiveDeal[] }) => {
        // Pick the cheapest cash price across all deals
        const cheapest = (data.deals ?? [])
          .filter(d => d.cashPrice > 0)
          .sort((a, b) => a.cashPrice - b.cashPrice)[0] ?? null;
        setDeal(cheapest);
      })
      .catch(() => {});
  }, []);

  if (!deal) return null;

  return (
    <button
      onClick={() => onDealClick?.(deal.from, deal.to)}
      className="w-full text-left group relative overflow-hidden rounded-2xl border border-success/25 bg-gradient-to-r from-success/5 to-surface hover:from-success/10 transition-all duration-200"
    >
      <div className="relative px-4 py-3 flex items-center gap-3">
        {/* Icon + label */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1">
          <span className="text-base">🏷️</span>
        </div>

        {/* Route */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span className="text-base">{deal.fromFlag}</span>
            <span>{deal.from}</span>
            <span>→</span>
            <span>{deal.to}</span>
            <span className="text-base">{deal.toFlag}</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-semibold border border-success/20">
              {t.label}
            </span>
          </div>
          <div className="text-xs text-muted mt-0.5">{deal.program} · {t.cash}</div>
        </div>

        {/* Price */}
        <div className="flex-shrink-0 text-right">
          <div className="text-xs text-muted/60">{t.from}</div>
          <div className="font-black text-success text-lg leading-tight">
            {fmt(deal.cashPrice)}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex-shrink-0 text-success/40 group-hover:text-success group-hover:translate-x-1 transition-all text-base">→</div>
      </div>
    </button>
  );
}
