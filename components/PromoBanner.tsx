"use client";

import { useEffect, useState } from "react";

interface Promo {
  airline: string;
  discount: number;
  validUntil?: string;
  routes?: string[];
}

const AIRLINE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Air France":         { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE" },
  "Air Sénégal":        { bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0" },
  "Turkish Airlines":   { bg: "#FFF7ED", text: "#EA580C", border: "#FED7AA" },
  "Royal Air Maroc":    { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA" },
  "Emirates":           { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA" },
  "Ethiopian Airlines": { bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0" },
  "Kenya Airways":      { bg: "#FEF2F2", text: "#B91C1C", border: "#FECACA" },
  "Qatar Airways":      { bg: "#F5F3FF", text: "#7C3AED", border: "#DDD6FE" },
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
          const colors = AIRLINE_COLORS[p.airline] ?? { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE" };
          return (
            <div
              key={i}
              className="flex-shrink-0 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 border"
              style={{ background: colors.bg, borderColor: colors.border }}
            >
              <span
                className="text-[11px] font-black rounded-lg px-2 py-0.5 border"
                style={{ color: colors.text, background: "white", borderColor: colors.border }}
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
