"use client";

import type { RecentSearch } from "@/lib/userProfile";
import { Badge, Card } from "@/components/ui";

interface Props {
  searches: RecentSearch[];
  lang: "fr" | "en";
  onSelect: (from: string, to: string) => void;
}

function timeAgo(ts: string, fr: boolean): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return fr ? "à l'instant" : "just now";
  if (mins < 60) return fr ? `il y a ${mins}min` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return fr ? `il y a ${hrs}h` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return fr ? `il y a ${days}j` : `${days}d ago`;
}

export function RecentSearches({ searches, lang, onSelect }: Props) {
  const fr = lang === "fr";

  return (
    <div>
      <p className="section-rule mb-3">
        {fr ? "Recherches récentes" : "Recent searches"}
      </p>
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {searches.slice(0, 5).map((s, i) => (
          <Card
            as="button"
            key={`${s.from}-${s.to}-${i}`}
            onClick={() => onSelect(s.from, s.to)}
            padding="sm"
            interactive
            className="flex-shrink-0 bg-surface-2 text-left press-effect group"
          >
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold text-fg">{s.from}</span>
              <span className="text-subtle group-hover:text-primary/60">→</span>
              <span className="font-bold text-fg">{s.to}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {s.bestSavings && s.bestSavings > 0 && (
                <Badge
                  tone={s.recommendation === "USE_MILES" ? "primary" : "warning"}
                  className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                >
                  {s.recommendation === "USE_MILES" ? "\u2708" : "$"} {s.bestSavings.toFixed(0)}
                </Badge>
              )}
              <span className="text-[10px] text-subtle">{timeAgo(s.timestamp, fr)}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
