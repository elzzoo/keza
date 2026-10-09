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
    fr: { label: "Bonne affaire", abbr: "Excellent" },
    en: { label: "Great deal", abbr: "Excellent" },
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    icon: "great",
  },
  FAIR_DEAL: {
    fr: { label: "Prix moyen", abbr: "— Moyen" },
    en: { label: "Fair deal", abbr: "— Fair" },
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: "fair",
  },
  EXPENSIVE: {
    fr: { label: "Cher", abbr: "Cher" },
    en: { label: "Expensive", abbr: "Expensive" },
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: "expensive",
  },
  UNKNOWN: {
    fr: { label: "Pas de données", abbr: "?" },
    en: { label: "No data", abbr: "?" },
    color: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    icon: "unknown",
  },
};

function ValueIcon({
  name,
  className = "h-3 w-3",
}: {
  name: (typeof BADGE_CONFIG)[keyof typeof BADGE_CONFIG]["icon"];
  className?: string;
}) {
  if (name === "great") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
        <path d="m12 3 2.7 5.47 6.04.88-4.37 4.26 1.03 6.01L12 16.78l-5.4 2.84 1.03-6.01-4.37-4.26 6.04-.88L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "expensive") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
        <path d="M12 8v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 17h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M10.29 4.86 2.82 17.8A2.1 2.1 0 0 0 4.64 21h14.72a2.1 2.1 0 0 0 1.82-3.2L13.71 4.86a2.1 2.1 0 0 0-3.42 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "unknown") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
        <path d="M9.5 9a2.6 2.6 0 1 1 4.4 1.87c-.89.82-1.9 1.36-1.9 2.63" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 17h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

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
      <ValueIcon name={config.icon} />
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
