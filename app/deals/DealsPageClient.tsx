"use client";

import { useState } from "react";
import Link from "next/link";
import type { LiveDeal, DealRecommendation } from "@/lib/dealsEngine";

type Filter = "all" | DealRecommendation;

const FILTER_LABELS: Record<Filter, string> = {
  all:        "Tous",
  USE_MILES:  "✈ Miles gagnent",
  USE_CASH:   "💰 Cash gagne",
  NEUTRAL:    "Neutre",
};

const RECOMMENDATION_COLORS: Record<DealRecommendation, { badge: string; border: string }> = {
  USE_MILES: { badge: "bg-blue-500/15 text-blue-400 border-blue-500/25",  border: "border-blue-500/20" },
  USE_CASH:  { badge: "bg-amber-500/15 text-amber-400 border-amber-500/25", border: "border-amber-500/20" },
  NEUTRAL:   { badge: "bg-slate-500/15 text-slate-400 border-slate-500/25", border: "border-slate-500/20" },
};

function DealCard({ deal }: { deal: LiveDeal }) {
  const colors = RECOMMENDATION_COLORS[deal.recommendation];
  const searchUrl = `/?from=${deal.from}&to=${deal.to}`;

  return (
    <div className={`bg-surface border ${colors.border} rounded-2xl p-5 flex flex-col gap-4 hover:bg-surface-2 transition-colors`}>
      {/* Header: flags + route */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{deal.fromFlag}{deal.toFlag}</span>
          </div>
          <p className="text-base font-bold text-fg">{deal.from} → {deal.to}</p>
          <p className="text-xs text-subtle">{deal.program}</p>
        </div>
        <div className={`text-[11px] font-black px-2.5 py-1 rounded-lg border ${colors.badge} flex-shrink-0`}>
          {deal.recommendation === "USE_MILES"
            ? `✈ ${deal.multiplier} / mile`
            : deal.recommendation === "USE_CASH"
            ? "💰 Cash optimal"
            : "≈ Équivalent"}
        </div>
      </div>

      {/* Prices */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0a0a0f] rounded-xl p-3">
          <p className="text-[10px] text-subtle uppercase tracking-wider mb-1">Cash</p>
          <p className="text-lg font-black text-fg">${deal.cashPrice}</p>
        </div>
        <div className="bg-[#0a0a0f] rounded-xl p-3">
          <p className="text-[10px] text-subtle uppercase tracking-wider mb-1">Miles</p>
          <p className="text-lg font-black text-fg">{deal.milesRequired.toLocaleString("fr-FR")}</p>
        </div>
      </div>

      {/* CPM ratio */}
      <div className="flex items-center justify-between text-xs text-subtle">
        <span>Valeur / mile</span>
        <span className="font-bold text-fg">{deal.ratio.toFixed(2)} ¢/mile</span>
      </div>

      {/* CTA */}
      <Link
        href={searchUrl}
        className="block text-center bg-primary/10 hover:bg-primary/20 text-blue-400 border border-primary/20 rounded-xl py-2.5 text-sm font-semibold transition-colors"
      >
        Analyser ce vol →
      </Link>
    </div>
  );
}

export function DealsPageClient({ initialDeals }: { initialDeals: LiveDeal[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = filter === "all"
    ? initialDeals
    : initialDeals.filter((d) => d.recommendation === filter);

  const filters: Filter[] = ["all", "USE_MILES", "USE_CASH", "NEUTRAL"];

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
              filter === f
                ? "bg-primary text-white border-primary"
                : "bg-surface text-muted border-border hover:border-primary/40"
            }`}
          >
            {FILTER_LABELS[f]}
            {f !== "all" && (
              <span className="ml-1.5 text-xs opacity-70">
                ({initialDeals.filter((d) => d.recommendation === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-muted text-sm text-center py-12">Aucun deal dans cette catégorie.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((deal) => (
            <DealCard key={`${deal.from}-${deal.to}-${deal.program}`} deal={deal} />
          ))}
        </div>
      )}

      {/* Alert CTA */}
      <div className="mt-12 bg-surface border border-border rounded-2xl p-6 text-center">
        <p className="text-fg font-semibold mb-1">Un vol vous intéresse ?</p>
        <p className="text-sm text-subtle mb-4">
          Créez une alerte prix — KEZA vous prévient dès qu&apos;il baisse de 10 %.
        </p>
        <Link
          href="/"
          className="inline-block bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Créer une alerte →
        </Link>
      </div>
    </div>
  );
}
