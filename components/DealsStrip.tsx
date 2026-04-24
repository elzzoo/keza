"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { trackDealClick } from "@/lib/analytics";
import type { LiveDeal } from "@/lib/dealsEngine";

interface Props {
  lang: "fr" | "en";
  onDealClick?: (from: string, to: string) => void;
}

const L = {
  fr: { title: "Deals du moment", updated: "mis à jour il y a", hours: "h", all: "Voir tous →", milesWin: "Miles gagnent", cashWin: "Cash gagne" },
  en: { title: "Live deals",       updated: "updated",           hours: "h ago", all: "See all →", milesWin: "Miles win",   cashWin: "Cash wins"  },
};

export function DealsStrip({ lang, onDealClick }: Props) {
  const t = L[lang];
  const [deals, setDeals] = useState<LiveDeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/deals")
      .then((r) => r.json())
      .then((data: { deals: LiveDeal[] }) => {
        setDeals(data.deals ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (!loading && deals.length === 0) return null;

  return (
    <div className="py-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-bold text-muted uppercase tracking-wider">
            {t.title}
          </span>
        </div>
        <Link href="/deals" className="text-xs text-subtle hover:text-primary transition-colors">
            {t.all}
          </Link>
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="flex gap-3 overflow-x-hidden">
          {[1,2,3].map((i) => (
            <div key={i} className="flex-shrink-0 w-52 h-20 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Deals scroll */}
      {!loading && (
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          {deals.map((deal) => {
            const isMilesWin = deal.recommendation === "USE_MILES";
            return (
              <button
                key={`${deal.from}-${deal.to}`}
                onClick={() => {
                  trackDealClick({ from: deal.from, to: deal.to, program: deal.program });
                  onDealClick?.(deal.from, deal.to);
                }}
                className="flex-shrink-0 flex items-center gap-3 bg-surface hover:bg-surface-2 border border-border hover:border-primary/40 rounded-xl px-3 py-2.5 min-w-[210px] transition-all duration-150 text-left group"
              >
                {/* Flags */}
                <span className="text-xl flex-shrink-0">{deal.fromFlag}{deal.toFlag}</span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-fg truncate">
                    {deal.from} → {deal.to}
                  </div>
                  <div className="text-xs text-subtle truncate">{deal.program}</div>
                </div>

                {/* Badge */}
                <div className="flex-shrink-0 text-right">
                  <div className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                    isMilesWin
                      ? "bg-primary/15 text-blue-400 border border-primary/25"
                      : "bg-warning/10 text-warning border border-warning/25"
                  }`}>
                    {isMilesWin ? `✈ ${deal.multiplier}` : "💰"}
                  </div>
                  <div className="text-[11px] font-bold text-fg mt-0.5">
                    ${Math.round(deal.cashPrice)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
