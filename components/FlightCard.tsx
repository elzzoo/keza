import type { FlightResult } from "@/lib/engine";
import type { OptimizerDecision } from "@/lib/optimizer";
import clsx from "clsx";

interface FlightCardProps {
  flight: FlightResult;
  lang?: "fr" | "en";
}

// 1 USD ≈ 600 FCFA (XOF) — approximation for display
const FCFA_RATE = 600;
function toFcfa(usd: number): string {
  return Math.round(usd * FCFA_RATE).toLocaleString("fr-FR");
}

// Approximate miles needed, derived from engine formula:
// value (c/mile) = totalPrice * 0.8 * 100 / milesRequired
// → milesRequired ≈ totalPrice * 80 / value
function approxMiles(totalPrice: number, value: number): number {
  if (value <= 0) return 0;
  return Math.round((totalPrice * 80) / value / 1000) * 1000;
}

const REC_CONFIG: Record<
  FlightResult["recommendation"],
  { labelEn: string; labelFr: string; border: string; badge: string; badgeDot: string; bar: string; color: string; milesHighlight: boolean }
> = {
  "USE MILES": {
    labelEn: "USE MILES",   labelFr: "UTILISER MILES",
    border:  "border-l-accent",
    badge:   "bg-accent/10 text-accent border-accent/25",
    badgeDot:"bg-accent",
    bar:     "#0EA5E9",     color: "#0EA5E9",
    milesHighlight: true,
  },
  "CONSIDER": {
    labelEn: "CONSIDER",    labelFr: "À CONSIDÉRER",
    border:  "border-l-success",
    badge:   "bg-success/10 text-success border-success/25",
    badgeDot:"bg-success",
    bar:     "#10B981",     color: "#10B981",
    milesHighlight: true,
  },
  "USE CASH": {
    labelEn: "USE CASH",    labelFr: "PAYER EN CASH",
    border:  "border-l-warn",
    badge:   "bg-warn/10 text-warn border-warn/25",
    badgeDot:"bg-warn",
    bar:     "#F59E0B",     color: "#F59E0B",
    milesHighlight: false,
  },
};

const CABIN_LABEL: Record<string, { fr: string; en: string }> = {
  economy:  { fr: "Éco",        en: "Economy"  },
  business: { fr: "Business",   en: "Business" },
  first:    { fr: "1ère Cl.",   en: "First"    },
};

function OptimizerBadge({ opt, lang }: { opt: OptimizerDecision; lang: "fr" | "en" }) {
  if (opt.type === "DIRECT") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs bg-success/8 text-success border border-success/20 rounded-full px-2.5 py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />
        {lang === "fr" ? "Direct" : "Direct"} — {opt.program}
      </span>
    );
  }
  if (opt.type === "ALLIANCE") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs bg-accent/8 text-accent border border-accent/20 rounded-full px-2.5 py-1">
        <span className="text-accent/80">◆</span>
        {opt.alliance} · {opt.viaProgram}
      </span>
    );
  }
  if (opt.type === "TRANSFER") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs bg-warn/8 text-warn border border-warn/20 rounded-full px-2.5 py-1">
        <span>⇄</span>
        {opt.from} → {opt.to}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs bg-muted/8 text-muted border border-border rounded-full px-2.5 py-1">
      {lang === "fr" ? "Payer cash" : "Pay cash"}
    </span>
  );
}

