"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import type { FlightResult } from "@/lib/engine";
import { FlightCard } from "./FlightCard";
import { FlightFilters, type SortBy } from "./FlightFilters";
import { CardRecommendation } from "./CardRecommendation";
import { PriceAlertForm } from "./PriceAlertForm";
import { PriceTrendBadge } from "./PriceTrendBadge";
import { TPCacheDisclaimer } from "./TPCacheDisclaimer";
import PortfolioCheck from "@/components/PortfolioCheck";
import clsx from "clsx";
import { isBusinessMode } from "@/lib/businessMode";

interface Props {
  results: FlightResult[];
  loading: boolean;
  lang: "fr" | "en";
  onBack: () => void;
  partial?: boolean;
  /** True while final results are still streaming in after partial were shown */
  liveRefreshing?: boolean;
  searchMeta?: { from: string; to: string; cabin: string };
  formatPrice?: (usd: number) => string;
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
    empty: "⚠️ Données indisponibles sur cette route actuellement",
    emptyDesc: "Nos sources de données couvrent mieux certaines routes. Essayez :",
    emptyTips: [
      "Élargir les dates (±7 jours)",
      "Décocher le filtre \"Direct uniquement\"",
      "Utiliser DKR (Dakar ville) au lieu de DSS pour les vols long-courriers",
      "Passer par un hub (CDG, IST, DXB) pour l'Afrique ↔ USA",
    ],
    partial: "⚠️ Résultats partiels affichés — certaines sources indisponibles",
    back: "← Nouvelle recherche",
    loading: "Recherche en cours…",
    businessBannerTitle: "Mode Business — comparaison vs prix Business cash",
    businessBannerDesc: "Les miles en Business offrent souvent 5–8× plus de valeur qu'en éco · Prix cash estimé (×4 éco)",
  },
  en: {
    results: "Results",
    found: (n: number) => `${n} flight${n > 1 ? "s" : ""} found`,
    best: "Best price",
    savings: "Max savings",
    all: "All",
    miles: "Use miles",
    cash: "Use cash",
    empty: "⚠️ Data unavailable for this route at the moment",
    emptyDesc: "Our data sources cover some routes better than others. Try:",
    emptyTips: [
      "Broaden the dates (±7 days)",
      "Uncheck \"Direct only\" filter",
      "Use DKR (Dakar city) instead of DSS for long-haul",
      "Route via a hub (CDG, IST, DXB) for Africa ↔ USA",
    ],
    partial: "⚠️ Partial results shown — some sources unavailable",
    back: "← New search",
    loading: "Searching…",
    businessBannerTitle: "Business mode — compared against Business cash price",
    businessBannerDesc: "Miles in Business often deliver 5–8× more value than economy · Cash price estimated (×4 eco)",
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

export function Results({ results, loading, lang, onBack, partial, liveRefreshing, searchMeta, formatPrice }: Props) {
  const t = L[lang];
  const fmt = formatPrice ?? ((usd: number) => `$${Math.round(usd)}`);
  const [tab, setTab] = useState<"all" | "miles" | "cash">("all");
  const [stopFilter, setStopFilter] = useState<"all" | "direct" | "stops">("all");
  const [sortBy, setSortBy] = useState<SortBy>("value");
  // Track when live refresh completes to show a freshness timestamp
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const prevRefreshing = useRef(false);
  useEffect(() => {
    if (prevRefreshing.current && !liveRefreshing) {
      setLastUpdatedAt(new Date());
    }
    prevRefreshing.current = liveRefreshing ?? false;
  }, [liveRefreshing]);

  const stopsFiltered = useMemo(() => {
    let r = [...results];
    if (stopFilter === "direct") r = r.filter(x => (x.stops ?? 0) === 0);
    if (stopFilter === "stops")  r = r.filter(x => (x.stops ?? 0) > 0);
    return r;
  }, [results, stopFilter]);

  const counts = useMemo(() => ({
    miles: stopsFiltered.filter(r => r.recommendation === "USE_MILES").length,
    cash:  stopsFiltered.filter(r => r.recommendation === "USE_CASH").length,
  }), [stopsFiltered]);

  const bestPrice  = results.length ? Math.min(...results.map(r => r.totalPrice ?? 0)) : 0;
  const maxSavings = results.length ? Math.max(0, ...results.map(r => r.savings)) : 0;
  // Track whether the best savings figure comes from a non-HIGH confidence source
  const maxSavingsIsEstimate = results.length > 0 && (() => {
    const bestSavingsResult = results.reduce<typeof results[0] | null>(
      (best, r) => r.savings > (best?.savings ?? 0) ? r : best, null
    );
    return bestSavingsResult?.priceConfidence !== "HIGH";
  })();

  // Use milesOptions from the best-deal result, fallback to first result
  const bestResultOptions =
    results.find(r => r.bestOption?.isBestDeal === true)?.milesOptions ??
    results[0]?.milesOptions ??
    [];

  // Check if there are any direct flights
  const hasDirectFlights = results.some(r => (r.stops ?? 0) === 0);
  const allWithStops = results.length > 0 && !hasDirectFlights;

  const filtered = useMemo(() => {
    let r = [...stopsFiltered];
    if (tab === "miles") r = r.filter(x => x.recommendation === "USE_MILES");
    if (tab === "cash")  r = r.filter(x => x.recommendation === "USE_CASH");
    if (sortBy === "price") r.sort((a, b) => (a.totalPrice ?? 0) - (b.totalPrice ?? 0));
    else r.sort((a, b) => b.savings - a.savings);
    return r;
  }, [stopsFiltered, tab, sortBy]);

  // Animated progress loader state
  const loadingSteps = lang === "fr"
    ? [
        { icon: "📡", msg: "Connexion aux sources de prix en temps réel…" },
        { icon: "✈️",  msg: "Données de vol récupérées, analyse en cours…" },
        { icon: "🧮",  msg: "Calcul des options miles & cash…" },
        { icon: "🏆",  msg: "Tri des meilleures offres pour vous…" },
      ]
    : [
        { icon: "📡", msg: "Connecting to live pricing sources…" },
        { icon: "✈️",  msg: "Flight data retrieved, analysing…" },
        { icon: "🧮",  msg: "Computing miles & cash options…" },
        { icon: "🏆",  msg: "Ranking the best offers for you…" },
      ];

  const [loadStep, setLoadStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!loading) { setLoadStep(0); setProgress(0); return; }
    setLoadStep(0);
    setProgress(0);
    // Cycle messages every 1.8s
    const stepTimer = setInterval(() => {
      setLoadStep(s => Math.min(s + 1, loadingSteps.length - 1));
    }, 1800);
    // Progress bar fills over 8s (matches typical search time)
    const start = Date.now();
    const DURATION = 8000;
    const progTimer = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(Math.round((elapsed / DURATION) * 100), 95));
    }, 80);
    return () => { clearInterval(stepTimer); clearInterval(progTimer); };
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    const step = loadingSteps[loadStep];
    return (
      <div className="space-y-4 animate-fade-up">
        {/* Step message */}
        <div className="flex items-center gap-3">
          <span className="text-lg leading-none">{step.icon}</span>
          <span className="text-sm text-muted font-medium flex-1">{step.msg}</span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Step dots */}
        <div className="flex items-center gap-1.5">
          {loadingSteps.map((s, i) => (
            <div
              key={i}
              className={clsx(
                "h-1 rounded-full transition-all duration-300",
                i <= loadStep
                  ? "bg-primary w-4"
                  : "bg-surface-2 w-1"
              )}
            />
          ))}
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
        <div className="flex items-center gap-2">
          {liveRefreshing ? (
            <span className="flex items-center gap-1.5 text-[11px] text-muted animate-pulse">
              <span className="w-2 h-2 rounded-full border border-primary border-t-transparent animate-spin" />
              {lang === "fr" ? "Mise à jour…" : "Updating…"}
            </span>
          ) : lastUpdatedAt ? (
            <span className="text-[10px] text-muted/60">
              {lang === "fr"
                ? `Mis à jour à ${lastUpdatedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
                : `Updated at ${lastUpdatedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`}
            </span>
          ) : null}
          <span className="text-xs text-subtle">{t.found(results.length)}</span>
        </div>
      </div>

      {/* Stat tiles */}
      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5 stagger-children">
          <div className="bg-surface rounded-xl border border-border px-4 py-3 text-center animate-scale-in hover-lift">
            <p className="text-xl font-black text-fg">{results.length}</p>
            <p className="text-[11px] text-muted mt-0.5">{lang === "fr" ? "vols trouvés" : "flights found"}</p>
          </div>
          <div className="bg-surface rounded-xl border border-border px-4 py-3 text-center animate-scale-in hover-lift">
            <p className={`font-black text-warning ${fmt(bestPrice).length > 10 ? "text-sm" : "text-xl"}`}>
              <span className="text-xs font-medium text-muted mr-0.5">{lang === "fr" ? "dès" : "from"}</span>{fmt(bestPrice)}
            </p>
            <p className="text-[11px] text-muted mt-0.5">{t.best}</p>
          </div>
          <div className="bg-surface rounded-xl border border-border px-4 py-3 text-center animate-scale-in hover-lift">
            <p className={`font-black text-success ${fmt(maxSavings).length > 10 ? "text-sm" : "text-xl"}`}>
              +{fmt(maxSavings)}
              {maxSavings > 0 && maxSavingsIsEstimate && (
                <span className="text-[9px] font-medium text-muted/70 ml-1 align-middle">(est.)</span>
              )}
            </p>
            <p className="text-[11px] text-muted mt-0.5">{t.savings}</p>
          </div>
        </div>
      )}

      {/* Price trend badge */}
      {results.length > 0 && searchMeta && (
        <PriceTrendBadge from={searchMeta.from} to={searchMeta.to} lang={lang} />
      )}

      {/* No direct flights info banner */}
      {allWithStops && (
        <div className="bg-surface rounded-xl border border-border/50 px-4 py-3 flex items-start gap-3">
          <span className="text-base mt-0.5">ℹ️</span>
          <div>
            <p className="text-xs font-semibold text-fg">
              {lang === "fr"
                ? "Aucun vol direct trouvé dans nos sources de données"
                : "No nonstop flights found in our data sources"}
            </p>
            <p className="text-[11px] text-muted mt-1 leading-relaxed">
              {lang === "fr"
                ? "Des vols directs existent peut-être sur cette route. Notre moteur compare les prix avec escale ci-dessous. Vérifiez aussi sur le site de la compagnie pour les vols directs."
                : "Nonstop flights may exist on this route. Our engine compares connecting fares below. Check the airline's website directly for nonstop options."}
            </p>
          </div>
        </div>
      )}

      {/* Partial results warning */}
      {partial && results.length > 0 && (
        <div className="bg-warning/10 rounded-xl border border-warning/25 px-4 py-3 flex items-center gap-3">
          <span className="text-base">⚠️</span>
          <p className="text-xs font-semibold text-warning">{t.partial}</p>
        </div>
      )}

      {/* Business/First mode contextual banner */}
      {results.length > 0 && searchMeta && isBusinessMode(searchMeta.cabin) && (
        <div className="flex items-center gap-3 px-4 py-3 bg-primary/10 border border-primary/20 rounded-xl">
          <span className="text-lg flex-shrink-0">✈️</span>
          <div>
            <p className="text-xs font-semibold text-blue-300">{t.businessBannerTitle}</p>
            <p className="text-[11px] text-muted mt-0.5">{t.businessBannerDesc}</p>
          </div>
        </div>
      )}

      {/* Card recommendation (transfer savings) */}
      {results.length > 0 && <CardRecommendation results={results} lang={lang} formatPrice={formatPrice} />}

      {/* Portfolio check */}
      {results.length > 0 && (
        <PortfolioCheck milesOptions={bestResultOptions} lang={lang} />
      )}

      {/* Price alert form */}
      {results.length > 0 && searchMeta && bestPrice > 0 && (
        <PriceAlertForm
          from={searchMeta.from}
          to={searchMeta.to}
          cabin={searchMeta.cabin}
          currentPrice={bestPrice}
          lang={lang}
          formatPrice={formatPrice}
        />
      )}

      {/* Recommendation tabs */}
      <div
        role="tablist"
        aria-label={lang === "fr" ? "Filtrer les résultats" : "Filter results"}
        className="flex gap-2 overflow-x-auto scrollbar-none"
      >
        {(["all", "miles", "cash"] as const).map(k => {
          const count = k === "all" ? stopsFiltered.length : counts[k as keyof typeof counts];
          const s = tabStyles[k];
          return (
            <button
              key={k}
              id={`results-tab-${k}`}
              role="tab"
              aria-selected={tab === k}
              aria-controls="results-tabpanel"
              onClick={() => setTab(k)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 whitespace-nowrap",
                tab === k ? s.active : s.inactive
              )}
            >
              {t[k]}
              <span
                aria-hidden="true"
                className={clsx(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                  tab === k ? "bg-white/15" : "bg-surface-2 text-muted"
                )}
              >
                {count}
              </span>
              <span className="sr-only">({count})</span>
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

      {/* TP Cache Disclaimer — shown if any results have TP source */}
      {results.length > 0 && results.some(r => r.source === "TP") && (
        <TPCacheDisclaimer lang={lang} />
      )}

      {/* Cards */}
      <div
        id="results-tabpanel"
        role="tabpanel"
        aria-labelledby={`results-tab-${tab}`}
      >
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
              <FlightCard
                flight={f}
                lang={lang}
                formatPrice={formatPrice}
                isGlobalBest={i === 0 && tab !== "cash"}
              />
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
