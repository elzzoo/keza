"use client";

import clsx from "clsx";
import { useState, useEffect } from "react";
import type { FlightResult } from "@/lib/engine";
import { AIRPORTS as airportsMap } from "@/data/airports";
import { trackBookClick } from "@/lib/analytics";
import { getOrAssignVariant, CTA_COPY } from "@/lib/abtest";

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatMiles(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);
}

function city(code: string, lang: "fr" | "en") {
  const a = airportsMap.find(x => x.code === code);
  return a ? (lang === "fr" ? a.city : a.cityEn) : code;
}

function formatDuration(minutes: number, lang: "fr" | "en"): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (lang === "fr") return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Type labels
const TYPE_LABEL = {
  fr: { DIRECT: "Direct", ALLIANCE: "Alliance", TRANSFER: "Transfert" },
  en: { DIRECT: "Direct", ALLIANCE: "Alliance", TRANSFER: "Transfer" },
} as const;

// Confidence labels
const CONFIDENCE_BADGE: Record<string, { fr: string; en: string; color: string }> = {
  HIGH:   { fr: "Prix confirmé",   en: "Confirmed price", color: "bg-success/15 text-success border-success/20" },
  MEDIUM: { fr: "Bonne estimation", en: "Good estimate",  color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  LOW:    { fr: "Estimation",       en: "Estimate",        color: "bg-warning/15 text-warning border-warning/20" },
};

interface Props {
  flight: FlightResult;
  lang: "fr" | "en";
  /** Format a USD amount into user's chosen currency */
  formatPrice?: (usd: number) => string;
  /** True for the top card in the sorted results list */
  isGlobalBest?: boolean;
}

/** Responsive text size — shrinks for long formatted prices (e.g. FCFA) */
function priceSize(formatted: string): string {
  const len = formatted.length;
  if (len > 12) return "text-base";
  if (len > 8) return "text-lg";
  return "text-2xl";
}

export function FlightCard({ flight, lang, formatPrice, isGlobalBest = false }: Props) {
  const fr = lang === "fr";
  const fmt = formatPrice ?? ((usd: number) => `$${Math.round(usd)}`);
  const [variant, setVariant] = useState<"A" | "B">("A");
  useEffect(() => {
    setVariant(getOrAssignVariant());
  }, []);

  const cashCost   = flight.cashCost;
  const milesCost  = flight.milesCost;
  const stops      = flight.stops ?? 0;
  const duration   = flight.duration;
  const bestOption = flight.bestOption;
  const isUseMiles = flight.recommendation === "USE_MILES";
  const savingsRatio = flight.cashCost > 0 ? Math.abs(flight.savings) / flight.cashCost : 0;
  const isNearParity = savingsRatio < 0.05 && bestOption !== null;

  const [showAlts, setShowAlts] = useState(false);
  const alternatives = (flight.milesOptions ?? [])
    .filter(o => !o.isBestDeal)
    .slice(0, 3);

  // Airlines deduped
  const airlines = [...flight.airlines, ...(flight.returnAirlines ?? [])]
    .filter((a, i, arr) => arr.indexOf(a) === i)
    .filter(Boolean)
    .filter(a => !(a.length === 2 && /^[A-Z]{2}$/.test(a)));  // hide unresolved 2-letter IATA codes

  // Confidence badge for the miles estimate
  const confidence = bestOption?.confidence ?? "LOW";
  const badge = CONFIDENCE_BADGE[confidence] ?? CONFIDENCE_BADGE.LOW;

  return (
    <div className={clsx(
      "bg-surface rounded-2xl border overflow-hidden hover-lift",
      "transition-all duration-200 hover:shadow-card-hover",
      isUseMiles ? "border-blue-500/30" : "border-border"
    )}>

      {/* DECISION BANNER */}
      <div className={clsx(
        "px-5 py-4 text-center relative",
        isUseMiles ? "bg-blue-500/10" : "bg-surface"
      )}>

        {/* Global best badge — top-right corner */}
        {isGlobalBest && (
          <div className="absolute top-3 right-3 bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
            🥇 {fr ? "Meilleure offre" : "Best deal"}
          </div>
        )}

        {/* Primary message — generated client-side so it uses the user's currency */}
        <div className={clsx(
          "text-lg font-black",
          isUseMiles ? "text-blue-400" : "text-amber-400"
        )}>
          {isNearParity
            ? (fr ? "≈ Prix équivalent — garde tes miles" : "≈ Equivalent — keep your miles")
            : !bestOption
              ? (fr ? "💵 Paiement cash uniquement" : "💵 Cash only")
              : flight.recommendation === "USE_MILES"
                ? (fr
                    ? `🔥 Tu économises ${fmt(flight.savings)} avec les miles`
                    : `🔥 You save ${fmt(flight.savings)} with miles`)
                : flight.savings > 0
                  ? (fr
                      ? `💵 Cash moins cher — économise ${fmt(flight.savings)}`
                      : `💵 Pay cash — save ${fmt(flight.savings)}`)
                  : (fr ? "💵 Cash légèrement avantageux" : "💵 Cash slightly better")}
        </div>

        {/* Program context line */}
        {bestOption && (
          <div className="text-[11px] text-muted mt-0.5">
            via {bestOption.program} ({TYPE_LABEL[lang][bestOption.type].toLowerCase()})
          </div>
        )}

        {/* Route info + confidence badge */}
        <div className="text-[11px] text-muted mt-1.5 flex items-center justify-center gap-1.5 flex-wrap">
          <span>{city(flight.from, lang)} → {city(flight.to, lang)}</span>
          <span className="text-subtle">·</span>
          <span>{stops === 0 ? (fr ? "Direct" : "Nonstop") : `${stops} ${fr ? "escale" : "stop"}${stops > 1 ? "s" : ""}`}</span>
          {duration && duration > 0 && (
            <>
              <span className="text-subtle">·</span>
              <span>{formatDuration(duration, lang)}</span>
            </>
          )}
          {flight.tripType === "roundtrip" && (
            <>
              <span className="text-subtle">·</span>
              <span>{fr ? "A/R" : "Round trip"}</span>
            </>
          )}
          {/* Confidence badge — only shown for estimates or non-HIGH confidence */}
          {bestOption && (bestOption.chartSource === "ESTIMATE" || confidence !== "HIGH") && (
            <span className={clsx(
              "text-[9px] font-semibold px-1.5 py-0.5 rounded border",
              badge.color
            )}>
              {fr ? badge.fr : badge.en}
            </span>
          )}
        </div>
      </div>

      {/* Supplemental airline — price is indicative (not from the airline's own booking system) */}
      {flight.isSupplemental && (
        <div className="bg-sky-500/10 text-sky-400 border-b border-sky-500/20 px-5 py-2 text-[11px] text-center font-medium space-y-0.5">
          <div>✈️ {fr ? "Vol direct disponible" : "Direct flight available"}</div>
          <div className="text-sky-400/70 text-[10px]">
            {fr ? "💵 Prix indicatif (non temps réel) — vérifier sur le site de la compagnie" : "💵 Indicative price (not real-time) — check airline website"}
          </div>
        </div>
      )}

      {/* Estimated cabin warning — shown when business/first price is estimated */}
      {flight.cabinPriceEstimated && (
        <div className="bg-amber-500/10 text-amber-400 border-b border-amber-500/20 px-5 py-1.5 text-[11px] text-center font-medium">
          {fr
            ? "⚠️ Business/First — prix du marché estimé, pas garanti"
            : "⚠️ Business/First — market price estimate, not guaranteed"}
        </div>
      )}

      {/* COST COMPARISON — side by side */}
      <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
        {/* Cash */}
        <div className="px-4 py-3.5 text-center">
          {flight.isSupplemental ? (
            <>
              <div className="font-black tabular-nums text-base text-sky-400">
                ~{fmt(cashCost)}
              </div>
              <div className="text-[9px] text-muted/60 mt-0.5">
                – {fmt(Math.round(cashCost * 1.3))}
              </div>
            </>
          ) : (
            <div className={clsx(
              "font-black tabular-nums",
              priceSize(fmt(cashCost)),
              !isUseMiles ? "text-success" : "text-fg"
            )}>
              {fmt(cashCost)}
            </div>
          )}
          <div className="text-[10px] text-muted uppercase tracking-widest mt-1 font-bold">
            Cash
          </div>
        </div>

        {/* Miles */}
        <div className="px-4 py-3.5 text-center">
          {milesCost > 0 ? (
            <>
              <div className={clsx(
                "font-black tabular-nums",
                priceSize(fmt(milesCost)),
                isUseMiles ? "text-success" : "text-fg"
              )}>
                {fmt(milesCost)}
              </div>
              <div className="text-[10px] text-muted uppercase tracking-widest mt-1 font-bold">
                Miles
              </div>
              <div className="text-[9px] text-muted/50 mt-0.5">
                {bestOption && formatMiles(bestOption.milesRequired)} pts
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-black text-subtle">—</div>
              <div className="text-[10px] text-muted uppercase tracking-widest mt-1 font-bold">
                Miles
              </div>
            </>
          )}
        </div>
      </div>

      {/* WHY SECTION — program + type + miles breakdown */}
      {bestOption && (
        <div className="px-5 py-3.5 border-t border-border space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx(
              "text-[10px] font-bold px-2 py-0.5 rounded-md border",
              isUseMiles
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : "bg-surface-2 text-muted border-border"
            )}>
              {TYPE_LABEL[lang][bestOption.type]}
            </span>
            <span className="text-[12px] font-bold text-fg">
              {bestOption.program}
            </span>
            {bestOption.via && (
              <span className="text-[10px] text-muted">
                via {bestOption.via}
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted leading-relaxed">
            {formatMiles(bestOption.milesRequired)} miles × {bestOption.valuePerMile.toFixed(1)}¢/mile + {fmt(bestOption.taxes)} taxes = <span className="font-bold text-fg">{fmt(milesCost)}</span>
          </div>
        </div>
      )}

      {/* ALTERNATIVES — top 2-3 other options */}
      {alternatives.length > 0 && (
        <div className="border-t border-border">
          <button
            onClick={() => setShowAlts(v => !v)}
            className="w-full px-5 py-2.5 flex items-center justify-between text-[11px] text-muted hover:text-fg transition-colors"
          >
            <span>{fr ? `${alternatives.length} autre${alternatives.length > 1 ? "s" : ""} option${alternatives.length > 1 ? "s" : ""}` : `${alternatives.length} more option${alternatives.length > 1 ? "s" : ""}`}</span>
            <span className="text-subtle">{showAlts ? "▲" : "▼"}</span>
          </button>
          {showAlts && (
            <div className="px-5 pb-3 space-y-2">
              {alternatives.map((opt, i) => {
                const scenType = (opt.via?.startsWith("Achat") ? "BUY" : opt.type) as "DIRECT" | "ALLIANCE" | "TRANSFER" | "BUY";
                const typeColors: Record<string, string> = {
                  DIRECT:   "bg-blue-500/10 text-blue-400 border-blue-500/20",
                  ALLIANCE: "bg-purple-500/10 text-purple-400 border-purple-500/20",
                  TRANSFER: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                  BUY:      "bg-green-500/10 text-green-400 border-green-500/20",
                };
                const typeLabels: Record<string, { fr: string; en: string }> = {
                  DIRECT:   { fr: "Direct",    en: "Direct" },
                  ALLIANCE: { fr: "Alliance",  en: "Alliance" },
                  TRANSFER: { fr: "Transfert", en: "Transfer" },
                  BUY:      { fr: "Achat",     en: "Buy" },
                };
                const confScore = opt.confidence === "HIGH" ? 95 : opt.confidence === "MEDIUM" ? 70 : 45;
                return (
                  <div key={i} className="flex items-center justify-between text-[11px] py-1.5 border-t border-border/50 first:border-t-0">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className={clsx("text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0", typeColors[scenType])}>
                        {fr ? typeLabels[scenType].fr : typeLabels[scenType].en}
                      </span>
                      <span className="text-muted font-semibold truncate">{opt.program}</span>
                      {opt.via && !opt.via.startsWith("Achat") && (
                        <span className="text-subtle shrink-0">via {opt.via}</span>
                      )}
                      {opt.promoApplied && (
                        <span className="text-[9px] text-success font-bold shrink-0">🎁 bonus</span>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-2 space-y-0.5">
                      <div className="font-bold text-fg">{fmt(opt.totalMilesCost)}</div>
                      <div className="text-subtle text-[9px]">{formatMiles(opt.milesRequired)}pts · {confScore}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Airlines + stops */}
      {airlines.length > 0 && (
        <div className="px-5 py-2 flex flex-wrap gap-1.5 border-t border-border">
          {airlines.map(a => (
            <span key={a} className="text-[10px] text-muted bg-surface-2 border border-border px-2 py-0.5 rounded-md font-medium">
              {a}
            </span>
          ))}
        </div>
      )}

      {/* Booking CTA */}
      {flight.bookingLink && (
        <div className="px-4 pb-4 pt-2 border-t border-border">
          <a
            href={flight.bookingLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackBookClick({
              from: flight.from,
              to: flight.to,
              cabin: flight.cabin,
              recommendation: flight.recommendation ?? "NONE",
              savings: flight.savings,
              airline: airlines[0],
              variant,
            })}
            className={clsx(
              "flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl text-[13px] font-bold transition-all hover-lift",
              flight.isSupplemental
                ? "bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/30"
                : isUseMiles
                  ? "bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/30"
                  : "bg-warning/10 text-warning hover:bg-warning/20 border border-warning/25"
            )}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            {flight.isSupplemental
              ? (fr ? "Voir sur le site de la compagnie" : "Check airline website")
              : (fr ? CTA_COPY[variant].fr : CTA_COPY[variant].en)}
          </a>
        </div>
      )}
    </div>
  );
}
