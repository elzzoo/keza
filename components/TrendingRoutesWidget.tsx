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
      <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2.5">
        {fr ? "🔥 Routes populaires en ce moment" : "🔥 Trending routes right now"}
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
