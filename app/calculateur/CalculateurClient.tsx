"use client";

import { useState, useMemo } from "react";
import type { MilesPriceRecord } from "@/data/milesPrices";

export function CalculateurClient({ programs }: { programs: MilesPriceRecord[]; forexRate?: number }) {
  const [miles, setMiles] = useState(50000);
  const [idx, setIdx]     = useState(0);
  const program           = programs[idx];
  const valueUsd          = useMemo(() => Math.round(miles * program.valueCents / 100), [miles, program]);

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 space-y-5">
      <div>
        <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">
          Nombre de miles
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
        <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Programme</label>
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
        <p className="text-xs text-muted mb-1">{miles.toLocaleString()} {program.program} miles valent environ</p>
        <p className="text-4xl font-black text-primary">${valueUsd}</p>
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {[
            { code: "XOF", symbol: "FCFA", rate: 605 },
            { code: "EUR", symbol: "€", rate: 0.92 },
            { code: "GBP", symbol: "£", rate: 0.79 },
          ].map(({ code, symbol, rate }) => (
            <span key={code} className="text-xs text-muted bg-surface-2 border border-border px-2 py-1 rounded-lg">
              {code} <span className="text-fg font-semibold">{code === "XOF" ? Math.round(valueUsd * rate).toLocaleString("fr-FR") : (valueUsd * rate).toFixed(0)}{" "}{symbol}</span>
            </span>
          ))}
        </div>
        <p className="text-xs text-muted mt-3">Basé sur {program.valueCents.toFixed(1)}¢ / mile · Confiance : {program.confidence}</p>
      </div>
    </div>
  );
}
