"use client";

import { useEffect, useState } from "react";

interface PricePoint {
  date: string;
  price: number;
}

type Trend = "up" | "down" | "stable" | "unknown";

interface Props {
  from: string;
  to: string;
  lang?: "fr" | "en";
}

function Sparkline({ points }: { points: PricePoint[] }) {
  if (points.length < 2) return null;

  const prices = points.map(p => p.price);
  const min    = Math.min(...prices);
  const max    = Math.max(...prices);
  const range  = max - min || 1;

  const W = 240;
  const H = 60;
  const pad = 4;

  const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (W - pad * 2));
  const ys = points.map(p => H - pad - ((p.price - min) / range) * (H - pad * 2));

  // Polyline path
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i]!.toFixed(1)}`).join(" ");

  // Fill path (closed to bottom)
  const fill = [
    `M${xs[0]!.toFixed(1)},${H}`,
    ...xs.map((x, i) => `L${x.toFixed(1)},${ys[i]!.toFixed(1)}`),
    `L${xs[xs.length - 1]!.toFixed(1)},${H}`,
    "Z",
  ].join(" ");

  // Last point dot
  const lastX = xs[xs.length - 1]!;
  const lastY = ys[ys.length - 1]!;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      fill="none"
      className="w-full h-auto"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(59,130,246)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="rgb(59,130,246)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Fill */}
      <path d={fill} fill="url(#sparkGrad)" />
      {/* Line */}
      <path d={path} stroke="rgb(59,130,246)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last dot */}
      <circle cx={lastX} cy={lastY} r="3" fill="rgb(59,130,246)" />
    </svg>
  );
}

function TrendBadge({ trend, lang }: { trend: Trend; lang: "fr" | "en" }) {
  const fr = lang === "fr";
  if (trend === "up")     return <span className="text-[10px] font-bold text-red-400  bg-red-400/10  border border-red-400/20  px-2 py-0.5 rounded-full">▲ {fr ? "Hausse" : "Rising"}</span>;
  if (trend === "down")   return <span className="text-[10px] font-bold text-success  bg-success/10  border border-success/20  px-2 py-0.5 rounded-full">▼ {fr ? "Baisse" : "Dropping"}</span>;
  if (trend === "stable") return <span className="text-[10px] font-bold text-muted    bg-surface-2   border border-border      px-2 py-0.5 rounded-full">— {fr ? "Stable" : "Stable"}</span>;
  return null;
}

function formatDate(date: string, lang: "fr" | "en"): string {
  return new Date(date + "T12:00:00Z").toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", {
    day: "numeric",
    month: "short",
  });
}

export function PriceSparkline({ from, to, lang = "fr" }: Props) {
  const [points, setPoints] = useState<PricePoint[]>([]);
  const [trend,  setTrend]  = useState<Trend>("unknown");
  const [status, setStatus] = useState<"loading" | "ok" | "empty">("loading");
  const fr = lang === "fr";

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/price-history?from=${from}&to=${to}&days=30`)
      .then(r => r.ok ? r.json() : null)
      .then((data: { history?: PricePoint[]; trend?: Trend } | null) => {
        if (cancelled) return;
        if (!data || !data.history || data.history.length < 3) {
          setStatus("empty");
          return;
        }
        setPoints(data.history);
        setTrend(data.trend ?? "unknown");
        setStatus("ok");
      })
      .catch(() => {
        if (!cancelled) setStatus("empty");
      });
    return () => { cancelled = true; };
  }, [from, to]);

  if (status === "empty") return null;

  const prices  = points.map(p => p.price);
  const minP    = prices.length ? Math.min(...prices) : 0;
  const maxP    = prices.length ? Math.max(...prices) : 0;
  const latest  = points.length ? points[points.length - 1]! : null;
  const oldest  = points.length ? points[0]! : null;

  return (
    <div className="bg-surface rounded-2xl border border-border p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-fg">
          {fr ? "Évolution du prix (30 jours)" : "Price trend (30 days)"}
        </h2>
        {status === "ok" && <TrendBadge trend={trend} lang={lang} />}
      </div>

      {status === "loading" ? (
        <div className="h-[60px] rounded-lg skeleton" />
      ) : (
        <>
          <Sparkline points={points} />

          {oldest && latest && (
            <div className="flex items-center justify-between text-xs text-muted">
              <span>{formatDate(oldest.date, lang)} — <strong className="text-fg">${oldest.price}</strong></span>
              <span>{formatDate(latest.date, lang)} — <strong className="text-fg">${latest.price}</strong></span>
            </div>
          )}

          <div className="flex gap-4 text-xs text-muted">
            <span>
              {fr ? "Min" : "Low"}: <strong className="text-success">${minP}</strong>
            </span>
            <span>
              {fr ? "Max" : "High"}: <strong className="text-red-400">${maxP}</strong>
            </span>
            <span className="ml-auto text-subtle">
              {fr ? `${points.length} jours de données` : `${points.length} days of data`}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
