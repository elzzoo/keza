"use client";

import { useState, useMemo } from "react";
import { MILES_PRICES } from "@/data/milesPrices";

interface Props {
  lang: "fr" | "en";
}

const L = {
  fr: { label: "J'ai", miles: "miles", worth: "≈", program: "programme", detail: "Voir le détail →" },
  en: { label: "I have", miles: "miles", worth: "≈", program: "program", detail: "See details →" },
};

export function MilesCalculatorWidget({ lang }: Props) {
  const t = L[lang];
  const [miles, setMiles]     = useState(50000);
  const [programIdx, setProgramIdx] = useState(0);

  const program = MILES_PRICES[programIdx];
  const valueUsd = useMemo(
    () => Math.round(miles * (program?.valueCents ?? 1.4) / 100),
    [miles, program]
  );

  return (
    <div className="bg-surface border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🧮</span>
        <span className="text-xs font-bold text-muted uppercase tracking-wider">
          {lang === "fr" ? "Valeur de tes miles" : "Your miles value"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">{t.label}</span>

        <input
          type="number"
          min={1000}
          max={1000000}
          step={1000}
          value={miles}
          onChange={(e) => setMiles(Math.max(0, parseInt(e.target.value, 10) || 0))}
          className="w-24 bg-bg border border-border rounded-lg px-2 py-1 text-fg text-sm font-bold text-center focus:outline-none focus:border-primary/50"
        />

        <select
          value={programIdx}
          onChange={(e) => setProgramIdx(parseInt(e.target.value, 10))}
          className="bg-bg border border-border rounded-lg px-2 py-1 text-sm text-fg focus:outline-none focus:border-primary/50"
        >
          {MILES_PRICES.map((p, i) => (
            <option key={p.program} value={i}>{p.program}</option>
          ))}
        </select>

        <span className="text-muted">{t.worth}</span>
        <span className="text-xl font-black text-primary">${valueUsd}</span>
      </div>

      <a
        href="/calculateur"
        className="mt-3 block text-xs text-primary/70 hover:text-primary transition-colors"
      >
        {t.detail}
      </a>
    </div>
  );
}
