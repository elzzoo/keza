"use client";

import clsx from "clsx";
import type { FlightResult } from "@/lib/engine";
import { AIRPORTS as airportsMap } from "@/data/airports";

// ── Recommendation config ────────────────────────────────────────────────────
const REC = {
  "USE_MILES": {
    labelFr: "UTILISEZ VOS MILES",
    labelEn: "USE MILES",
    cls: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    icon: "✈",
  },
  "USE_CASH": {
    labelFr: "PAYEZ EN CASH",
    labelEn: "USE CASH",
    cls: "bg-warning/10 text-warning border-warning/25",
    icon: "◈",
  },
} as const;

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatMiles(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const FCFA = 600;
function fcfa(usd: number) { return Math.round(usd * FCFA).toLocaleString("fr-FR"); }

function city(code: string, lang: "fr" | "en") {
  const a = airportsMap.find(x => x.code === code);
  return a ? (lang === "fr" ? a.city : a.cityEn) : code;
}

interface Props {
  flight: FlightResult;
  lang: "fr" | "en";
}

export function FlightCard({ flight, lang }: Props) {
  const fr = lang === "fr";
  const rec = REC[flight.recommendation as keyof typeof REC] ?? REC["USE_CASH"];
  const label = fr ? rec.labelFr : rec.labelEn;

  const cashCost  = flight.cashCost;
  const milesCost = flight.milesCost;
  const savings   = flight.savings;
  const stops     = flight.stops ?? 0;
  const bestOption = flight.bestOption;
  const isUseMiles = flight.recommendation === "USE_MILES";

  // Airlines deduped
  const airlines = [...flight.airlines, ...(flight.returnAirlines ?? [])]
    .filter((a, i, arr) => arr.indexOf(a) === i)
    .filter(Boolean);

  return (
    <div className={clsx(
      "bg-surface rounded-2xl border border-border overflow-hidden",
      "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
    )}>

      {/* ── Header: route + badge ─────────────────────────────── */}
      <div className="px-5 py-3.5 flex items-start justify-between border-b border-border">
        <div>
          <div className="flex items-center gap-2 font-bold text-fg">
            <span className="text-base">{flight.from}</span>
            <svg className="w-3.5 h-3.5 text-subtle flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
            <span className="text-base">{flight.to}</span>
            {flight.tripType === "roundtrip" && (
              <span className="text-[10px] font-bold bg-primary/15 text-blue-400 px-1.5 py-0.5 rounded-md border border-primary/20">
                {fr ? "A/R" : "R/T"}
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted mt-0.5">
            {city(flight.from, lang)} → {city(flight.to, lang)}
            {" · "}
            {fr
              ? (flight.cabin === "economy" ? "Éco" : flight.cabin === "premium" ? "Premium" : "Business")
              : (flight.cabin === "economy" ? "Eco" : flight.cabin === "premium" ? "Premium" : "Business")
            }
            {" · "}{flight.passengers ?? 1} pax
          </div>
        </div>
        <span className={clsx(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border flex-shrink-0",
          rec.cls
        )}>
          {rec.icon} {label}
        </span>
      </div>

      {/* ── Hero: 3 numbers ──────────────────────────────────────── */}
      {/* ── Hero: Cash vs Miles comparison ─────────────────────── */}
      <div className="grid grid-cols-2 divide-x divide-border">
        {/* Cash cost */}
        <div className="px-4 py-4 text-center">
          <div className={clsx(
            "text-2xl font-black leading-none tabular-nums",
            !isUseMiles ? "text-success" : "text-fg"
          )}>
            ${cashCost.toFixed(0)}
          </div>
          <div className="text-[10px] text-muted uppercase tracking-widest mt-1.5 font-bold">
            {fr ? "Prix cash" : "Cash"}
          </div>
          <div className="text-[10px] text-muted/60 mt-0.5">
            ~{fcfa(cashCost)} FCFA
          </div>
        </div>

        {/* Miles cost */}
        <div className="px-4 py-4 text-center">
          {milesCost > 0 ? (
            <>
              <div className={clsx(
                "text-2xl font-black leading-none tabular-nums",
                isUseMiles ? "text-success" : "text-fg"
              )}>
                ${milesCost.toFixed(0)}
              </div>
              <div className="text-[10px] text-muted uppercase tracking-widest mt-1.5 font-bold">
                {fr ? "Coût miles" : "Miles cost"}
              </div>
              {bestOption && (
                <div className="text-[9px] text-muted/60 mt-0.5">{bestOption.program}</div>
              )}
            </>
          ) : (
            <>
              <div className="text-2xl font-black leading-none text-subtle">—</div>
              <div className="text-[10px] text-muted uppercase tracking-widest mt-1.5 font-bold">
                {fr ? "Coût miles" : "Miles cost"}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Savings banner ───────────────────────────────────────── */}
      {savings > 0 && (
        <div className={clsx(
          "px-5 py-3 border-t border-border text-center",
          isUseMiles ? "bg-blue-500/5" : "bg-warning/5"
        )}>
          <span className={clsx(
            "text-sm font-black",
            isUseMiles ? "text-blue-400" : "text-warning"
          )}>
            {isUseMiles
              ? (fr ? `Économisez $${savings.toFixed(0)} avec les miles` : `Save $${savings.toFixed(0)} with miles`)
              : (fr ? `Miles coûtent $${savings.toFixed(0)} de plus` : `Miles cost $${savings.toFixed(0)} more`)
            }
          </span>
        </div>
      )}

      {/* ── Miles breakdown ──────────────────────────────────────── */}
      {bestOption && (
        <div className="px-5 py-2.5 border-t border-border">
          <div className="text-[9px] text-muted/70">
            {formatMiles(bestOption.milesRequired)} miles × {bestOption.valuePerMile.toFixed(1)}¢ + ${bestOption.taxes.toFixed(0)} {fr ? "taxes" : "taxes"}
            {bestOption.via && <span className="ml-1">(via {bestOption.via})</span>}
            {bestOption.confidence !== "HIGH" && (
              <span className="ml-1 italic">({fr ? "estimé" : "est."})</span>
            )}
          </div>
        </div>
      )}

      {/* ── Tags ─────────────────────────────────────────────────── */}
      <div className="px-5 py-2.5 flex flex-wrap gap-1.5 border-t border-border">
        {airlines.map(a => (
          <span key={a} className="text-[11px] text-muted bg-surface-2 border border-border px-2 py-0.5 rounded-md font-medium">
            {a}
          </span>
        ))}
        <span className="text-[11px] text-muted bg-surface-2 border border-border px-2 py-0.5 rounded-md">
          {stops === 0 ? (fr ? "Direct" : "Direct") : `${stops} ${fr ? "esc." : "stop"}`}
        </span>
        {(flight.returnPrice ?? 0) > 0 && (
          <span className="text-[11px] text-muted bg-surface-2 border border-border px-2 py-0.5 rounded-md">
            {fr ? "Aller" : "Out"} ${flight.price} · {fr ? "Retour" : "Ret"} ${flight.returnPrice}
          </span>
        )}
      </div>

      {/* ── Explanation ────────────────────────────────────────────── */}
      <div className="px-5 py-3.5 border-t border-border">
        <p className="text-[12px] text-muted leading-relaxed">{flight.explanation}</p>
      </div>

      {/* ── Booking CTA ──────────────────────────────────────────── */}
      {flight.bookingLink && (
        <a
          href={flight.bookingLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block px-5 py-3 text-center text-[12px] font-bold text-blue-400 bg-primary/5 hover:bg-primary/10 border-t border-border transition-colors uppercase tracking-widest"
        >
          {fr ? "Réserver ce vol →" : "Book this flight →"}
        </a>
      )}
    </div>
  );
}
