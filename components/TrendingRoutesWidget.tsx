"use client";

import { useEffect, useState } from "react";

interface TrendingRoute {
  from: string;
  to: string;
  fromCity: string;
  fromCityEn: string;
  toCity: string;
  toCityEn: string;
  fromFlag: string;
  toFlag: string;
  count: number;
}

interface Props {
  lang: "fr" | "en";
}

function TrendIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path d="M4 16.5 9.5 11l3.5 3.5L20 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 7.5h5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TrendingRoutesWidget({ lang }: Props) {
  const [routes, setRoutes] = useState<TrendingRoute[]>([]);
  const fr = lang === "fr";

  useEffect(() => {
    fetch("/api/trending")
      .then(r => r.ok ? r.json() : null)
      .then((d: { routes?: TrendingRoute[] } | null) => {
        if (d?.routes?.length) setRoutes(d.routes);
      })
      .catch(() => {});
  }, []);

  if (routes.length < 2) return null;

  return (
    <section className="px-4 py-3">
      <p className="mb-2.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-muted uppercase tracking-wider">
        <TrendIcon />
        {fr ? "Routes populaires en ce moment" : "Trending routes right now"}
      </p>
      <div className="flex gap-2 flex-wrap">
        {routes.map((r) => {
          const params = new URLSearchParams({ from: r.from, to: r.to });
          const cityFrom = fr ? r.fromCity : r.fromCityEn;
          const cityTo   = fr ? r.toCity   : r.toCityEn;
          return (
            <a
              key={`${r.from}-${r.to}`}
              href={`/?${params}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border hover:border-primary/40 rounded-xl text-xs text-fg hover:text-primary transition-all"
            >
              <span>{r.fromFlag}</span>
              <span className="font-semibold">{cityFrom}</span>
              <span className="text-subtle">→</span>
              <span>{r.toFlag}</span>
              <span className="font-semibold">{cityTo}</span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
