"use client";

/**
 * MilesValueScore — shows current CPM (cents per mile) for the user's saved programs.
 * Displayed on /alertes after authentication.
 */

import { PROGRAMS } from "@/data/programs";

interface Props {
  /** Program IDs saved in the user's profile (from useProfile) */
  savedPrograms?: string[];
  lang?: "fr" | "en";
}

function cpmColor(cpm: number): string {
  if (cpm >= 2.0) return "text-success";
  if (cpm >= 1.2) return "text-primary";
  if (cpm >= 0.8) return "text-warning";
  return "text-muted";
}

function cpmLabel(cpm: number, lang: "fr" | "en"): string {
  if (cpm >= 2.0) return lang === "fr" ? "Excellent" : "Excellent";
  if (cpm >= 1.5) return lang === "fr" ? "Très bon" : "Very good";
  if (cpm >= 1.0) return lang === "fr" ? "Correct" : "Fair";
  return lang === "fr" ? "Faible" : "Low";
}

export function MilesValueScore({ savedPrograms, lang = "fr" }: Props) {
  // Filter to user's saved programs, or show top 5 if none saved
  const programData = savedPrograms && savedPrograms.length > 0
    ? PROGRAMS.filter((p) => savedPrograms.includes(p.id))
    : PROGRAMS.slice(0, 5);

  if (programData.length === 0) return null;

  // Sort by cpmCents descending
  const sorted = [...programData].sort((a, b) => b.cpmCents - a.cpmCents);

  const avgCpm = sorted.reduce((sum, p) => sum + p.cpmCents, 0) / sorted.length;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg">
          {lang === "fr" ? "Valeur de vos miles" : "Your miles value"}
        </h3>
        <span className="text-xs text-muted">
          {lang === "fr" ? "Moy." : "Avg."}{" "}
          <span className={`font-bold ${cpmColor(avgCpm)}`}>
            {avgCpm.toFixed(1)}¢/mile
          </span>
        </span>
      </div>

      {/* Program rows */}
      <div className="space-y-2">
        {sorted.map((program) => {
          const pct = Math.min(100, (program.cpmCents / 3.0) * 100);
          return (
            <div key={program.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{program.flag}</span>
                  <span className="text-xs text-fg font-medium truncate max-w-[140px]">
                    {program.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-bold ${cpmColor(program.cpmCents)}`}>
                    {program.cpmCents.toFixed(1)}¢
                  </span>
                  <span className="text-[10px] text-muted w-14 text-right">
                    {cpmLabel(program.cpmCents, lang)}
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-1 w-full bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    program.cpmCents >= 2.0
                      ? "bg-success"
                      : program.cpmCents >= 1.2
                      ? "bg-primary"
                      : program.cpmCents >= 0.8
                      ? "bg-warning"
                      : "bg-muted"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <p className="text-[10px] text-muted/70 leading-relaxed">
        {lang === "fr"
          ? "CPM = centimes par mile/point selon les tarifs award actuels. Plus c'est élevé, plus vos miles ont de valeur."
          : "CPM = cents per mile/point based on current award rates. Higher = more valuable miles."}
      </p>

      {!savedPrograms?.length && (
        <p className="text-[10px] text-muted/60">
          {lang === "fr"
            ? "💡 Sauvegardez vos programmes sur la page d'accueil pour voir uniquement les vôtres."
            : "💡 Save your programs on the home page to see only yours."}
        </p>
      )}
    </div>
  );
}
