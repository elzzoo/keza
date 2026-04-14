"use client";

import clsx from "clsx";
import type { FlightResult } from "@/lib/engine";
import { AIRPORTS as airportsMap } from "@/data/airports";

// ── Recommendation config ─────────────────────────────────────────────────
const REC = {
  "USE MILES": {
    band: "bg-miles-band",
    labelFr: "UTILISER LES MILES",
    labelEn: "USE MILES",
    icon: "✈",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
  },
  "CONSIDER": {
    band: "bg-consider-band",
    labelFr: "À CONSIDÉRER",
    labelEn: "CONSIDER",
    icon: "◎",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  "USE CASH": {
    band: "bg-cash-band",
    labelFr: "PAYER EN CASH",
    labelEn: "USE CASH",
    icon: "◈",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
  },
} as const;

// Deal score badge based on CPP
function DealScore({ value, lang }: { value: number; lang: "fr" | "en" }) {
  if (value >= 2) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
      ★ {lang === "fr" ? "Excellent" : "Excellent"} · {value.toFixed(2)}¢/mile
    </span>
  );
  if (value >= 1.2) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
      ◆ {lang === "fr" ? "Bon deal" : "Good deal"} · {value.toFixed(2)}¢/mile
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
      {value.toFixed(2)}¢/mile
    </span>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────
const FCFA = 600;
function fcfa(usd: number) { return Math.round(usd * FCFA).toLocaleString("fr-FR"); }
function approxMiles(total: number, value: number) {
  if (value <= 0) return 0;
  return Math.round((total * 80) / value / 1000) * 1000;
}
function city(code: string, lang: "fr" | "en") {
  const a = airportsMap.find(x => x.code === code);
  return a ? (lang === "fr" ? a.city : a.cityEn) : code;
}

interface Props {
  flight: FlightResult;
  lang: "fr" | "en";
}

export function FlightCard({ flight, lang }: Props) {
  const rec = REC[flight.recommendation as keyof typeof REC] ?? REC["USE CASH"];
  const isMilesGood = flight.recommendation !== "USE CASH";
  const total = flight.totalPrice ?? 0;
  const milesEst = approxMiles(total, flight.value ?? 0);
  const label = lang === "fr" ? rec.labelFr : rec.labelEn;

  const opt = flight.optimization;
  let optBadge: { text: string; cls: string } | null = null;
  if (opt) {
    if (opt.type === "DIRECT" && opt.program)
      optBadge = { text: `● ${opt.program}`, cls: "bg-emerald-100 text-emerald-700 border-emerald-200" };
    else if (opt.type === "ALLIANCE" && opt.alliance)
      optBadge = { text: `◆ ${opt.alliance}${opt.viaProgram ? ` · ${opt.viaProgram}` : ""}`, cls: "bg-blue-100 text-blue-700 border-blue-200" };
    else if (opt.type === "TRANSFER")
      optBadge = { text: `⇄ Transfert`, cls: "bg-violet-100 text-violet-700 border-violet-200" };
  }

  const valuePercent = Math.min(100, Math.max(0, ((flight.value ?? 0) / 3) * 100));

  return (
    <div className={clsx(
      "bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden",
      "transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card-hover"
    )}>
      {/* Recommendation band */}
      <div className={clsx("px-5 py-2.5 flex items-center justify-between", rec.band)}>
        <div className="flex items-center gap-2">
          <span className="text-white/90 text-sm font-black tracking-widest uppercase">
            {rec.icon} {label}
          </span>
        </div>
        <DealScore value={flight.value ?? 0} lang={lang} />
      </div>

      {/* Card body */}
      <div className="p-5 space-y-4">

        {/* Route */}
        <div className="flex items-center justify-between">
          <div className="text-left">
            <div className="text-[38px] font-black text-fg tracking-tight leading-none">{flight.from}</div>
            <div className="text-xs text-muted mt-0.5">{city(flight.from, lang)}</div>
          </div>

          <div className="flex flex-col items-center gap-1 px-3">
            <div className="flex items-center gap-1">
              {flight.tripType === "roundtrip" && (
                <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                  {lang === "fr" ? "A/R" : "R/T"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-muted">
              <div className="w-8 h-px bg-slate-300" />
              <svg className="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
              </svg>
              <div className="w-8 h-px bg-slate-300" />
            </div>
            <div className="text-[10px] text-muted text-center">
              {(flight.stops ?? 0) === 0
                ? (lang === "fr" ? "Direct" : "Direct")
                : `${flight.stops ?? 0} ${lang === "fr" ? "esc." : "stop"}`
              } · {lang === "fr" ? "Éco" : "Eco"} · {flight.passengers ?? 1} pax
            </div>
          </div>

          <div className="text-right">
            <div className="text-[38px] font-black text-fg tracking-tight leading-none">{flight.to}</div>
            <div className="text-xs text-muted mt-0.5">{city(flight.to, lang)}</div>
          </div>
        </div>

        {/* Airline tags */}
        <div className="flex flex-wrap gap-1.5">
          {[...flight.airlines, ...flight.returnAirlines]
            .filter((a, i, arr) => arr.indexOf(a) === i)
            .map(a => (
              <span key={a} className="text-xs text-muted bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg font-medium">
                {a}
              </span>
            ))}
        </div>

        {/* Tear line */}
        <div className="tear-line" />

        {/* Cash / Miles panels */}
        <div className="grid grid-cols-2 gap-3">
          {/* Cash panel */}
          <div className={clsx(
            "rounded-xl p-3.5 border transition-all",
            !isMilesGood
              ? "bg-amber-50 border-amber-200 ring-1 ring-amber-200"
              : "bg-slate-50 border-slate-200"
          )}>
            <div className="text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-1 mb-2">
              <span>💳</span>
              <span>{lang === "fr" ? "Payer cash" : "Pay cash"}</span>
            </div>
            <p className="text-2xl font-black text-fg leading-none font-mono tabular-nums">
              ${total.toFixed(0)}
            </p>
            <p className="text-[11px] text-muted mt-0.5">~{fcfa(total)} FCFA</p>
            {flight.returnPrice > 0 && (
              <p className="text-[10px] text-muted/60 mt-0.5">
                ${flight.price} + ${flight.returnPrice}
              </p>
            )}
          </div>

          {/* Miles panel */}
          <div className={clsx(
            "rounded-xl p-3.5 border transition-all",
            isMilesGood
              ? "bg-blue-50 border-blue-200 ring-1 ring-blue-200"
              : "bg-slate-50 border-slate-200"
          )}>
            <div className="text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-1 mb-2">
              <span>✈</span>
              <span>{lang === "fr" ? "Utiliser miles" : "Use miles"}</span>
            </div>
            {milesEst > 0 ? (
              <>
                <p className="text-2xl font-black leading-none font-mono tabular-nums text-primary">
                  ~{milesEst >= 1000 ? `${(milesEst / 1000).toFixed(0)}K` : milesEst}
                </p>
                <p className="text-[11px] text-muted mt-0.5">{lang === "fr" ? "pts estimés" : "est. points"}</p>
                {(flight.savings ?? 0) > 0 && (
                  <p className="text-[11px] font-bold text-emerald-600 mt-0.5">
                    {lang === "fr" ? "Éco." : "Save"} ${flight.savings}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">{lang === "fr" ? "Non applicable" : "N/A"}</p>
            )}
          </div>
        </div>

        {/* Value meter */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">{lang === "fr" ? "Valeur miles" : "Miles value"}</span>
            <span className="font-bold text-fg">{(flight.value ?? 0).toFixed(2)} cts/mile</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={clsx(
                "h-full rounded-full transition-all duration-700",
                (flight.value ?? 0) >= 2 ? "bg-emerald-500" : (flight.value ?? 0) >= 1.2 ? "bg-primary" : "bg-amber-400"
              )}
              style={{ width: `${valuePercent}%` }}
            />
          </div>
        </div>

        {/* Bottom badges */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {optBadge && (
            <span className={clsx("inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border", optBadge.cls)}>
              {optBadge.text}
            </span>
          )}
          {(flight.savings ?? 0) > 0 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 ml-auto">
              +${flight.savings ?? 0} {lang === "fr" ? "d'économie" : "saved"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
