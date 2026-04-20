"use client";

import Link from "next/link";

interface Route {
  from: string;
  to: string;
  fromFlag: string;
  toFlag: string;
  label: string;
  labelEn: string;
}

// Global mix: Africa routes + worldwide popular routes
const ROUTES: Route[] = [
  { from: "DSS", to: "CDG", fromFlag: "\u{1F1F8}\u{1F1F3}", toFlag: "\u{1F1EB}\u{1F1F7}", label: "Dakar \u2192 Paris", labelEn: "Dakar \u2192 Paris" },
  { from: "JFK", to: "LHR", fromFlag: "\u{1F1FA}\u{1F1F8}", toFlag: "\u{1F1EC}\u{1F1E7}", label: "New York \u2192 Londres", labelEn: "New York \u2192 London" },
  { from: "CDG", to: "NRT", fromFlag: "\u{1F1EB}\u{1F1F7}", toFlag: "\u{1F1EF}\u{1F1F5}", label: "Paris \u2192 Tokyo", labelEn: "Paris \u2192 Tokyo" },
  { from: "LOS", to: "LHR", fromFlag: "\u{1F1F3}\u{1F1EC}", toFlag: "\u{1F1EC}\u{1F1E7}", label: "Lagos \u2192 Londres", labelEn: "Lagos \u2192 London" },
  { from: "SIN", to: "SYD", fromFlag: "\u{1F1F8}\u{1F1EC}", toFlag: "\u{1F1E6}\u{1F1FA}", label: "Singapour \u2192 Sydney", labelEn: "Singapore \u2192 Sydney" },
  { from: "CMN", to: "JFK", fromFlag: "\u{1F1F2}\u{1F1E6}", toFlag: "\u{1F1FA}\u{1F1F8}", label: "Casablanca \u2192 New York", labelEn: "Casablanca \u2192 New York" },
  { from: "NBO", to: "DXB", fromFlag: "\u{1F1F0}\u{1F1EA}", toFlag: "\u{1F1E6}\u{1F1EA}", label: "Nairobi \u2192 Duba\u00ef", labelEn: "Nairobi \u2192 Dubai" },
  { from: "LAX", to: "BKK", fromFlag: "\u{1F1FA}\u{1F1F8}", toFlag: "\u{1F1F9}\u{1F1ED}", label: "Los Angeles \u2192 Bangkok", labelEn: "Los Angeles \u2192 Bangkok" },
];

interface Props {
  lang: "fr" | "en";
  onSelect: (from: string, to: string) => void;
}

export function PopularRoutes({ lang, onSelect }: Props) {
  const fr = lang === "fr";
  return (
    <div>
      <p className="section-rule mb-3">
        {fr ? "Routes populaires" : "Popular routes"}
      </p>
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {ROUTES.map((r) => (
          <button
            key={`${r.from}-${r.to}`}
            onClick={() => onSelect(r.from, r.to)}
            className="flex-shrink-0 flex items-center gap-2 bg-surface-2 border border-border rounded-xl px-4 py-2 text-sm text-muted hover:border-primary/40 hover:text-fg hover:bg-primary/5 transition-all duration-150 group"
          >
            <span>{r.fromFlag}</span>
            <span className="font-semibold">{r.from}</span>
            <span className="text-subtle group-hover:text-primary/60">\u2192</span>
            <span className="font-semibold">{r.to}</span>
            <span>{r.toFlag}</span>
          </button>
        ))}
      </div>
      {/* SEO internal links (hidden visually, crawlable) */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {ROUTES.map((r) => (
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
