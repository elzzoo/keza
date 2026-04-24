// app/programmes/ProgramsTable.tsx
"use client";

import { useState, useMemo } from "react";
import { PROGRAMS, type LoyaltyProgram, type ProgramType, type Alliance } from "@/data/programs";
import { trackProgramClick } from "@/lib/analytics";

type SortKey = "score" | "cpmCents";
type SortDir = "desc" | "asc";
type TypeFilter = "all" | ProgramType;
type AllianceFilter = "all" | Alliance;

const L = {
  fr: {
    filterAll: "Tous",
    filterAirline: "✈ Airline",
    filterHotel: "🏨 Hôtel",
    filterTransfer: "💳 Transfert",
    alliances: "Alliance",
    colRank: "#",
    colProgram: "Programme",
    colScore: "Score",
    colCpm: "Valeur/mile",
    colPartners: "Partenaires",
    colUse: "Meilleur usage",
    sortAsc: "↑",
    sortDesc: "↓",
    noCpm: "—",
  },
  en: {
    filterAll: "All",
    filterAirline: "✈ Airline",
    filterHotel: "🏨 Hotel",
    filterTransfer: "💳 Transfer",
    alliances: "Alliance",
    colRank: "#",
    colProgram: "Program",
    colScore: "Score",
    colCpm: "Value/mile",
    colPartners: "Partners",
    colUse: "Best use",
    sortAsc: "↑",
    sortDesc: "↓",
    noCpm: "—",
  },
};

const PARTNER_LABELS: Record<string, string> = {
  amex: "Amex",
  chase: "Chase",
  citi: "Citi",
  "capital-one": "Cap1",
  bilt: "Bilt",
};

const ALLIANCE_FILTERS: { key: AllianceFilter; label: string }[] = [
  { key: "all",      label: "Toutes" },
  { key: "star",     label: "⭐ Star Alliance" },
  { key: "oneworld", label: "🌐 Oneworld" },
  { key: "skyteam",  label: "🌀 SkyTeam" },
];

export function ProgramsTable({ lang }: { lang: "fr" | "en" }) {
  const t = L[lang];
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [allianceFilter, setAllianceFilter] = useState<AllianceFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleAllianceFilter = (key: AllianceFilter) => {
    setAllianceFilter(key);
    // Alliance filter scopes to airline type — reset hotel/transfer selection
    if (key !== "all") setTypeFilter("all");
  };

  const filtered = useMemo(() => {
    let list = [...PROGRAMS];

    if (typeFilter !== "all") {
      list = list.filter((p) => p.type === typeFilter);
    }
    if (allianceFilter !== "all") {
      list = list.filter((p) => p.alliance === allianceFilter);
    }

    list.sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortDir === "desc" ? -diff : diff;
    });

    return list;
  }, [typeFilter, allianceFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <span className="text-border">↕</span>;
    return <span className="text-primary">{sortDir === "desc" ? "↓" : "↑"}</span>;
  };

  return (
    <div>
      {/* Type Filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1 mb-3">
        {(["all", "airline", "hotel", "transfer"] as const).map((key) => {
          const label = key === "all" ? t.filterAll : key === "airline" ? t.filterAirline : key === "hotel" ? t.filterHotel : t.filterTransfer;
          return (
            <button
              key={key}
              onClick={() => { setTypeFilter(key); if (key !== "all" && key !== "airline") setAllianceFilter("all"); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                typeFilter === key
                  ? "bg-primary/15 border-primary/35 text-blue-400"
                  : "bg-transparent border-border text-muted hover:text-fg"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Alliance Filters */}
      <div className="flex gap-2 flex-wrap mb-5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {ALLIANCE_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => handleAllianceFilter(f.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
              allianceFilter === f.key
                ? "bg-primary/15 border-primary/35 text-blue-400"
                : "bg-transparent border-border text-muted hover:text-fg"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block bg-surface border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider w-10">{t.colRank}</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider">{t.colProgram}</th>
              <th
                className="text-right px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider cursor-pointer select-none hover:text-fg transition-colors"
                onClick={() => toggleSort("score")}
              >
                {t.colScore} {sortIcon("score")}
              </th>
              <th
                className="text-right px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider cursor-pointer select-none hover:text-fg transition-colors"
                onClick={() => toggleSort("cpmCents")}
              >
                {t.colCpm} {sortIcon("cpmCents")}
              </th>
              <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider hidden lg:table-cell">{t.colPartners}</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider hidden xl:table-cell">{t.colUse}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((program, index) => (
              <tr
                key={program.id}
                id={program.id}
                className="border-b border-border/50 hover:bg-surface-2 transition-colors cursor-pointer"
                onClick={() => trackProgramClick({ id: program.id, name: program.name })}
              >
                <td className="px-4 py-3 text-xs font-black text-muted">{index + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{program.flag}</span>
                    <div>
                      <div className="font-bold text-fg text-sm">{program.name}</div>
                      <div className="text-[11px] text-muted">{program.company}</div>
                    </div>
                    {program.alliance && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-surface-2 border border-border text-muted capitalize">
                        {program.alliance}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-base font-black text-primary">{program.score}</span>
                  <span className="text-xs text-muted">/100</span>
                </td>
                <td className="px-4 py-3 text-right font-bold text-fg">
                  {program.cpmCents.toFixed(1)}¢
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {program.transferPartners.length > 0
                      ? program.transferPartners.map((p) => (
                          <span key={p} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-blue-400">
                            {PARTNER_LABELS[p] ?? p}
                          </span>
                        ))
                      : <span className="text-[10px] text-muted">—</span>
                    }
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted hidden xl:table-cell max-w-[200px]">
                  {lang === "fr" ? program.bestUseFr : program.bestUse}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-2">
        {filtered.map((program, index) => (
          <div
            key={program.id}
            id={program.id}
            className="bg-surface border border-border rounded-xl p-4"
            onClick={() => trackProgramClick({ id: program.id, name: program.name })}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-muted w-5">#{index + 1}</span>
                <span className="text-lg">{program.flag}</span>
                <div>
                  <div className="font-bold text-fg text-sm">{program.name}</div>
                  <div className="text-[11px] text-muted">{program.company}</div>
                </div>
              </div>
              <div className="text-right">
                <div>
                  <span className="text-lg font-black text-primary">{program.score}</span>
                  <span className="text-xs text-muted">/100</span>
                </div>
                <div className="text-xs font-bold text-fg">{program.cpmCents.toFixed(1)}¢/mi</div>
              </div>
            </div>
            <p className="text-[11px] text-muted mt-2">
              {lang === "fr" ? program.bestUseFr : program.bestUse}
            </p>
            {program.transferPartners.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {program.transferPartners.map((p) => (
                  <span key={p} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-blue-400">
                    {PARTNER_LABELS[p] ?? p}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
