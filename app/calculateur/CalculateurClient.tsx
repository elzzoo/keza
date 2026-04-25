"use client";

import { useState, useMemo } from "react";
import type { MilesPriceRecord } from "@/data/milesPrices";

export function CalculateurClient({ programs, forexRate = 605 }: { programs: MilesPriceRecord[]; forexRate?: number }) {
  const [miles, setMiles] = useState(50000);
  const [idx, setIdx]     = useState(0);
  const program           = programs[idx];
  const valueUsd          = useMemo(() => Math.round(miles * program.valueCents / 100), [miles, program]);
  const valueEur          = useMemo(() => Math.round(valueUsd * 0.92), [valueUsd]);
  const valueFcfa         = useMemo(() => Math.round(valueUsd * forexRate), [valueUsd, forexRate]);

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
        <p className="text-sm text-muted mt-1">≈ {valueEur} € · {valueFcfa.toLocaleString("fr-FR")} FCFA</p>
        <p className="text-xs text-muted mt-3">Basé sur {program.valueCents.toFixed(1)}¢ / mile · Confiance : {program.confidence}</p>
      </div>
    </div>
  );
}
