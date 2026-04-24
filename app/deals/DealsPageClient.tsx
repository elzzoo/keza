"use client";

import { useState } from "react";
import Link from "next/link";
import type { LiveDeal, DealRecommendation } from "@/lib/dealsEngine";
import { trackDealsFilter, trackDealShare } from "@/lib/analytics";

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

function ShareDealButton({ deal }: { deal: LiveDeal }) {
  const [state, setState] = useState<"idle" | "copied" | "shared">("idle");

  const handleShare = async () => {
    const url = `https://keza-taupe.vercel.app/?from=${deal.from}&to=${deal.to}&utm_source=share&utm_medium=deal`;
    const text = `${deal.from} → ${deal.to} — $${deal.cashPrice} ou ${deal.milesRequired.toLocaleString("fr-FR")} miles (${deal.program}) via KEZA`;

    trackDealShare({ from: deal.from, to: deal.to, program: deal.program });

    // Web Share API on mobile
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `KEZA — ${deal.from} → ${deal.to}`, text, url });
        setState("shared");
        setTimeout(() => setState("idle"), 2000);
        return;
      } catch {
        // User cancelled — fall through to clipboard
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setState("copied");
    setTimeout(() => setState("idle"), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border transition-all ${
        state !== "idle"
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          : "bg-surface-2 border-border text-subtle hover:text-fg hover:border-primary/40"
      }`}
      aria-label={`Partager le deal ${deal.from} → ${deal.to}`}
    >
      {state === "copied" ? (
        <><span>✓</span><span>Copié !</span></>
      ) : state === "shared" ? (
        <><span>✓</span><span>Partagé !</span></>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          <span>Partager</span>
        </>
      )}
    </button>
  );
}

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

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Link
          href={searchUrl}
          className="flex-1 block text-center bg-primary/10 hover:bg-primary/20 text-blue-400 border border-primary/20 rounded-xl py-2.5 text-sm font-semibold transition-colors"
        >
          Analyser →
        </Link>
        <ShareDealButton deal={deal} />
      </div>
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
      {/* Filter tabs — horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mb-6 -mx-1 px-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); if (f !== filter) trackDealsFilter(f); }}
            aria-pressed={filter === f}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
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
        <div className="flex flex-col items-center gap-4 py-16 animate-fade-up">
          <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center text-2xl">
            🔍
          </div>
          <div className="text-center">
            <p className="font-semibold text-fg">Aucun deal dans cette catégorie</p>
            <p className="text-sm text-muted mt-1">
              {filter === "USE_MILES"
                ? "Les miles ne gagnent sur aucune route pour l'instant."
                : filter === "USE_CASH"
                ? "Le cash n'est pas optimal sur ces routes actuellement."
                : "Aucun deal neutre disponible."}
            </p>
          </div>
          <button
            onClick={() => setFilter("all")}
            className="px-4 py-2 rounded-xl border border-border text-sm font-semibold text-muted hover:text-fg hover:border-primary/40 transition-colors"
          >
            ← Voir tous les deals
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-up">
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
