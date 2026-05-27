"use client";

import { useEffect, useState } from "react";

interface Props {
  from: string;
  to: string;
  lang: "fr" | "en";
}

type Trend = "up" | "down" | "stable" | "unknown";

export function PriceTrendBadge({ from, to, lang }: Props) {
  const [trend, setTrend] = useState<Trend>("unknown");
  const [pct,   setPct]   = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/price-history?from=${from}&to=${to}&days=14`)
      .then(r => r.ok ? r.json() : null)
      .then((data: { history?: { price: number }[]; trend?: Trend } | null) => {
        if (cancelled || !data?.history || data.history.length < 4) return;
        const h = data.history;
        const latest = h[h.length - 1]!.price;
        const weekAgo = h[Math.max(0, h.length - 8)]!.price;
        const delta = ((latest - weekAgo) / weekAgo) * 100;
        if (!cancelled) {
          setTrend(data.trend ?? "unknown");
          setPct(Math.abs(Math.round(delta)));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [from, to]);

  if (trend === "unknown") return null;

  const fr = lang === "fr";

  if (trend === "down") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
      ▼ {pct > 0 ? `−${pct}% ` : ""}{fr ? "en baisse" : "dropping"}
    </span>
  );
  if (trend === "up") return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 border border-red-400/20">
      ▲ {pct > 0 ? `+${pct}% ` : ""}{fr ? "en hausse" : "rising"}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-2 text-muted border border-border">
      — {fr ? "stable" : "stable"}
    </span>
  );
}
