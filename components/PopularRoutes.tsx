"use client";

import Link from "next/link";
import type { GeoRoute } from "@/lib/geoRoutes";

interface Props {
  lang: "fr" | "en";
  onSelect: (from: string, to: string) => void;
  routes?: GeoRoute[];
  title?: string;
}

export function PopularRoutes({ lang, onSelect, routes, title }: Props) {
  const fr = lang === "fr";

  // Fallback routes if none provided
  const displayRoutes: GeoRoute[] = routes ?? [
    { from: "DSS", to: "CDG", fromFlag: "\u{1F1F8}\u{1F1F3}", toFlag: "\u{1F1EB}\u{1F1F7}", label: "Dakar → Paris", labelEn: "Dakar → Paris" },
    { from: "JFK", to: "LHR", fromFlag: "\u{1F1FA}\u{1F1F8}", toFlag: "\u{1F1EC}\u{1F1E7}", label: "New York → Londres", labelEn: "New York → London" },
    { from: "CDG", to: "NRT", fromFlag: "\u{1F1EB}\u{1F1F7}", toFlag: "\u{1F1EF}\u{1F1F5}", label: "Paris → Tokyo", labelEn: "Paris → Tokyo" },
    { from: "LOS", to: "LHR", fromFlag: "\u{1F1F3}\u{1F1EC}", toFlag: "\u{1F1EC}\u{1F1E7}", label: "Lagos → Londres", labelEn: "Lagos → London" },
    { from: "SIN", to: "SYD", fromFlag: "\u{1F1F8}\u{1F1EC}", toFlag: "\u{1F1E6}\u{1F1FA}", label: "Singapour → Sydney", labelEn: "Singapore → Sydney" },
    { from: "CMN", to: "JFK", fromFlag: "\u{1F1F2}\u{1F1E6}", toFlag: "\u{1F1FA}\u{1F1F8}", label: "Casablanca → New York", labelEn: "Casablanca → New York" },
    { from: "NBO", to: "DXB", fromFlag: "\u{1F1F0}\u{1F1EA}", toFlag: "\u{1F1E6}\u{1F1EA}", label: "Nairobi → Dubaï", labelEn: "Nairobi → Dubai" },
    { from: "LAX", to: "BKK", fromFlag: "\u{1F1FA}\u{1F1F8}", toFlag: "\u{1F1F9}\u{1F1ED}", label: "Los Angeles → Bangkok", labelEn: "Los Angeles → Bangkok" },
  ];

  const heading = title ?? (fr ? "Routes populaires" : "Popular routes");

  return (
    <div>
      <p className="section-rule mb-3">
        {heading}
      </p>
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {displayRoutes.map((r) => (
          <button
            key={`${r.from}-${r.to}`}
            onClick={() => onSelect(r.from, r.to)}
            className="flex-shrink-0 flex items-center gap-2 bg-surface-2 border border-border rounded-xl px-4 py-2 text-sm text-muted hover:border-primary/40 hover:text-fg hover:bg-primary/5 transition-all duration-150 group relative"
          >
            {r.tag && (
              <span className="absolute -top-2 right-2 text-[8px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                {fr ? r.tag.fr : r.tag.en}
              </span>
            )}
            <span>{r.fromFlag}</span>
            <span className="font-semibold">{r.from}</span>
            <span className="text-subtle group-hover:text-primary/60">→</span>
            <span className="font-semibold">{r.to}</span>
            <span>{r.toFlag}</span>
          </button>
        ))}
      </div>
      {/* SEO internal links (hidden visually, crawlable) */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {displayRoutes.map((r) => (
          <Link
            key={`link-${r.from}-${r.to}`}
            href={`/flights/${r.from}-${r.to}`}
            className="text-[10px] text-subtle hover:text-primary transition-colors"
          >
            {fr ? r.label : r.labelEn}
          </Link>
        ))}
      </div>
    </div>
  );
}
