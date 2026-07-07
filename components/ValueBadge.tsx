"use client";

import clsx from "clsx";

interface ValueBadgeProps {
  percentile: number;        // 0-100, where 0 = cheapest/best value
  badge: "GREAT_DEAL" | "FAIR_DEAL" | "EXPENSIVE" | "UNKNOWN";
  lang: "fr" | "en";
  size?: "sm" | "md"; // sm for inline, md for prominent
}

const BADGE_CONFIG = {
  GREAT_DEAL: {
    fr: { label: "Bonne affaire", abbr: "⭐ Excellent" },
    en: { label: "Great deal", abbr: "⭐ Excellent" },
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    icon: "⭐",
  },
  FAIR_DEAL: {
    fr: { label: "Prix moyen", abbr: "— Moyen" },
    en: { label: "Fair deal", abbr: "— Fair" },
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: "—",
  },
  EXPENSIVE: {
    fr: { label: "Cher", abbr: "⚠ Cher" },
    en: { label: "Expensive", abbr: "⚠ Expensive" },
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: "⚠",
  },
  UNKNOWN: {
    fr: { label: "Pas de données", abbr: "?" },
    en: { label: "No data", abbr: "?" },
    color: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    icon: "?",
  },
};

export function ValueBadge({ percentile, badge, lang, size = "sm" }: ValueBadgeProps) {
  const config = BADGE_CONFIG[badge];
  const isFr = lang === "fr";
  const text = isFr ? config.fr : config.en;

  const isSmall = size === "sm";

  return (
    <div
      title={`${text.label} — ${percentile}th percentile`}
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border font-semibold",
        config.color,
        isSmall ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
      )}
    >
      <span>{config.icon}</span>
      <span>{isSmall ? text.abbr : text.label}</span>
    </div>
  );
}

/**
 * Inline value badge suitable for use next to pricing
 * Shows just the icon and abbreviated label
 */
export function ValueBadgeInline({ badge, lang }: Omit<ValueBadgeProps, "percentile" | "size">) {
  return <ValueBadge badge={badge} lang={lang} percentile={0} size="sm" />;
}
