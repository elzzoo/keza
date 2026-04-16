"use client";

import clsx from "clsx";
import type { FlightResult } from "@/lib/engine";
import { AIRPORTS as airportsMap } from "@/data/airports";

// ── Recommendation config ────────────────────────────────────────────────────
const REC = {
  "MILES_WIN": {
    labelFr: "MILES GAGNENT",
    labelEn: "MILES WIN",
    cls: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    icon: "✈",
  },
  "MILES_IF_OWNED": {
    labelFr: "SI TU AS LES MILES",
    labelEn: "IF YOU HAVE MILES",
    cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: "◎",
  },
  "CASH_WINS": {
    labelFr: "CASH GAGNE",
    labelEn: "CASH WINS",
    cls: "bg-warning/10 text-warning border-warning/25",
    icon: "◈",
  },
} as const;

// ── Why text ─────────────────────────────────────────────────────────────────
function formatMiles(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);
}

function whyText(flight: FlightResult, lang: "fr" | "en"): string {
  const fr = lang === "fr";
  const owned = flight.bestOwnedOption;
  const purchased = flight.bestPurchasedOption;
  const cash = flight.cashTotal;

  if (flight.recommendation === "MILES_WIN") {
    if (!purchased) return fr ? `Miles recommandés pour ce vol.` : `Miles recommended for this flight.`;
    const save = (cash - purchased.purchasedCost).toFixed(0);
    const miles = formatMiles(purchased.milesRequired);
    return fr
      ? `Acheter ${miles} miles ${purchased.program} coûte ~$${purchased.purchasedCost.toFixed(0)} vs $${cash.toFixed(0)} cash. Économie : $${save}.`
      : `Buying ${miles} ${purchased.program} miles costs ~$${purchased.purchasedCost.toFixed(0)} vs $${cash.toFixed(0)} cash. Save $${save}.`;
  }
  if (flight.recommendation === "MILES_IF_OWNED") {
    if (!owned) return fr ? `Si tu as des miles, utilise-les pour ce vol.` : `Use your miles for this flight if you have them.`;
    const save = (cash - owned.ownedCost).toFixed(0);
    const miles = formatMiles(owned.milesRequired);
    return fr
      ? `Si tu as déjà ${miles} miles ${owned.program}, tu paies juste les taxes (~$${owned.ownedCost.toFixed(0)}). Économie : $${save}.`
      : `If you already have ${miles} ${owned.program} miles, you pay only taxes (~$${owned.ownedCost.toFixed(0)}). Save $${save}.`;
  }
  // CASH_WINS
  if (purchased) {
    const diff = (purchased.purchasedCost - cash).toFixed(0);
    return fr
      ? `Le cash ($${cash.toFixed(0)}) est moins cher que d'acheter des miles ($${purchased.purchasedCost.toFixed(0)}, soit $${diff} de plus). Garde tes miles.`
      : `Cash ($${cash.toFixed(0)}) beats buying miles ($${purchased.purchasedCost.toFixed(0)}, $${diff} more). Save your miles.`;
  }
  return fr
    ? `Aucune option miles disponible pour ce vol. Payez en cash.`
    : `No miles option found for this flight. Pay with cash.`;
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
  const rec = REC[flight.recommendation as keyof typeof REC] ?? REC["CASH_WINS"];
  const label = fr ? rec.labelFr : rec.labelEn;

  const total    = flight.totalPrice ?? 0;
  const value    = flight.value ?? 0;
  const savings  = flight.savings;
  const stops    = flight.stops ?? 0;

  const bestOption = flight.bestOwnedOption ?? flight.bestPurchasedOption;
  const milesRequired = bestOption?.milesRequired ?? 0;

  // Value bar — blue for MILES_WIN, dimmer for lower values (green reserved for savings)
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
          {milesRequired > 0 ? (
            <>
              <div className="text-2xl font-black leading-none tabular-nums text-fg">
                {milesRequired >= 1000 ? `${(milesRequired / 1000).toFixed(0)}K` : milesRequired}
              </div>
              <div className="text-[10px] text-muted uppercase tracking-widest mt-1.5 font-bold">
                {fr ? "pts requis" : "pts needed"}
              </div>
              {bestOption && (
                <div className="text-[9px] text-muted/60 mt-0.5">{bestOption.program}</div>
              )}
            </>
          ) : (
            <>
              <div className="text-2xl font-black leading-none text-subtle">—</div>
              <div className="text-[10px] text-muted uppercase tracking-widest mt-1.5 font-bold">
                {fr ? "pts requis" : "pts needed"}
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
