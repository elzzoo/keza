"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DESTINATIONS } from "@/data/destinations";
import { computeDealRatio, classifyDeal } from "@/lib/dealsEngine";
import { getMonthlyPrices } from "@/lib/priceHistory";
import type { DealRecommendation } from "@/lib/dealsEngine";

// ─── Constants ──────────────────────────────────────────────────────────────

const REC_COLORS: Record<DealRecommendation, string> = {
  USE_MILES: "#3b82f6",
  NEUTRAL:   "#10b981",
  USE_CASH:  "#f59e0b",
};

const REC_LABELS_FR: Record<DealRecommendation, string> = {
  USE_MILES: "MILES ✓",
  NEUTRAL:   "NEUTRE ~",
  USE_CASH:  "CASH ✗",
};

const REC_LABELS_EN: Record<DealRecommendation, string> = {
  USE_MILES: "MILES ✓",
  NEUTRAL:   "NEUTRAL ~",
  USE_CASH:  "CASH ✗",
};

// ─── Pure function (exported for tests) ─────────────────────────────────────

export function buildComparisonData(iatas: string[]) {
  return iatas
    .map((iata) => {
      const dest = DESTINATIONS.find((d) => d.iata === iata.toUpperCase());
      if (!dest) return null;
      const cpm = computeDealRatio(dest.cashEstimateUsd, dest.milesEstimate);
      const recommendation = classifyDeal(cpm);
      try {
        const history = getMonthlyPrices(dest);
        const bestLabels = history.bestMonths.map((i) => history.monthlyPrices[i].monthLabel);
        return { dest, cpm, recommendation, bestLabels };
      } catch {
        // If price history fails, still render destination with empty best labels
        return { dest, cpm, recommendation, bestLabels: [] };
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ComparateurClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const fr = lang === "fr";

  const slotA = searchParams.get("a")?.toUpperCase() ?? "";
  const slotB = searchParams.get("b")?.toUpperCase() ?? "";
  const slotC = searchParams.get("c")?.toUpperCase() ?? "";

  function updateSlot(slot: "a" | "b" | "c", iata: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (iata) {
      // Clear any other slot that already holds this IATA to prevent duplicates
      (["a", "b", "c"] as const)
        .filter((s) => s !== slot)
        .forEach((s) => { if (params.get(s) === iata.toUpperCase()) params.delete(s); });
      params.set(slot, iata.toUpperCase());
    } else {
      params.delete(slot);
    }
    router.replace(`/comparer?${params.toString()}`);
  }

  const selected = useMemo(
    () => buildComparisonData([slotA, slotB, slotC].filter(Boolean)),
    [slotA, slotB, slotC]
  );

  const gridCols =
    selected.length <= 1
      ? "grid-cols-1"
      : selected.length === 2
      ? "grid-cols-2"
      : "grid-cols-3";

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header lang={lang} onLangChange={setLang} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 pb-12">
        {/* Hero */}
        <div className="pt-8 pb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-fg mb-2">
            📊 {fr ? "Comparer des destinations" : "Compare destinations"}
          </h1>
          <p className="text-sm text-muted">
            {fr
              ? "Sélectionne jusqu'à 3 destinations pour les comparer"
              : "Select up to 3 destinations to compare"}
          </p>
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {(["a", "b", "c"] as const).map((slot, i) => {
            const val = [slotA, slotB, slotC][i];
            return (
              <select
                key={slot}
                value={val}
                onChange={(e) => updateSlot(slot, e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-sm text-fg"
                aria-label={`Destination ${i + 1}`}
              >
                <option value="">—</option>
                {DESTINATIONS.map((d) => (
                  <option key={d.iata} value={d.iata}>
                    {d.flag} {d.city}
                  </option>
                ))}
              </select>
            );
          })}
        </div>

        {/* Empty state */}
        {selected.length === 0 && (
          <div className="flex flex-col items-center gap-5 py-16 animate-fade-up">
            <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center text-2xl">
              🗺️
            </div>
            <div className="text-center max-w-xs">
              <p className="font-semibold text-fg">
                {fr ? "Choisissez vos destinations" : "Select your destinations"}
              </p>
              <p className="text-sm text-muted mt-1">
                {fr
                  ? "Sélectionnez 1 à 3 destinations ci-dessus pour comparer cash vs miles côte à côte."
                  : "Select 1–3 destinations above to compare cash vs miles side by side."}
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              {(fr
                ? ["Choisissez une destination dans le menu A", "Ajoutez B (et C) pour comparer", "Voyez instantanément : cash ou miles gagne"]
                : ["Pick a destination in slot A", "Add B (and C) to compare", "See instantly: cash or miles wins"]
              ).map((step, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-muted bg-surface border border-border rounded-xl px-4 py-2.5">
                  <span className="text-primary font-bold tabular-nums">{i + 1}.</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hero badges + table */}
        {selected.length > 0 && (
          <>
            {/* Hero badges */}
            <div className={`grid ${gridCols} gap-3 mb-6`}>
              {selected.map(({ dest, cpm, recommendation }) => {
                const color = REC_COLORS[recommendation];
                const label = fr ? REC_LABELS_FR[recommendation] : REC_LABELS_EN[recommendation];
                return (
                  <div
                    key={dest.iata}
                    className="rounded-2xl border p-4 text-center"
                    style={{
                      borderColor: `${color}44`,
                      backgroundColor: `${color}08`,
                    }}
                  >
                    <div className="text-3xl mb-2">{dest.flag}</div>
                    <div className="font-black text-fg text-base mb-1">{dest.city}</div>
                    <div
                      className="text-lg font-black mb-2"
                      style={{ color }}
                    >
                      {cpm.toFixed(1)}¢/mile
                    </div>
                    <div
                      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black mb-3"
                      style={{
                        backgroundColor: `${color}22`,
                        color,
                        border: `1px solid ${color}44`,
                      }}
                    >
                      {label}
                    </div>
                    <div>
                      <Link
                        href={`/destinations/${dest.iata.toLowerCase()}`}
                        className="text-xs text-muted hover:text-fg transition-colors"
                      >
                        {fr ? "Voir la fiche →" : "View details →"}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comparison table */}
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[400px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wide font-semibold w-1/4" />
                      {selected.map(({ dest }) => (
                        <th
                          key={dest.iata}
                          className="text-center px-4 py-3 font-black text-fg text-xs"
                        >
                          {dest.flag} {dest.city}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="px-4 py-3 text-xs text-muted">Cash</td>
                      {selected.map(({ dest }) => (
                        <td key={dest.iata} className="px-4 py-3 text-center font-bold text-fg">
                          ${dest.cashEstimateUsd}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border">
                      <td className="px-4 py-3 text-xs text-muted">Miles</td>
                      {selected.map(({ dest }) => (
                        <td key={dest.iata} className="px-4 py-3 text-center font-bold text-fg">
                          {(dest.milesEstimate / 1000).toFixed(0)}k
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-xs text-muted">
                        {fr ? "Meilleurs mois" : "Best months"}
                      </td>
                      {selected.map(({ dest, bestLabels }) => (
                        <td
                          key={dest.iata}
                          className="px-4 py-3 text-center text-xs text-success"
                        >
                          {bestLabels.join(" · ")}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      <Footer lang={lang} />
    </div>
  );
}
