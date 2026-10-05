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
import { Badge, Button, EmptyState } from "@/components/ui";
import clsx from "clsx";
import { isBusinessMode } from "@/lib/businessMode";
import { convertPrice, formatCurrency } from "@/lib/convertCurrency";
import { useProfile } from "@/hooks/useProfile";

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
    empty: "Données indisponibles sur cette route actuellement",
    emptyDesc: "Nos sources de données couvrent mieux certaines routes. Essayez :",
    emptyTips: [
      "Élargir les dates (±7 jours)",
      "Décocher le filtre \"Direct uniquement\"",
      "Utiliser DKR (Dakar ville) au lieu de DSS pour les vols long-courriers",
      "Passer par un hub (CDG, IST, DXB) pour l'Afrique ↔ USA",
    ],
    partial: "Résultats partiels affichés — certaines sources indisponibles",
    back: "← Nouvelle recherche",
    loading: "Recherche en cours…",
    businessBannerTitle: "Mode Business — comparaison vs prix Business cash",
    businessBannerDesc: "Les miles en Business offrent souvent 5–8× plus de valeur qu'en éco · Prix cash estimé (×4 éco)",
    qualityTitle: "Qualité des prix",
    qualityLive: "Live",
    qualityCached: "Cache",
    qualityEstimated: "Estimé",
    qualityAllLive: "Prix temps réel disponibles sur tous les résultats affichés.",
    qualitySomeLive: "Prix temps réel disponibles sur une partie des résultats.",
    qualityCachedOnly: "Prix issus de cache fournisseur. Vérifiez le tarif final avant réservation.",
    qualityEstimatedOnly: "Prix indicatifs. Vérifiez auprès de la compagnie avant de décider.",
    qualityMixedEstimate: "Résultats mêlant cache fournisseur et estimations de route.",
    showingSorted: (visible: number, total: number, sort: string) =>
      `${visible} sur ${total} vol${total > 1 ? "s" : ""} affiché${visible > 1 ? "s" : ""} · trié par ${sort}`,
    sortValue: "meilleure valeur",
    sortPrice: "prix le plus bas",
    noDirect: "Aucun vol direct dans ces résultats",
    noDirectDesc: "Des options avec escale sont disponibles. Réinitialisez le filtre ou consultez « Avec escales ».",
    noStops: "Aucun vol avec escale dans ces résultats",
    noStopsDesc: "Les résultats disponibles sont directs. Réinitialisez le filtre pour les revoir.",
    noMiles: "Aucune option miles dans ce filtre",
    noMilesDesc: "Les vols affichés sont mieux classés en cash pour l’instant. Essayez « Tous » ou ajustez les escales.",
    noCash: "Aucun vol en cash trouvé",
    noCashDesc: "Tous les vols trouvés offrent une meilleure valeur avec les miles. Consultez l’onglet « Utilisez miles ».",
    resetFilters: "Réinitialiser les filtres",
  },
  en: {
    results: "Results",
    found: (n: number) => `${n} flight${n > 1 ? "s" : ""} found`,
    best: "Best price",
    savings: "Max savings",
    all: "All",
    miles: "Use miles",
    cash: "Use cash",
    empty: "Data unavailable for this route at the moment",
    emptyDesc: "Our data sources cover some routes better than others. Try:",
    emptyTips: [
      "Broaden the dates (±7 days)",
      "Uncheck \"Direct only\" filter",
      "Use DKR (Dakar city) instead of DSS for long-haul",
      "Route via a hub (CDG, IST, DXB) for Africa ↔ USA",
    ],
    partial: "Partial results shown — some sources unavailable",
    back: "← New search",
    loading: "Searching…",
    businessBannerTitle: "Business mode — compared against Business cash price",
    businessBannerDesc: "Miles in Business often deliver 5–8× more value than economy · Cash price estimated (×4 eco)",
    qualityTitle: "Price confidence",
    qualityLive: "Live",
    qualityCached: "Cache",
    qualityEstimated: "Estimated",
    qualityAllLive: "Live prices are available for every displayed result.",
    qualitySomeLive: "Live prices are available for part of these results.",
    qualityCachedOnly: "Prices come from provider cache. Verify the final fare before booking.",
    qualityEstimatedOnly: "Prices are indicative. Verify with the airline before deciding.",
    qualityMixedEstimate: "Results combine provider cache and route estimates.",
    showingSorted: (visible: number, total: number, sort: string) =>
      `${visible} of ${total} flight${total > 1 ? "s" : ""} shown · sorted by ${sort}`,
    sortValue: "best value",
    sortPrice: "lowest price",
    noDirect: "No nonstop flights in these results",
    noDirectDesc: "Connecting options are available. Reset the filter or use “With stops”.",
    noStops: "No connecting flights in these results",
    noStopsDesc: "The available results are nonstop. Reset the filter to see them again.",
    noMiles: "No miles options in this filter",
    noMilesDesc: "The visible flights currently rank better as cash fares. Try “All” or adjust the stops filter.",
    noCash: "No cash options found",
    noCashDesc: "All flights offer better value with miles. Check the “Use miles” tab.",
    resetFilters: "Reset filters",
  },
};

