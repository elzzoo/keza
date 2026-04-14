"use client";

import clsx from "clsx";
import type { FlightResult } from "@/lib/engine";
import type { OptimizerDecision } from "@/lib/optimizer";
import { AIRPORTS as airportsMap } from "@/data/airports";

// ── Recommendation config ────────────────────────────────────────────────────
const REC = {
  "USE MILES": {
    labelFr: "UTILISER LES MILES",
    labelEn: "USE MILES",
    cls: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    icon: "✈",
  },
  "CONSIDER": {
    labelFr: "À CONSIDÉRER",
    labelEn: "CONSIDER",
    cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: "◎",
  },
  "USE CASH": {
    labelFr: "PAYER EN CASH",
    labelEn: "USE CASH",
    cls: "bg-warning/10 text-warning border-warning/25",
    icon: "◈",
  },
} as const;

// ── Why text ─────────────────────────────────────────────────────────────────
function whyText(flight: FlightResult, lang: "fr" | "en"): string {
  const v = (flight.value ?? 0).toFixed(1);
  const opt: OptimizerDecision = flight.optimization;
  const fr = lang === "fr";

  let program: string | null = null;
  if (opt.type === "DIRECT")   program = opt.program;
  if (opt.type === "ALLIANCE") program = opt.viaProgram ?? opt.alliance ?? null;
  if (opt.type === "TRANSFER") program = opt.to;

  if (flight.recommendation === "USE MILES") {
    return program
      ? (fr
          ? `Tes miles ${program} valent ${v}¢ ici (seuil : 2¢). Excellent deal — rachète tes points maintenant.`
          : `Your ${program} miles are worth ${v}¢ here (threshold: 2¢). Excellent — redeem now.`)
      : (fr
          ? `Valeur miles à ${v}¢ — au-dessus du seuil optimal. Utilise tes points.`
          : `Miles value at ${v}¢ — above optimal threshold. Use your points.`);
  }
  if (flight.recommendation === "CONSIDER") {
    return program
      ? (fr
          ? `Valeur correcte à ${v}¢/mile via ${program}. Pertinent si tu as des miles à écouler.`
          : `Decent value at ${v}¢/mile via ${program}. Worth it if you have miles to use.`)
      : (fr
          ? `Valeur correcte à ${v}¢/mile. Pertinent si tu as des miles disponibles.`
          : `Decent value at ${v}¢/mile. Worth it if you have miles available.`);
  }
  // USE CASH
  return fr
    ? `À ${v}¢/mile, le cash est plus avantageux ici. Garde tes miles pour un meilleur deal.`
    : `At ${v}¢/mile, cash wins here. Save your miles for a better opportunity.`;
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
  const rec = REC[flight.recommendation as keyof typeof REC] ?? REC["USE CASH"];
  const label = fr ? rec.labelFr : rec.labelEn;

  const total    = flight.totalPrice ?? 0;
  const value    = flight.value ?? 0;
  const savings  = flight.savings ?? 0;
  const stops    = flight.stops ?? 0;

  // Miles estimate (reverse from total + value)
  const milesEst = total > 0 && value > 0
    ? Math.round((total * 80) / value / 1000) * 1000
    : 0;

  // Value bar — blue for USE MILES, dimmer for lower values (green reserved for savings)
  const valuePercent = Math.min(100, Math.max(0, (value / 2) * 100));
  const barCls = value >= 2 ? "bg-primary" : value >= 1 ? "bg-primary/50" : "bg-subtle";

  // Airlines deduped
  const airlines = [...flight.airlines, ...(flight.returnAirlines ?? [])]
    .filter((a, i, arr) => arr.indexOf(a) === i)
    .filter(Boolean);

  const why = whyText(flight, lang);

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
      <div className="grid grid-cols-3 divide-x divide-border">
        {/* Savings */}
        <div className="px-3 py-4 text-center">
          <div className={clsx(
            "text-2xl font-black leading-none tabular-nums",
            savings > 0 ? "text-success" : "text-subtle"
          )}>
            {savings > 0 ? `+$${savings.toFixed(0)}` : "—"}
          </div>
          <div className="text-[10px] text-muted uppercase tracking-widest mt-1.5 font-bold">
            {fr ? "Économie" : "Savings"}
          </div>
          {savings > 0 && (
            <div className="text-[10px] text-muted/60 mt-0.5">
              ~{fcfa(savings)} FCFA
            </div>
          )}
        </div>

        {/* Cash */}
        <div className="px-3 py-4 text-center">
          <div className="text-2xl font-black leading-none tabular-nums text-fg">
            ${total.toFixed(0)}
          </div>
          <div className="text-[10px] text-muted uppercase tracking-widest mt-1.5 font-bold">
            {fr ? "Prix cash" : "Cash price"}
          </div>
          <div className="text-[10px] text-muted/60 mt-0.5">
            ~{fcfa(total)} FCFA
          </div>
        </div>

        {/* Miles */}
        <div className="px-3 py-4 text-center">
          {milesEst > 0 ? (
            <>
              <div className="text-2xl font-black leading-none tabular-nums text-fg">
                {milesEst >= 1000 ? `${(milesEst / 1000).toFixed(0)}K` : milesEst}
              </div>
              <div className="text-[10px] text-muted uppercase tracking-widest mt-1.5 font-bold">
                {fr ? "pts estimés" : "est. points"}
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-black leading-none text-subtle">—</div>
              <div className="text-[10px] text-muted uppercase tracking-widest mt-1.5 font-bold">
                {fr ? "pts estimés" : "est. points"}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Value bar ────────────────────────────────────────────── */}
      <div className="px-5 py-3 border-t border-border space-y-1.5">
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-muted font-medium uppercase tracking-wider">
            {fr ? "Valeur miles" : "Miles value"}
          </span>
          <span className={clsx(
            "font-bold",
            value >= 2 ? "text-primary" : value >= 1 ? "text-blue-400/70" : "text-muted"
          )}>
            {value.toFixed(2)}¢/mile{value >= 2 ? " ★" : ""}
          </span>
        </div>
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className={clsx("h-full rounded-full transition-all duration-700", barCls)}
            style={{ width: `${valuePercent}%` }}
          />
        </div>
      </div>

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

      {/* ── Why ──────────────────────────────────────────────────── */}
      <div className="px-5 py-3.5 border-t border-border">
        <p className="text-[10px] font-bold text-subtle uppercase tracking-widest mb-1.5">
          {fr ? "Pourquoi ce choix ?" : "Why this recommendation?"}
        </p>
        <p className="text-[12px] text-muted leading-relaxed">{why}</p>
      </div>
    </div>
  );
}
