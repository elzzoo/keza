import type { FlightResult } from "@/lib/engine";
import type { OptimizerDecision } from "@/lib/optimizer";
import { airportsMap } from "@/data/airports";
import clsx from "clsx";

interface Props { flight: FlightResult; lang?: "fr" | "en" }

// ── Constants ───────────────────────────────────────
const FCFA = 600; // 1 USD ≈ 600 XOF
function fcfa(usd: number) { return Math.round(usd * FCFA).toLocaleString("fr-FR"); }
function approxMiles(total: number, value: number) {
  if (value <= 0) return 0;
  return Math.round((total * 80) / value / 1000) * 1000;
}
function city(code: string, lang: "fr" | "en") {
  const a = airportsMap[code];
  if (!a) return code;
  return lang === "fr" ? a.city : a.cityEn;
}
function flag(code: string) { return airportsMap[code]?.flag ?? ""; }

// ── Recommendation config ────────────────────────────
const REC: Record<FlightResult["recommendation"], {
  band: string; text: string; labelFr: string; labelEn: string; icon: string;
}> = {
  "USE MILES": {
    band:    "bg-miles-band",
    text:    "#93C5FD",
    labelFr: "UTILISER LES MILES",
    labelEn: "USE MILES",
    icon:    "✈",
  },
  "CONSIDER": {
    band:    "bg-consider-band",
    text:    "#6EE7B7",
    labelFr: "À CONSIDÉRER",
    labelEn: "CONSIDER",
    icon:    "◎",
  },
  "USE CASH": {
    band:    "bg-cash-band",
    text:    "#FCD34D",
    labelFr: "PAYER EN CASH",
    labelEn: "USE CASH",
    icon:    "◈",
  },
};

const CABIN: Record<string, { fr: string; en: string }> = {
  economy:  { fr: "Éco",      en: "Economy"  },
  business: { fr: "Business", en: "Business" },
  first:    { fr: "1ʳᵉ Cl.",  en: "First"    },
};

// ── Optimizer badge ──────────────────────────────────
function OptBadge({ opt, lang }: { opt: OptimizerDecision; lang: "fr" | "en" }) {
  const base = "inline-flex items-center gap-1.5 text-[11px] font-semibold border rounded-full px-2.5 py-1";
  if (opt.type === "DIRECT")
    return <span className={clsx(base, "bg-success/8 text-success border-success/20")}>
      <span className="w-1.5 h-1.5 rounded-full bg-success" />
      Direct — {opt.program}
    </span>;
  if (opt.type === "ALLIANCE")
    return <span className={clsx(base, "bg-accent/8 text-accent-light border-accent/20")}>
      ◆ {opt.alliance} · {opt.viaProgram}
    </span>;
  if (opt.type === "TRANSFER")
    return <span className={clsx(base, "bg-gold/8 text-gold border-gold/20")}>
      ⇄ {opt.from} → {opt.to}
    </span>;
  return <span className={clsx(base, "text-muted border-border")}>
    {lang === "fr" ? "Payer cash" : "Pay cash"}
  </span>;
}

