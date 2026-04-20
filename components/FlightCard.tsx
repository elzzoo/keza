"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import type { FlightResult } from "@/lib/engine";
import { AIRPORTS as airportsMap } from "@/data/airports";

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatMiles(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);
}

// Dynamic forex rate — fetched once, cached globally
let cachedFcfaRate: number | null = null;
let fetchingForex = false;

function useForexRate(): number {
  const [rate, setRate] = useState(cachedFcfaRate ?? 605);

  useEffect(() => {
    if (cachedFcfaRate !== null) { setRate(cachedFcfaRate); return; }
    if (fetchingForex) return;
    fetchingForex = true;
    fetch("/api/forex")
      .then(r => r.json())
      .then((data: { usdToXof?: number }) => {
        if (data.usdToXof && data.usdToXof > 400 && data.usdToXof < 800) {
          cachedFcfaRate = data.usdToXof;
          setRate(data.usdToXof);
        }
      })
      .catch(() => {})
      .finally(() => { fetchingForex = false; });
  }, []);

  return rate;
}

function fcfa(usd: number, rate: number) { return Math.round(usd * rate).toLocaleString("fr-FR"); }

function city(code: string, lang: "fr" | "en") {
  const a = airportsMap.find(x => x.code === code);
  return a ? (lang === "fr" ? a.city : a.cityEn) : code;
}

// Type labels
const TYPE_LABEL = {
  fr: { DIRECT: "Direct", ALLIANCE: "Alliance", TRANSFER: "Transfert" },
  en: { DIRECT: "Direct", ALLIANCE: "Alliance", TRANSFER: "Transfer" },
} as const;

interface Props {
  flight: FlightResult;
  lang: "fr" | "en";
}

export function FlightCard({ flight, lang }: Props) {
  const fr = lang === "fr";
  const forexRate = useForexRate();

  const cashCost   = flight.cashCost;
  const milesCost  = flight.milesCost;
  const savings    = flight.savings;
  const stops      = flight.stops ?? 0;
  const bestOption = flight.bestOption;
  const isUseMiles = flight.recommendation === "USE_MILES";

  // Airlines deduped
  const airlines = [...flight.airlines, ...(flight.returnAirlines ?? [])]
    .filter((a, i, arr) => arr.indexOf(a) === i)
    .filter(Boolean);

  return (
    <div className={clsx(
      "bg-surface rounded-2xl border overflow-hidden",
      "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover",
      isUseMiles ? "border-blue-500/30" : "border-border"
    )}>

      {/* ═══════════════════════════════════════════════════════════════════════
          DECISION BANNER — visible in < 2 seconds
          ════════════════════════════════════════════════════════════��══════════ */}
      <div className={clsx(
        "px-5 py-4 text-center",
        isUseMiles ? "bg-blue-500/10" : "bg-surface"
      )}>
        {isUseMiles ? (
          <div className="text-lg font-black text-blue-400">
            {fr ? `Économisez $${savings.toFixed(0)} avec les miles` : `Save $${savings.toFixed(0)} with miles`}
          </div>
        ) : savings > 0 ? (
          <div className="text-lg font-black text-warning">
            {fr ? `Miles coûtent $${savings.toFixed(0)} de plus` : `Miles cost $${savings.toFixed(0)} more`}
          </div>
        ) : (
          <div className="text-lg font-black text-muted">
            {fr ? "Pas d'option miles disponible" : "No miles option available"}
          </div>
        )}
        <div className="text-[11px] text-muted mt-1">
          {city(flight.from, lang)} → {city(flight.to, lang)}
          {" · "}
          {stops === 0 ? "Direct" : `${stops} ${fr ? "escale" : "stop"}${stops > 1 ? "s" : ""}`}
          {flight.tripType === "roundtrip" && (fr ? " · A/R" : " · Round trip")}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          COST COMPARISON — side by side
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
        {/* Cash */}
        <div className="px-4 py-3.5 text-center">
          <div className={clsx(
            "text-2xl font-black tabular-nums",
            !isUseMiles ? "text-success" : "text-fg"
          )}>
            ${cashCost.toFixed(0)}
          </div>
          <div className="text-[10px] text-muted uppercase tracking-widest mt-1 font-bold">
            Cash
          </div>
          <div className="text-[9px] text-muted/50 mt-0.5">
            ~{fcfa(cashCost, forexRate)} FCFA
          </div>
        </div>

        {/* Miles */}
        <div className="px-4 py-3.5 text-center">
          {milesCost > 0 ? (
            <>
              <div className={clsx(
                "text-2xl font-black tabular-nums",
                isUseMiles ? "text-success" : "text-fg"
              )}>
                ${milesCost.toFixed(0)}
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

      {/* ═══════════════════════════════════════════════════════════════════════
          WHY SECTION — always shows best program + type + reason
          ═══════════════════════════════════════════════════════════════════════ */}
      {bestOption && (
        <div className="px-5 py-3.5 border-t border-border space-y-2">
          <div className="flex items-center gap-2">
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
            {formatMiles(bestOption.milesRequired)} miles × {bestOption.valuePerMile.toFixed(1)}¢/mile + ${bestOption.taxes.toFixed(0)} taxes = <span className="font-bold text-fg">${milesCost.toFixed(0)}</span>
            {bestOption.confidence !== "HIGH" && (
              <span className="ml-1 text-[9px] italic text-muted/60">({fr ? "estimé" : "est."})</span>
            )}
          </div>
        </div>
      )}

      {/* ── Airlines + stops ──────────────────────────────────────── */}
      {airlines.length > 0 && (
        <div className="px-5 py-2 flex flex-wrap gap-1.5 border-t border-border">
          {airlines.map(a => (
            <span key={a} className="text-[10px] text-muted bg-surface-2 border border-border px-2 py-0.5 rounded-md font-medium">
              {a}
            </span>
          ))}
        </div>
      )}

      {/* ── Booking CTA ──────────────────────────────────────────── */}
      {flight.bookingLink && (
        <a
          href={flight.bookingLink}
          target="_blank"
          rel="noopener noreferrer"
          className={clsx(
            "block px-5 py-3 text-center text-[12px] font-bold border-t border-border transition-colors uppercase tracking-widest",
            isUseMiles
              ? "text-blue-400 bg-blue-500/5 hover:bg-blue-500/10"
              : "text-warning bg-warning/5 hover:bg-warning/10"
          )}
        >
          {fr ? "Réserver ce vol →" : "Book this flight →"}
        </a>
      )}
    </div>
  );
}
