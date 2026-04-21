"use client";

import { PROGRAMS } from "@/data/programs";
import { trackProgramClick } from "@/lib/analytics";

interface Props {
  lang: "fr" | "en";
}

const L = {
  fr: { title: "Top programmes", seeAll: "Voir tout →", score: "Score KEZA", updated: "Mis à jour · avr. 2026" },
  en: { title: "Top programs",   seeAll: "See all →",   score: "KEZA Score", updated: "Updated · Apr 2026" },
};

const TOP5 = PROGRAMS.slice(0, 5);

export function ProgramsWidget({ lang }: Props) {
  const t = L[lang];

  return (
    <div className="bg-surface border border-border rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🏆</span>
          <span className="text-xs font-bold text-muted uppercase tracking-wider">{t.title}</span>
        </div>
        <a
          href="/programmes"
          className="text-xs text-primary font-semibold hover:text-primary/80 transition-colors"
        >
          {t.seeAll}
        </a>
      </div>

      {/* Programs list */}
      <div className="space-y-2">
        {TOP5.map((program, index) => (
          <a
            key={program.id}
            href={`/programmes#${program.id}`}
            onClick={() => trackProgramClick({ id: program.id, name: program.name })}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-2 transition-colors group cursor-pointer"
          >
            {/* Rank */}
            <span className="flex-shrink-0 w-5 text-center text-xs font-black text-muted">
              #{index + 1}
            </span>

            {/* Flag + name */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{program.flag}</span>
                <span className="text-xs font-bold text-fg truncate">{program.name}</span>
              </div>
              <p className="text-[10px] text-muted truncate mt-0.5">
                {lang === "fr" ? program.bestUseFr : program.bestUse}
              </p>
            </div>

            {/* Score */}
            <div className="flex-shrink-0 text-right">
              <span className="text-sm font-black text-primary">{program.score}</span>
              <span className="text-[10px] text-muted">/100</span>
            </div>
          </a>
        ))}
      </div>

      {/* Footer */}
      <p className="text-[10px] text-muted mt-3 pt-3 border-t border-border/50">{t.updated}</p>
    </div>
  );
}
