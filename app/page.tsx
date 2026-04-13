"use client";

import { useState } from "react";
import type { FlightResult } from "@/lib/engine";
import { SearchForm }  from "@/components/SearchForm";
import { Results }     from "@/components/Results";
import { PromoBanner } from "@/components/PromoBanner";
import { HowItWorks }  from "@/components/HowItWorks";

type Lang = "fr" | "en";

export default function HomePage() {
  const [results, setResults] = useState<FlightResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [lang, setLang]       = useState<Lang>("fr");
  const hasResults = results.length > 0 || loading;

  return (
    <div className="min-h-screen bg-bg">

      {/* ── Sticky nav ────────────────────────────── */}
      <header className="sticky top-0 z-50 glass-nav">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-black text-lg tracking-tight">
              <span className="text-accent">KE</span>
              <span className="text-white">ZA</span>
            </span>
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-success/70 bg-success/8 border border-success/15 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Live
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden md:block text-[11px] text-muted tracking-wide">Travel Decision Engine</span>
            <div className="flex gap-0.5 bg-surface border border-border rounded-xl p-1">
              {(["fr","en"] as Lang[]).map(l => (
                <button key={l} type="button" onClick={() => setLang(l)}
                  className={clsx(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
                    lang === l ? "bg-accent text-white" : "text-muted hover:text-white"
                  )}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero (landing only) ───────────────────── */}
      {!hasResults && (
        <section className="relative overflow-hidden">
          <div className="hero-glow" />
          <div className="relative z-10 max-w-2xl mx-auto px-4 pt-16 pb-12 text-center">
            {/* Status pill */}
            <div className="inline-flex items-center gap-2 bg-accent/8 border border-accent/15 rounded-full px-4 py-1.5 text-xs text-accent/70 font-semibold mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              {lang === "fr"
                ? "Comparateur cash vs miles · Données en temps réel"
                : "Cash vs miles · Real-time pricing"}
            </div>

            {/* Title */}
            <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-[1.05] mb-5">
              <span className="text-gradient">
                {lang === "fr" ? "Cash ou miles ?" : "Cash or miles?"}
              </span>
              <br />
              <span className="text-white/90 text-4xl sm:text-5xl">
                {lang === "fr" ? "KEZA décide." : "KEZA decides."}
              </span>
            </h1>

            <p className="text-muted-2 text-base max-w-sm mx-auto leading-relaxed">
              {lang === "fr"
                ? "Comparez le vrai coût de chaque option — cash, miles ou transfert — sur chaque vol partant d'Afrique."
                : "Compare the true cost of each option — cash, miles, or transfer — on every flight from Africa."}
            </p>
          </div>
        </section>
      )}

      {/* ── Content ───────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-4 pb-20 space-y-6">

        {!hasResults && <PromoBanner lang={lang} />}

        {/* Search */}
        <section>
          {!hasResults && (
            <p className="section-rule mb-4">
              {lang === "fr" ? "Rechercher" : "Search"}
            </p>
          )}
          <SearchForm onResults={setResults} onLoading={setLoading} lang={lang} />
        </section>

        {/* Results */}
        {hasResults && (
          <section className="space-y-4">
            <p className="section-rule">
              {lang === "fr" ? "Résultats" : "Results"}
            </p>
            <Results results={results} loading={loading} lang={lang} />
            {!loading && results.length > 0 && (
              <button
                type="button"
                onClick={() => setResults([])}
                className="w-full py-3 rounded-2xl border border-border text-xs text-muted hover:text-white hover:border-border-light transition-all"
              >
                ← {lang === "fr" ? "Nouvelle recherche" : "New search"}
              </button>
            )}
          </section>
        )}

        {!hasResults && <HowItWorks lang={lang} />}
      </main>

      {/* ── Footer ────────────────────────────────── */}
      <footer className="border-t border-border/40 py-8">
        <div className="max-w-2xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted/40">
            <span className="text-accent font-bold">KE</span>
            <span className="font-bold text-white/30">ZA</span>
            {" · "}Travel Decision Engine
          </span>
          <span className="text-xs text-muted/40">
            {lang === "fr" ? "Conçu à Dakar 🇸🇳" : "Built in Dakar 🇸🇳"}
          </span>
        </div>
      </footer>
    </div>
  );
}

// clsx inline pour page.tsx (pas d'import supplémentaire)
function clsx(...args: (string | boolean | undefined)[]) {
  return args.filter(Boolean).join(" ");
}
