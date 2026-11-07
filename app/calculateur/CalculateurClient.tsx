"use client";

import { useState, useMemo } from "react";
import type { MilesPriceRecord } from "@/data/milesPrices";
import { isMilesReviewStale } from "@/lib/milesFreshness";

function isValidForexRate(rate: number | undefined): rate is number {
  return typeof rate === "number" && Number.isFinite(rate) && rate > 400 && rate < 800;
}

export function CalculateurClient({ programs, forexRate, lang = "fr", asOfDate }: { programs: MilesPriceRecord[]; forexRate?: number; lang?: "fr" | "en"; asOfDate?: string }) {
  const [miles, setMiles] = useState(50000);
  const [idx, setIdx]     = useState(0);
  const program           = programs[idx];
  const valueUsd          = useMemo(() => Math.round(miles * program.valueCents / 100), [miles, program]);
  const xofValue          = isValidForexRate(forexRate) ? Math.round(valueUsd * forexRate) : null;

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
      <div>
        <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">
          {lang === "en" ? "Number of miles" : "Nombre de miles"}
        </label>
        <input
          type="range" min={1000} max={500000} step={1000}
          value={miles}
          onChange={(e) => setMiles(parseInt(e.target.value, 10))}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-muted">1 000</span>
          <span className="text-sm font-black text-fg">{miles.toLocaleString()} miles</span>
          <span className="text-xs text-muted">500 000</span>
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">{lang === "en" ? "Program" : "Programme"}</label>
        <select
          value={idx}
          onChange={(e) => setIdx(parseInt(e.target.value, 10))}
          className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-fg text-sm focus:outline-none focus:border-primary/50"
        >
          {programs.map((p, i) => (
            <option key={p.program} value={i}>{p.program}</option>
          ))}
        </select>
      </div>
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-5 text-center">
        <p className="text-xs text-muted mb-1">{miles.toLocaleString()} {program.program} {lang === "en" ? "miles are worth approximately" : "miles valent environ"}</p>
        <p className="text-4xl font-black text-primary">${valueUsd}</p>
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {xofValue !== null ? (
            <span className="text-xs text-muted bg-surface-2 border border-border px-2 py-1 rounded-lg">
              XOF <span className="text-fg font-semibold">{xofValue.toLocaleString("fr-FR")} FCFA</span>
            </span>
          ) : (
            <span className="text-xs text-muted bg-surface-2 border border-border px-2 py-1 rounded-lg">
              XOF - {lang === "en" ? "rate unavailable" : "taux indisponible"}
            </span>
          )}
        </div>
        {xofValue !== null && <p className="text-xs text-muted mt-1">{lang === "en" ? "Approximate conversion" : "Conversion indicative"}</p>}
        <p className="text-xs text-muted mt-3">{lang === "en" ? `Based on ${program.valueCents.toFixed(1)}¢ / mile · Confidence: ${program.confidence}` : `Basé sur ${program.valueCents.toFixed(1)}¢ / mile · Confiance : ${program.confidence}`}</p>
        <p className="text-xs text-muted mt-1">
          {lang === "en" ? "Value dated" : "Valeur datée du"} {program.lastUpdated}
          {isMilesReviewStale(program.lastUpdated, asOfDate) && (
            <span className="ml-2 font-semibold text-warning">{lang === "en" ? "Older estimate" : "Estimation ancienne"}</span>
          )}
        </p>
      </div>
    </div>
  );
}
