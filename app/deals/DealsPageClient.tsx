"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { LiveDeal, DealRecommendation } from "@/lib/dealsEngine";
import { trackDealsFilter, trackDealShare } from "@/lib/analytics";
import { SITE_URL } from "@/lib/siteConfig";
import { NewsletterSignup } from "@/components/NewsletterSignup";

// ─── Region mapping (derived from IATA prefix heuristics) ────────────────────

type Region = "all" | "Africa" | "Europe" | "Americas" | "Asia" | "Middle East";

const REGION_MAP: Record<string, Region> = {
  // Africa
  DSS:"Africa", DKR:"Africa", LOS:"Africa", ABJ:"Africa", CMN:"Africa", ACC:"Africa",
  NBO:"Africa", ADD:"Africa", DLA:"Africa", DAR:"Africa", JNB:"Africa", LFW:"Africa",
  CKY:"Africa", OUA:"Africa", BKO:"Africa", MLW:"Africa", TNR:"Africa",
  // Europe
  CDG:"Europe", LHR:"Europe", AMS:"Europe", MAD:"Europe", FCO:"Europe", FRA:"Europe",
  BRU:"Europe", ZRH:"Europe", IST:"Europe", MXP:"Europe", BCN:"Europe", LIS:"Europe",
  ATH:"Europe", VIE:"Europe", CPH:"Europe", OSL:"Europe", ARN:"Europe",
  // Americas
  JFK:"Americas", EWR:"Americas", LAX:"Americas", MIA:"Americas", ORD:"Americas",
  SFO:"Americas", YUL:"Americas", YYZ:"Americas", MEX:"Americas", GRU:"Americas",
  BOG:"Americas", SCL:"Americas", LIM:"Americas",
  // Asia
  NRT:"Asia", HND:"Asia", ICN:"Asia", SIN:"Asia", BKK:"Asia", HKG:"Asia",
  KUL:"Asia", PVG:"Asia", PEK:"Asia", BOM:"Asia", DEL:"Asia", CMB:"Asia",
  // Middle East
  DXB:"Middle East", DOH:"Middle East", AUH:"Middle East", RUH:"Middle East", KWI:"Middle East",
};

function dealRegion(deal: LiveDeal): Region {
  return REGION_MAP[deal.from] ?? REGION_MAP[deal.to] ?? "all";
}

type SortKey = "ratio_desc" | "ratio_asc" | "price_asc";

type Filter = "all" | DealRecommendation;

const FILTER_LABELS_FR: Record<Filter, string> = {
  all:        "Tous",
  USE_MILES:  "✈ Miles gagnent",
  USE_CASH:   "💰 Cash gagne",
  NEUTRAL:    "Neutre",
};

const FILTER_LABELS_EN: Record<Filter, string> = {
  all:        "All",
  USE_MILES:  "✈ Miles win",
  USE_CASH:   "💰 Cash wins",
  NEUTRAL:    "Neutral",
};

const RECOMMENDATION_COLORS: Record<DealRecommendation, { badge: string; border: string }> = {
  USE_MILES: { badge: "bg-blue-500/15 text-blue-400 border-blue-500/25",  border: "border-blue-500/20" },
  USE_CASH:  { badge: "bg-amber-500/15 text-amber-400 border-amber-500/25", border: "border-amber-500/20" },
  NEUTRAL:   { badge: "bg-slate-500/15 text-slate-400 border-slate-500/25", border: "border-slate-500/20" },
};

function ShareDealButton({ deal, lang = "fr" }: { deal: LiveDeal; lang?: "fr" | "en" }) {
  const [state, setState] = useState<"idle" | "copied" | "shared">("idle");

  const handleShare = async () => {
    const url = `${SITE_URL}/?from=${deal.from}&to=${deal.to}&utm_source=share&utm_medium=deal`;
    const text = lang === "en"
      ? `${deal.from} → ${deal.to} — $${deal.cashPrice} or ${deal.milesRequired.toLocaleString("en-US")} miles (${deal.program}) via KEZA`
      : `${deal.from} → ${deal.to} — $${deal.cashPrice} ou ${deal.milesRequired.toLocaleString("fr-FR")} miles (${deal.program}) via KEZA`;

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
      aria-label={lang === "en" ? `Share deal ${deal.from} → ${deal.to}` : `Partager le deal ${deal.from} → ${deal.to}`}
    >
      {state === "copied" ? (
        <><span>✓</span><span>{lang === "en" ? "Copied!" : "Copié !"}</span></>
      ) : state === "shared" ? (
        <><span>✓</span><span>{lang === "en" ? "Shared!" : "Partagé !"}</span></>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          <span>{lang === "en" ? "Share" : "Partager"}</span>
        </>
      )}
    </button>
  );
}

function DealCard({ deal, lang = "fr" }: { deal: LiveDeal; lang?: "fr" | "en" }) {
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
            ? (lang === "en" ? "💰 Cash optimal" : "💰 Cash optimal")
            : (lang === "en" ? "≈ Equivalent" : "≈ Équivalent")}
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
          <p className="text-lg font-black text-fg">{deal.milesRequired.toLocaleString(lang === "en" ? "en-US" : "fr-FR")}</p>
        </div>
      </div>

      {/* CPM ratio */}
      <div className="flex items-center justify-between text-xs text-subtle">
        <span>{lang === "en" ? "Value / mile" : "Valeur / mile"}</span>
        <span className="font-bold text-fg">{deal.ratio.toFixed(2)} ¢/mile</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Link
          href={searchUrl}
          className="flex-1 block text-center bg-primary/10 hover:bg-primary/20 text-blue-400 border border-primary/20 rounded-xl py-2.5 text-sm font-semibold transition-colors"
        >
          {lang === "en" ? "Analyze →" : "Analyser →"}
        </Link>
        <ShareDealButton deal={deal} lang={lang} />
      </div>
    </div>
  );
}