// ── Main component ───────────────────────────────────
export function FlightCard({ flight, lang = "en" }: Props) {
  const rec        = REC[flight.recommendation] ?? REC["USE CASH"];
  const isRound    = flight.tripType === "roundtrip";
  const total      = flight.totalPrice ?? flight.price;
  const miles      = approxMiles(total, flight.value);
  const milesK     = miles > 0 ? `~${(miles / 1000).toFixed(0)}K` : "—";
  const meterW     = Math.min(100, Math.round((flight.value / 3) * 100));
  const cabin      = CABIN[flight.cabin] ?? CABIN.economy;
  const isMilesGood = flight.recommendation !== "USE CASH";

  return (
    <article
      className={clsx(
        "rounded-2xl overflow-hidden shadow-card card-lift",
        "border border-white/[0.06] bg-card",
        "animate-slide-up"
      )}
    >
      {/* ── Recommendation banner ─────────────────── */}
      <div className={clsx("px-5 py-3 flex items-center justify-between", rec.band)}>
        <div className="flex items-center gap-2.5">
          <span className="text-base leading-none" aria-hidden="true">{rec.icon}</span>
          <span
            className="text-xs font-black tracking-[2.5px] uppercase"
            style={{ color: rec.text }}
          >
            {lang === "fr" ? rec.labelFr : rec.labelEn}
          </span>
        </div>
        <span
          className="font-mono text-xs font-bold tabular-nums"
          style={{ color: rec.text }}
        >
          {flight.value.toFixed(2)} cts/mile
        </span>
      </div>

      {/* ── Route ────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-3">
          {/* Origin */}
          <div className="flex-shrink-0">
            <div className="text-[40px] font-black text-fg tracking-tight leading-none">
              {flight.from}
            </div>
            <div className="text-xs text-muted-2 mt-1 flex items-center gap-1">
              <span>{flag(flight.from)}</span>
              <span>{city(flight.from, lang)}</span>
            </div>
          </div>

          {/* Path */}
          <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <div className="flex items-center w-full gap-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-muted text-sm flex-shrink-0" aria-hidden="true">✈</span>
              <div className="flex-1 h-px bg-border" />
              {isRound && <>
                <span className="text-muted text-sm flex-shrink-0" aria-hidden="true">✈</span>
                <div className="flex-1 h-px bg-border" />
              </>}
            </div>
            {/* Route tags */}
            <div className="flex flex-wrap justify-center gap-1">
              {isRound && (
                <span className="text-[9px] font-bold bg-accent/10 text-accent-light border border-accent/20 rounded px-1.5 py-0.5">
                  {lang === "fr" ? "A/R" : "RT"}
                </span>
              )}
              {flight.stops !== undefined && (
                <span className="text-[10px] text-muted-2">
                  {flight.stops === 0
                    ? (lang === "fr" ? "Direct" : "Direct")
                    : `${flight.stops} ${lang === "fr" ? "esc." : "stop"}`}
                </span>
              )}
              <span className="text-[10px] text-muted-2">
                {lang === "fr" ? cabin.fr : cabin.en}
              </span>
              <span className="text-[10px] text-muted-2">
                {flight.passengers} {lang === "fr" ? "pax" : "pax"}
              </span>
            </div>
          </div>

          {/* Destination */}
          <div className="flex-shrink-0 text-right">
            <div className="text-[40px] font-black text-fg tracking-tight leading-none">
              {flight.to}
            </div>
            <div className="text-xs text-muted-2 mt-1 flex items-center justify-end gap-1">
              <span>{city(flight.to, lang)}</span>
              <span>{flag(flight.to)}</span>
            </div>
          </div>
        </div>

        {/* Airlines */}
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          {flight.airlines.map((a) => (
            <span key={a} className="text-xs text-muted-2 bg-surface border border-border/80 rounded-md px-2 py-0.5">
              {a}
            </span>
          ))}
          {isRound && flight.returnAirlines && flight.returnAirlines.length > 0 &&
            flight.returnAirlines.filter(a => !flight.airlines.includes(a)).map((a) => (
              <span key={`ret-${a}`} className="text-xs text-muted bg-surface border border-border/50 rounded-md px-2 py-0.5 opacity-70">
                {a}
              </span>
            ))
          }
        </div>
      </div>

      {/* ── Boarding pass tear line ───────────────── */}
      <div className="tear-line mx-5 my-1" />

      {/* ── Price comparison ─────────────────────── */}
      <div className="px-5 py-4 grid grid-cols-2 gap-3">
        {/* Cash */}
        <div className={clsx(
          "rounded-xl p-3 border transition-opacity",
          !isMilesGood ? "border-gold/20 bg-gold/5" : "border-border bg-surface/50"
        )}>
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">
            {lang === "fr" ? "💳 Payer cash" : "💳 Pay cash"}
          </p>
          <p className="text-[28px] font-black text-fg leading-none font-mono tabular-nums">
            ${total.toFixed(0)}
          </p>
          <p className="text-[11px] text-muted/60 mt-1 font-mono">
            ~{fcfa(total)}&thinsp;FCFA
          </p>
          {isRound && flight.returnPrice !== undefined && (
            <p className="text-[10px] text-muted/40 mt-1">
              ${flight.price.toFixed(0)} + ${flight.returnPrice.toFixed(0)}
              {flight.passengers > 1 ? ` × ${flight.passengers}` : ""}
            </p>
          )}
        </div>

        {/* Miles */}
        <div className={clsx(
          "rounded-xl p-3 border transition-opacity",
          isMilesGood ? "border-accent/25 bg-accent/5" : "border-border bg-surface/50 opacity-50"
        )}>
          <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">
            {lang === "fr" ? "✈️ Utiliser miles" : "✈️ Use miles"}
          </p>
          <p
            className="text-[28px] font-black leading-none font-mono tabular-nums"
            style={{ color: isMilesGood ? rec.text : "#64748B" }}
          >
            {milesK}
          </p>
          <p className="text-[11px] text-muted/60 mt-1">
            {lang === "fr" ? "pts estimés" : "est. points"}
          </p>
          {flight.savings !== undefined && flight.savings > 0 && (
            <p className="text-[10px] font-bold text-success mt-1">
              {lang === "fr" ? `Éco. $${flight.savings.toFixed(0)}` : `Save $${flight.savings.toFixed(0)}`}
            </p>
          )}
        </div>
      </div>

      {/* ── Value meter ──────────────────────────── */}
      <div className="px-5 pb-4 space-y-3">
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-muted">{lang === "fr" ? "Valeur miles" : "Miles value"}</span>
            <span className="font-mono font-semibold" style={{ color: rec.text }}>
              {flight.value.toFixed(2)} cts/mile
            </span>
          </div>
          <div className="h-1 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${meterW}%`, backgroundColor: rec.text }}
            />
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <OptBadge opt={flight.optimization} lang={lang} />
          {flight.savings !== undefined && flight.savings >= 10 && (
            <span className="text-xs font-bold text-success bg-success/8 border border-success/20 rounded-full px-2.5 py-1">
              +${flight.savings.toFixed(0)} {lang === "fr" ? "d'économie" : "saved"}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
