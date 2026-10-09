"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { trackDealClick } from "@/lib/analytics";
import { convertPrice, formatCurrency } from "@/lib/convertCurrency";
import { useProfile } from "@/hooks/useProfile";
import { useDeals } from "@/hooks/useDeals";
import { Badge, Card } from "@/components/ui";

interface Props {
  lang: "fr" | "en";
  onDealClick?: (from: string, to: string) => void;
}

const L = {
  fr: { title: "Deals du moment", updated: "mis à jour il y a", hours: "h", all: "Voir tous →", milesWin: "Miles gagnent", cashWin: "Cash gagne" },
  en: { title: "Live deals",       updated: "updated",           hours: "h ago", all: "See all →", milesWin: "Miles win",   cashWin: "Cash wins"  },
};

function RecommendationIcon({ isMilesWin, className = "h-3 w-3" }: { isMilesWin: boolean; className?: string }) {
  if (!isMilesWin) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
        <rect x="4" y="7" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 12h.01M16 12h.01M12 10.2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path d="M4 17 20 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m9 14-3.7-2.2 1.3-1.2 5 1.8M15 10l1 5.2 1.5-1.1-.1-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DealsStrip({ lang, onDealClick }: Props) {
  const t = L[lang];
  const { currency, exchangeRates } = useProfile();
  const { deals, loading, error } = useDeals();
  const dealsPath = lang === "fr" ? "/deals" : "/en/deals";

  useEffect(() => {
    if (!error) return;
    console.error("[DealsStrip] fetch /api/deals:", error);
    Sentry.captureException(error, {
      tags: { component: "DealsStrip" },
      extra: { action: "fetch deals" }
    });
  }, [error]);

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
        <Link href={dealsPath} className="text-xs text-muted hover:text-primary transition-colors">
            {t.all}
          </Link>
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="flex gap-3 overflow-x-hidden">
          {[1,2,3].map((i) => (
            <Card key={i} padding="none" className="flex-shrink-0 w-52 h-20 animate-pulse" />
          ))}
        </div>
      )}

      {/* Deals scroll */}
      {!loading && (
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          {deals.map((deal) => {
            const isMilesWin = deal.recommendation === "USE_MILES";
            return (
              <Card
                as="button"
                key={`${deal.from}-${deal.to}`}
                type="button"
                onClick={() => {
                  trackDealClick({ from: deal.from, to: deal.to, program: deal.program });
                  onDealClick?.(deal.from, deal.to);
                }}
                padding="none"
                interactive
                className="flex-shrink-0 flex items-center gap-3 px-3 py-2.5 min-w-[210px] text-left group"
              >
                {/* Flags */}
                <span className="text-xl flex-shrink-0">{deal.fromFlag}{deal.toFlag}</span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-fg truncate">
                    {deal.from} → {deal.to}
                  </div>
                  <div className="text-xs text-muted truncate">{deal.program}</div>
                </div>

                {/* Badge */}
                <div className="flex-shrink-0 text-right">
                  <Badge
                    tone={isMilesWin ? "primary" : "warning"}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black"
                  >
                    <RecommendationIcon isMilesWin={isMilesWin} />
                    {isMilesWin ? deal.multiplier : t.cashWin}
                  </Badge>
                  <div className="text-[11px] font-bold text-fg mt-0.5">
                    {formatCurrency(convertPrice(deal.cashPrice, "USD", currency, exchangeRates), currency)}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
