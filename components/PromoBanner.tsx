"use client";

import { useEffect, useState } from "react";

interface Promo {
  airline: string;
  discount: number;
  validUntil?: string;
  routes?: string[];
}

const AIRLINE_COLORS: Record<string, { bg: string; text: string }> = {
  "Air France":         { bg: "rgba(0,90,170,0.15)",   text: "#4DA6FF" },
  "Air Sénégal":        { bg: "rgba(0,160,80,0.15)",   text: "#4CD97B" },
  "Turkish Airlines":   { bg: "rgba(220,50,50,0.15)",  text: "#FF7070" },
  "Royal Air Maroc":    { bg: "rgba(200,0,0,0.15)",    text: "#FF6B6B" },
  "Emirates":           { bg: "rgba(200,0,0,0.12)",    text: "#FF8080" },
  "Ethiopian Airlines": { bg: "rgba(0,150,80,0.15)",   text: "#4CD9A0" },
  "Kenya Airways":      { bg: "rgba(180,20,20,0.15)",  text: "#FF7777" },
  "Qatar Airways":      { bg: "rgba(100,0,0,0.15)",    text: "#FF9999" },
};

function formatExpiry(dateStr: string, lang: "fr" | "en"): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "short" });
  } catch { return dateStr; }
}

interface Props { lang: "fr" | "en" }

export function PromoBanner({ lang }: Props) {
  const [promos, setPromos] = useState<Promo[]>([]);

  useEffect(() => {
    fetch("/api/promos")
      .then((r) => r.json())
      .then((d: { promos: Promo[] }) => setPromos(d.promos ?? []))
      .catch(() => {});
  }, []);

  if (promos.length === 0) return null;

  return (
    <div className="relative">
      {/* Label */}
      <div className="flex items-center gap-2 mb-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse flex-shrink-0" />
        <span className="text-[10px] font-bold tracking-[2px] uppercase text-muted">
          {lang === "fr" ? "Promos actives" : "Live promos"}
        </span>
      </div>

      {/* Scrolling cards */}
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
        {promos.map((p, i) => {
          const colors = AIRLINE_COLORS[p.airline] ?? { bg: "rgba(14,165,233,0.12)", text: "#38BDF8" };
          return (
            <div
              key={i}
              className="flex-shrink-0 rounded-xl px-3.5 py-2.5 border border-white/5 flex items-center gap-2.5"
              style={{ background: colors.bg }}
            >
              {/* Discount pill */}
              <span
                className="text-[11px] font-black rounded-lg px-2 py-0.5"
                style={{ color: colors.text, background: "rgba(255,255,255,0.06)" }}
              >
                -{Math.round(p.discount * 100)}%
              </span>
              <div>
                <p className="text-xs font-bold text-white leading-none">{p.airline}</p>
                {p.validUntil && (
                  <p className="text-[10px] text-muted mt-0.5">
                    {lang === "fr" ? "jusqu'au" : "until"} {formatExpiry(p.validUntil, lang)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