const REGION_LABELS: Record<Region, string> = {
  all: "🌍 Toutes régions",
  Africa: "🌍 Afrique",
  Europe: "🇪🇺 Europe",
  Americas: "🌎 Amériques",
  Asia: "🌏 Asie",
  "Middle East": "🕌 Moyen-Orient",
};

const REGION_LABELS_EN: Record<Region, string> = {
  all: "🌍 All regions",
  Africa: "🌍 Africa",
  Europe: "🇪🇺 Europe",
  Americas: "🌎 Americas",
  Asia: "🌏 Asia",
  "Middle East": "🕌 Middle East",
};

const SORT_LABELS: Record<SortKey, { fr: string; en: string }> = {
  ratio_desc: { fr: "Meilleur ratio ↓", en: "Best ratio ↓" },
  ratio_asc:  { fr: "Ratio croissant ↑", en: "Ratio ascending ↑" },
  price_asc:  { fr: "Prix cash ↑", en: "Cash price ↑" },
};

export function DealsPageClient({ initialDeals, lang = "fr" }: { initialDeals: LiveDeal[]; lang?: "fr" | "en" }) {
  const [filter,    setFilter]    = useState<Filter>("all");
  const [region,    setRegion]    = useState<Region>("all");
  const [sortKey,   setSortKey]   = useState<SortKey>("ratio_desc");

  const availableRegions = useMemo<Region[]>(() => {
    const seen = new Set<Region>();
    for (const d of initialDeals) {
      const r = dealRegion(d);
      if (r !== "all") seen.add(r);
    }
    return ["all", ...Array.from(seen).sort()] as Region[];
  }, [initialDeals]);

  const filtered = useMemo(() => {
    let list = initialDeals;
    if (filter !== "all") list = list.filter(d => d.recommendation === filter);
    if (region !== "all") list = list.filter(d => dealRegion(d) === region);
    if (sortKey === "ratio_desc") list = [...list].sort((a, b) => b.ratio - a.ratio);
    else if (sortKey === "ratio_asc") list = [...list].sort((a, b) => a.ratio - b.ratio);
    else if (sortKey === "price_asc") list = [...list].sort((a, b) => a.cashPrice - b.cashPrice);
    return list;
  }, [initialDeals, filter, region, sortKey]);

  const recommendFilters: Filter[] = ["all", "USE_MILES", "USE_CASH", "NEUTRAL"];
  const FILTER_LABELS = lang === "en" ? FILTER_LABELS_EN : FILTER_LABELS_FR;
  const R_LABELS = lang === "en" ? REGION_LABELS_EN : REGION_LABELS;

  return (
    <div>
      {/* Row 1: Recommendation filter tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mb-3 -mx-1 px-1">
        {recommendFilters.map((f) => (
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

      {/* Row 2: Region filter + sort */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 mb-6 -mx-1 px-1">
        {availableRegions.map(r => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            aria-pressed={region === r}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
              region === r
                ? "bg-surface-2 border-primary/50 text-fg"
                : "bg-surface text-subtle border-border hover:border-primary/30 hover:text-muted"
            }`}
          >
            {R_LABELS[r]}
          </button>
        ))}
        <div className="ml-auto flex-shrink-0">
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="text-xs bg-surface border border-border text-muted rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary/50 cursor-pointer"
          >
            {(Object.entries(SORT_LABELS) as [SortKey, { fr: string; en: string }][]).map(([k, v]) => (
              <option key={k} value={k}>{lang === "en" ? v.en : v.fr}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 animate-fade-up">
          <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center text-2xl">
            🔍
          </div>
          <div className="text-center">
            <p className="font-semibold text-fg">{lang === "en" ? "No deals in this category" : "Aucun deal dans cette catégorie"}</p>
            <p className="text-sm text-muted mt-1">
              {lang === "en"
                ? filter === "USE_MILES"
                  ? "Miles don't win on any route right now."
                  : filter === "USE_CASH"
                  ? "Cash is not optimal on these routes currently."
                  : "No neutral deals available."
                : filter === "USE_MILES"
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
            {lang === "en" ? "← See all deals" : "← Voir tous les deals"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-up">
          {filtered.map((deal) => (
            <DealCard key={`${deal.from}-${deal.to}-${deal.program}`} deal={deal} lang={lang} />
          ))}
        </div>
      )}

      {/* Newsletter opt-in */}
      <div className="mt-10">
        <NewsletterSignup lang={lang} variant="inline" />
      </div>

      {/* Alert CTA */}
      <div className="mt-6 bg-surface border border-border rounded-2xl p-6 text-center">
        <p className="text-fg font-semibold mb-1">{lang === "en" ? "Interested in a flight?" : "Un vol vous intéresse ?"}</p>
        <p className="text-sm text-subtle mb-4">
          {lang === "en"
            ? "Create a price alert — KEZA notifies you as soon as it drops 10%."
            : "Créez une alerte prix — KEZA vous prévient dès qu'il baisse de 10 %."}
        </p>
        <Link
          href="/"
          className="inline-block bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          {lang === "en" ? "Create an alert →" : "Créer une alerte →"}
        </Link>
      </div>
    </div>
  );
}
