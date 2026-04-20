"use client";

import clsx from "clsx";
import type { FlightResult } from "@/lib/engine";
import { AIRPORTS as airportsMap } from "@/data/airports";

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatMiles(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);
}

function city(code: string, lang: "fr" | "en") {
  const a = airportsMap.find(x => x.code === code);
  return a ? (lang === "fr" ? a.city : a.cityEn) : code;
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
}

/** Responsive text size — shrinks for long formatted prices (e.g. FCFA) */
function priceSize(formatted: string): string {
  const len = formatted.length;
  if (len > 12) return "text-base";
  if (len > 8) return "text-lg";
  return "text-2xl";
}

export function FlightCard({ flight, lang, formatPrice }: Props) {
  const fr = lang === "fr";
  const fmt = formatPrice ?? ((usd: number) => `$${Math.round(usd)}`);

  const cashCost   = flight.cashCost;
  const milesCost  = flight.milesCost;
  const savings    = flight.savings;
  const stops      = flight.stops ?? 0;
  const bestOption = flight.bestOption;
  const isUseMiles = flight.recommendation === "USE_MILES";
  const isEquivalent = flight.recommendation === "EQUIVALENT";

  // Airlines deduped
  const airlines = [...flight.airlines, ...(flight.returnAirlines ?? [])]
    .filter((a, i, arr) => arr.indexOf(a) === i)
    .filter(Boolean);

  // Confidence badge for the miles estimate
  const confidence = bestOption?.confidence ?? "LOW";
  const badge = CONFIDENCE_BADGE[confidence] ?? CONFIDENCE_BADGE.LOW;

  return (
    <div className={clsx(
      "bg-surface rounded-2xl border overflow-hidden",
      "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover",
      isUseMiles ? "border-blue-500/30" : isEquivalent ? "border-emerald-500/30" : "border-border"
    )}>

      {/* DECISION BANNER */}
      <div className={clsx(
        "px-5 py-4 text-center",
        isUseMiles ? "bg-blue-500/10" : isEquivalent ? "bg-emerald-500/5" : "bg-surface"
      )}>
        {isUseMiles ? (
          <div className="text-lg font-black text-blue-400">
            {fr ? `Economisez ${fmt(savings)} avec les miles` : `Save ${fmt(savings)} with miles`}
          </div>
        ) : isEquivalent ? (
          <div className="text-lg font-black text-emerald-400">
            {fr ? "Cash \u2248 Miles \u2014 au choix" : "Cash \u2248 Miles \u2014 your call"}
          </div>
        ) : savings > 0 ? (
          <div className="text-lg font-black text-warning">
            {fr ? `Miles co\u00fbtent ${fmt(savings)} de plus` : `Miles cost ${fmt(savings)} more`}
          </div>
        ) : (
          <div className="text-lg font-black text-muted">
            {fr ? "Pas d'option miles disponible" : "No miles option available"}
          </div>
        )}
        <div className="text-[11px] text-muted mt-1">
          {city(flight.from, lang)} \u2192 {city(flight.to, lang)}
          {" \u00b7 "}
          {stops === 0 ? "Direct" : `${stops} ${fr ? "escale" : "stop"}${stops > 1 ? "s" : ""}`}
          {flight.tripType === "roundtrip" && (fr ? " \u00b7 A/R" : " \u00b7 Round trip")}
        </div>
      </div>

      {/* COST COMPARISON — side by side */}
      <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
        {/* Cash */}
        <div className="px-4 py-3.5 text-center">
          <div className={clsx(
            "font-black tabular-nums",
            priceSize(fmt(cashCost)),
            !isUseMiles && !isEquivalent ? "text-success" : isEquivalent ? "text-emerald-400" : "text-fg"
          )}>
            {fmt(cashCost)}
          </div>
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
                isUseMiles ? "text-success" : isEquivalent ? "text-emerald-400" : "text-fg"
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
              <div className="text-2xl font-black text-subtle">\u2014</div>
              <div className="text-[10px] text-muted uppercase tracking-widest mt-1 font-bold">
                Miles
              </div>
            </>
          )}
        </div>
      </div>

      {/* WHY SECTION — program + type + confidence badge */}
      {bestOption && (
        <div className="px-5 py-3.5 border-t border-border space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx(
              "text-[10px] font-bold px-2 py-0.5 rounded-md border",
              isUseMiles || isEquivalent
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
            {/* Confidence badge */}
            <span className={clsx(
              "text-[9px] font-semibold px-1.5 py-0.5 rounded border ml-auto",
              badge.color
            )}>
              {fr ? badge.fr : badge.en}
            </span>
          </div>
          <div className="text-[11px] text-muted leading-relaxed">
            {formatMiles(bestOption.milesRequired)} miles \u00d7 {bestOption.valuePerMile.toFixed(1)}\u00a2/mile + {fmt(bestOption.taxes)} taxes = <span className="font-bold text-fg">{fmt(milesCost)}</span>
          </div>
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
        <a
          href={flight.bookingLink}
          target="_blank"
          rel="noopener noreferrer"
          className={clsx(
            "block px-5 py-3 text-center text-[12px] font-bold border-t border-border transition-colors uppercase tracking-widest",
            isUseMiles
              ? "text-blue-400 bg-blue-500/5 hover:bg-blue-500/10"
              : isEquivalent
                ? "text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10"
                : "text-warning bg-warning/5 hover:bg-warning/10"
          )}
        >
          {fr ? "R\u00e9server ce vol \u2192" : "Book this flight \u2192"}
        </a>
      )}
    </div>
  );
}
