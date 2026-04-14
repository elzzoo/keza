"use client";

import { useEffect, useState } from "react";

interface Promo {
  airline: string;
  discount: number;
  validUntil?: string;
  routes?: string[];
}

const AIRLINE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Air France":         { bg: "#1e2d4f", text: "#60a5fa", border: "#2d4170" },
  "Air Sénégal":        { bg: "#1a3328", text: "#34d399", border: "#1e4035" },
  "Turkish Airlines":   { bg: "#2e2118", text: "#fb923c", border: "#3d2a1a" },
  "Royal Air Maroc":    { bg: "#2e1a1a", text: "#f87171", border: "#3d2020" },
  "Emirates":           { bg: "#2e1a1a", text: "#f87171", border: "#3d2020" },
  "Ethiopian Airlines": { bg: "#1a3328", text: "#34d399", border: "#1e4035" },
  "Kenya Airways":      { bg: "#2e1a1a", text: "#fca5a5", border: "#3d2020" },
  "Qatar Airways":      { bg: "#211a38", text: "#c084fc", border: "#2d1d4d" },
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
      .then(r => r.json())
      .then((d: { promos: Promo[] }) => setPromos(d.promos ?? []))
      .catch(() => {});
  }, []);

  if (promos.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse flex-shrink-0" />
        <span className="text-[10px] font-bold tracking-[2px] uppercase text-muted">
          {lang === "fr" ? "Promos actives" : "Live promos"}
        </span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1">
        {promos.map((p, i) => {
          const colors = AIRLINE_COLORS[p.airline] ?? { bg: "#1e2d4f", text: "#60a5fa", border: "#2d4170" };
          return (
            <div
              key={i}
              className="flex-shrink-0 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 border"
              style={{ background: colors.bg, borderColor: colors.border }}
            >
              <span
                className="text-[11px] font-black rounded-lg px-2 py-0.5 border"
                style={{ color: colors.text, background: "rgba(255,255,255,0.05)", borderColor: colors.border }}
              >
                -{Math.round(p.discount * 100)}%
              </span>
              <div>
                <p className="text-xs font-bold text-fg leading-none">{p.airline}</p>
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