export function FlightCard({ flight, lang = "en" }: FlightCardProps) {
  const cfg         = REC_CONFIG[flight.recommendation] ?? REC_CONFIG["USE CASH"];
  const isRound     = flight.tripType === "roundtrip";
  const cabinLabel  = CABIN_LABEL[flight.cabin] ?? CABIN_LABEL["economy"];
  const totalPrice  = flight.totalPrice ?? flight.price;
  const milesEst    = approxMiles(totalPrice, flight.value);
  const meterWidth  = Math.min(100, Math.round((flight.value / 3) * 100));

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-2xl border border-border border-l-[3px]",
        "bg-card hover:bg-card-hover hover:border-border-light",
        "transition-all duration-200 hover:shadow-card-hover animate-slide-up",
        cfg.border
      )}
    >
      {/* ── Top section ────────────────────────────── */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {/* Route */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl font-black text-white tracking-tight">{flight.from}</span>
              <span className="text-muted-2 text-base" aria-hidden="true">
                {isRound ? "⇄" : "→"}
              </span>
              <span className="text-xl font-black text-white tracking-tight">{flight.to}</span>
              {isRound && (
                <span className="text-[10px] bg-accent/10 text-accent border border-accent/20 rounded-full px-2 py-0.5 font-bold tracking-wide">
                  A/R
                </span>
              )}
            </div>

            {/* Meta tags */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {flight.airlines.map((a) => (
                <span key={a} className="text-xs text-muted bg-surface-2 border border-border rounded-md px-1.5 py-0.5">
                  {a}
                </span>
              ))}
              {flight.stops !== undefined && (
                <span className="text-xs text-muted-2">
                  {flight.stops === 0
                    ? "Direct"
                    : `${flight.stops} ${lang === "fr" ? "escale" : "stop"}${flight.stops > 1 ? "s" : ""}`}
                </span>
              )}
              <span className="text-xs text-muted bg-surface-2 border border-border rounded-md px-1.5 py-0.5">
                {lang === "fr" ? cabinLabel.fr : cabinLabel.en}
              </span>
              <span className="text-xs text-muted-2">
                {flight.passengers} {lang === "fr"
                  ? `pax`
                  : `pax`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cash vs Miles comparison ─────────────── */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-2">
        {/* Cash */}
        <div className={clsx(
          "rounded-xl p-3 border",
          cfg.milesHighlight ? "bg-surface-2 border-border" : "bg-accent/5 border-accent/20"
        )}>
          <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">
            💳 {lang === "fr" ? "Payer cash" : "Pay cash"}
          </p>
          <p className="text-2xl font-black text-white leading-none">
            ${totalPrice.toFixed(0)}
          </p>
          <p className="text-[11px] text-muted/60 mt-1 font-mono">
            ~{toFcfa(totalPrice)} FCFA
          </p>
          {isRound && flight.returnPrice !== undefined && (
            <p className="text-[10px] text-muted/50 mt-1">
              ${flight.price.toFixed(0)} + ${flight.returnPrice.toFixed(0)}
              {flight.passengers > 1 ? ` × ${flight.passengers}` : ""}
            </p>
          )}
        </div>

        {/* Miles */}
        <div className={clsx(
          "rounded-xl p-3 border",
          cfg.milesHighlight ? "border-accent/20" : "bg-surface-2 border-border",
          cfg.milesHighlight ? "bg-accent/5" : ""
        )}>
          <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">
            ✈️ {lang === "fr" ? "Utiliser miles" : "Use miles"}
          </p>
          {milesEst > 0 ? (
            <>
              <p className="text-2xl font-black text-white leading-none">
                ~{milesEst.toLocaleString()}
              </p>
              <p className="text-[11px] font-mono mt-1" style={{ color: cfg.color }}>
                {flight.value.toFixed(2)} cts/mile
              </p>
            </>
          ) : (
            <p className="text-sm text-muted italic mt-1">—</p>
          )}
          {flight.savings !== undefined && flight.savings > 0 && (
            <p className="text-[10px] text-success mt-1 font-medium">
              {lang === "fr" ? `Éco. $${flight.savings.toFixed(0)}` : `Save $${flight.savings.toFixed(0)}`}
            </p>
          )}
        </div>
      </div>

      {/* ── Return leg airlines ──────────────────── */}
      {isRound && flight.returnAirlines && flight.returnAirlines.length > 0 && (
        <div className="px-4 pb-2 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted uppercase tracking-wide font-bold">
            {lang === "fr" ? "Retour" : "Return"}
          </span>
          {flight.returnAirlines.map((a) => (
            <span key={a} className="text-xs text-muted bg-surface-2 border border-border rounded-md px-1.5 py-0.5">
              {a}
            </span>
          ))}
        </div>
      )}

      {/* ── Value meter ──────────────────────────── */}
      <div className="px-4 pb-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">{lang === "fr" ? "Valeur miles" : "Miles value"}</span>
          <span className="font-mono font-semibold" style={{ color: cfg.color }}>
            {flight.value.toFixed(2)} cts/mile
          </span>
        </div>
        <div className="h-1 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${meterWidth}%`, backgroundColor: cfg.bar }}
          />
        </div>
      </div>

      {/* ── Decision row ─────────────────────────── */}
      <div className="px-4 pb-4 flex items-center justify-between flex-wrap gap-2">
        <OptimizerBadge opt={flight.optimization} lang={lang} />
        <span className={clsx(
          "inline-flex items-center gap-1.5 text-[11px] font-bold border rounded-full px-3 py-1 tracking-wider",
          cfg.badge
        )}>
          <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.badgeDot)} />
          {lang === "fr" ? cfg.labelFr : cfg.labelEn}
        </span>
      </div>

      {/* ── Savings banner (when significant) ────── */}
      {flight.savings !== undefined && flight.savings >= 10 && (
        <div className="mx-4 mb-4 flex items-center gap-2 bg-success/6 border border-success/20 rounded-xl px-3 py-2.5 text-xs">
          <span>💰</span>
          <span className="text-muted flex-1">
            {lang === "fr" ? "Économies estimées avec miles" : "Estimated savings with miles"}
          </span>
          <span className="font-mono font-bold text-success">+${flight.savings.toFixed(0)}</span>
        </div>
      )}
    </div>
  );
}