type ResultIconName = "signal" | "plane" | "calculator" | "rank" | "info" | "warning";

function ResultIcon({ name, className = "h-4 w-4" }: { name: ResultIconName; className?: string }) {
  const common = {
    className,
    fill: "none",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "signal") {
    return (
      <svg {...common}>
        <path d="M6 18h.01" />
        <path d="M10 14a6 6 0 0 1 8 0" />
        <path d="M6 10a12 12 0 0 1 16 0" />
      </svg>
    );
  }
  if (name === "plane") {
    return (
      <svg {...common}>
        <path d="M22 2 11 13" />
        <path d="m22 2-7 20-4-9-9-4 20-7Z" />
      </svg>
    );
  }
  if (name === "calculator") {
    return (
      <svg {...common}>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 7h8" />
        <path d="M8 11h.01" />
        <path d="M12 11h.01" />
        <path d="M16 11h.01" />
        <path d="M8 15h.01" />
        <path d="M12 15h.01" />
        <path d="M16 15h.01" />
      </svg>
    );
  }
  if (name === "rank") {
    return (
      <svg {...common}>
        <path d="M8 21V10" />
        <path d="M12 21V3" />
        <path d="M16 21v-7" />
      </svg>
    );
  }
  if (name === "warning") {
    return (
      <svg {...common}>
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

type PriceQualitySummary = {
  live: number;
  cached: number;
  estimated: number;
};

function getPriceQualitySummary(results: FlightResult[]): PriceQualitySummary {
  return results.reduce<PriceQualitySummary>(
    (summary, result) => {
      if (result.isSupplemental || result.source === "SYNTHETIC" || result.priceConfidence === "ESTIMATED") {
        summary.estimated += 1;
      } else if (result.source === "TP" || result.priceConfidence === "LOW") {
        summary.cached += 1;
      } else {
        summary.live += 1;
      }
      return summary;
    },
    { live: 0, cached: 0, estimated: 0 }
  );
}

function getPriceQualityMessage(summary: PriceQualitySummary, lang: "fr" | "en") {
  const t = L[lang];
  if (summary.live > 0 && summary.cached === 0 && summary.estimated === 0) return t.qualityAllLive;
  if (summary.live > 0) return t.qualitySomeLive;
  if (summary.estimated > 0 && summary.cached > 0) return t.qualityMixedEstimate;
  if (summary.estimated > 0) return t.qualityEstimatedOnly;
  return t.qualityCachedOnly;
}

export function getFlightResultKey(flight: FlightResult): string {
  const airlines = [...flight.airlines].sort().join("+") || "unknown";
  const returnAirlines = [...(flight.returnAirlines ?? [])].sort().join("+") || "none";
  // If every identity field below is identical, the rows are indistinguishable
  // in the UI and should already have been deduped by provider merge logic.
  const bookingOrPrice = flight.bookingLink ?? `price:${flight.totalPrice ?? flight.price}`;

  return [
    flight.searchId,
    flight.source ?? "unknown",
    flight.from,
    flight.to,
    airlines,
    `stops:${flight.stops ?? 0}`,
    `duration:${flight.duration ?? 0}`,
    flight.tripType,
    flight.cabin,
    `return:${returnAirlines}:${flight.returnPrice ?? 0}`,
    bookingOrPrice,
  ].join("|");
}

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

/**
 * Flight results display component. Renders ranked flights with tabs (all/miles/cash),
 * filtering by stops, sorting by value/price/duration, and shows live results as they stream.
 * Each FlightCard displays cash vs miles options with confidence badges and booking links.
 *
 * @param Props - Results props including flight results array, loading state, language, and formatPrice callback
 */
export function Results({ results, loading, lang, onBack, partial, liveRefreshing, searchMeta, formatPrice }: Props) {
  const t = L[lang];
  const { currency, exchangeRates } = useProfile();

  // Use provided formatPrice, or convert USD to user's currency and format
  const fmt = formatPrice ?? ((usd: number) => {
    const converted = convertPrice(usd, "USD", currency, exchangeRates);
    return formatCurrency(converted, currency);
  });

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
    cash:  stopsFiltered.filter(r => r.recommendation === "USE_CASH" || r.recommendation === "IF_HAVE_MILES").length,
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
  const priceQuality = useMemo(() => getPriceQualitySummary(results), [results]);
  const priceQualityItems = [
    { key: "live", label: t.qualityLive, count: priceQuality.live, tone: "success" as const },
    { key: "cached", label: t.qualityCached, count: priceQuality.cached, tone: "warning" as const },
    { key: "estimated", label: t.qualityEstimated, count: priceQuality.estimated, tone: "neutral" as const },
  ].filter(item => item.count > 0);

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
    if (tab === "cash")  r = r.filter(x => x.recommendation === "USE_CASH" || x.recommendation === "IF_HAVE_MILES");
    if (sortBy === "price") r.sort((a, b) => (a.totalPrice ?? 0) - (b.totalPrice ?? 0));
    else r.sort((a, b) => b.savings - a.savings);
    return r;
  }, [stopsFiltered, tab, sortBy]);

  const emptyState = useMemo(() => {
    if (results.length === 0) {
      return { title: t.empty, desc: t.emptyDesc, tips: t.emptyTips, canReset: false };
    }
    if (stopsFiltered.length === 0 && stopFilter === "direct") {
      return { title: t.noDirect, desc: t.noDirectDesc, tips: [], canReset: true };
    }
    if (stopsFiltered.length === 0 && stopFilter === "stops") {
      return { title: t.noStops, desc: t.noStopsDesc, tips: [], canReset: true };
    }
    if (tab === "miles") {
      return { title: t.noMiles, desc: t.noMilesDesc, tips: [], canReset: true };
    }
    if (tab === "cash") {
      return { title: t.noCash, desc: t.noCashDesc, tips: [], canReset: true };
    }
    return { title: t.empty, desc: t.emptyDesc, tips: t.emptyTips, canReset: true };
  }, [results.length, stopFilter, stopsFiltered.length, tab, t]);

  const resetResultsView = () => {
    setTab("all");
    setStopFilter("all");
    setSortBy("value");
  };

  // Animated progress loader state
  const loadingSteps = lang === "fr"
    ? [
        { icon: "signal" as const, msg: "Connexion aux sources de prix en temps réel…" },
        { icon: "plane" as const,  msg: "Données de vol récupérées, analyse en cours…" },
        { icon: "calculator" as const,  msg: "Calcul des options miles & cash…" },
        { icon: "rank" as const,  msg: "Tri des meilleures offres pour vous…" },
      ]
    : [
        { icon: "signal" as const, msg: "Connecting to live pricing sources…" },
        { icon: "plane" as const,  msg: "Flight data retrieved, analysing…" },
        { icon: "calculator" as const,  msg: "Computing miles & cash options…" },
        { icon: "rank" as const,  msg: "Ranking the best offers for you…" },
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
    // Safe to ignore exhaustive-deps: stepTimer and progTimer are internal timers
    // created and destroyed within this effect; they don't need to be listed as dependencies
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    const step = loadingSteps[loadStep];
    return (
      <div className="space-y-4 animate-fade-up">
        {/* Step message */}
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">
            <ResultIcon name={step.icon} className="h-4 w-4" />
          </span>
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
              key={`loading-step-${i}`}
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

      {/* Price source confidence */}
      {results.length > 0 && (
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-fg">{t.qualityTitle}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                {getPriceQualityMessage(priceQuality, lang)}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {priceQualityItems.map(item => (
                <Badge
                  key={item.key}
                  tone={item.tone}
                  className="whitespace-nowrap"
                >
                  {item.label}
                  <span className="tabular-nums text-fg">{item.count}</span>
                </Badge>
              ))}
            </div>
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
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-blue-500/25 bg-blue-500/10 text-blue-300">
            <ResultIcon name="info" className="h-3.5 w-3.5" />
          </span>
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
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-warning/25 bg-warning/10 text-warning">
            <ResultIcon name="warning" className="h-3.5 w-3.5" />
          </span>
          <p className="text-xs font-semibold text-warning">{t.partial}</p>
        </div>
      )}

      {/* Business/First mode contextual banner */}
      {results.length > 0 && searchMeta && isBusinessMode(searchMeta.cabin) && (
        <div className="flex items-center gap-3 px-4 py-3 bg-primary/10 border border-primary/20 rounded-xl">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">
            <ResultIcon name="plane" className="h-4 w-4" />
          </span>
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

      {results.length > 0 && (
        <p className="text-xs text-muted">
          {t.showingSorted(filtered.length, results.length, sortBy === "price" ? t.sortPrice : t.sortValue)}
        </p>
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
        <EmptyState
          icon={<ResultIcon name="plane" className="h-5 w-5 animate-float" />}
          title={emptyState.title}
          description={emptyState.desc}
          tips={emptyState.tips}
          action={emptyState.canReset ? (
            <Button type="button" variant="secondary" size="sm" onClick={resetResultsView} className="mt-2">
              {t.resetFilters}
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="space-y-3 stagger-children">
          {filtered.map((f, i) => (
            <div key={getFlightResultKey(f)} className="animate-fade-up">
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
