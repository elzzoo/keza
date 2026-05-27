"use client";

import { useEffect, useState } from "react";

interface Stats {
  searches_today: number;
  active_alerts:  number;
  total_saved_usd: number;
}

interface Props {
  lang: "fr" | "en";
}

export function SocialProofBar({ lang }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const fr = lang === "fr";

  useEffect(() => {
    fetch("/api/stats")
      .then(r => r.ok ? r.json() : null)
      .then((d: Stats | null) => { if (d) setStats(d); })
      .catch(() => {});
  }, []);

  // Don't show until we have data with at least some activity
  if (!stats || (stats.searches_today === 0 && stats.active_alerts === 0)) return null;

  const items: { icon: string; label: string }[] = [];

  if (stats.searches_today > 0) {
    items.push({
      icon: "🔍",
      label: fr
        ? `${stats.searches_today} recherche${stats.searches_today > 1 ? "s" : ""} aujourd'hui`
        : `${stats.searches_today} search${stats.searches_today > 1 ? "es" : ""} today`,
    });
  }
  if (stats.active_alerts > 0) {
    items.push({
      icon: "🔔",
      label: fr
        ? `${stats.active_alerts} route${stats.active_alerts > 1 ? "s" : ""} surveillée${stats.active_alerts > 1 ? "s" : ""}`
        : `${stats.active_alerts} route${stats.active_alerts > 1 ? "s" : ""} tracked`,
    });
  }
  if (stats.total_saved_usd > 500) {
    const saved = stats.total_saved_usd >= 1000
      ? `$${Math.round(stats.total_saved_usd / 1000)}k`
      : `$${stats.total_saved_usd}`;
    items.push({
      icon: "💰",
      label: fr ? `${saved} économisés` : `${saved} saved`,
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="flex items-center justify-center gap-4 flex-wrap py-2 px-4 text-[11px] text-muted">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span>{item.icon}</span>
          <span>{item.label}</span>
          {i < items.length - 1 && <span className="ml-2 text-border">·</span>}
        </span>
      ))}
    </div>
  );
}
