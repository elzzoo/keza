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
    <div className="min-h-screen bg-surface">

      {/* ── Sticky header ─────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/60 glass-strong">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <span className="text-lg font-black tracking-tight">
              <span className="text-accent">KE</span>ZA
            </span>
            {/* Live dot */}
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-success/80 bg-success/8 border border-success/20 rounded-full px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Live
            </span>
          </div>

          {/* Right: tagline + lang toggle */}
          <div className="flex items-center gap-3">
            <span className="hidden md:block text-xs text-muted">Travel Decision Engine</span>
            <div className="flex gap-0.5 bg-surface-2 border border-border rounded-lg p-0.5">
              {(["fr", "en"] as Lang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={[
                    "px-2.5 py-1 rounded-md text-xs font-bold transition-all duration-150",
                    lang === l ? "bg-accent text-white shadow-sm" : "text-muted hover:text-white",
                  ].join(" ")}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero section ──────────────────────────── */}
      {!hasResults && (
        <section className="relative overflow-hidden">
          <div className="hero-glow" />
          <div className="max-w-2xl mx-auto px-4 pt-14 pb-10 text-center relative z-10">
            <div className="inline-flex items-center gap-2 bg-accent/8 border border-accent/20 rounded-full px-4 py-1.5 text-xs text-accent/80 font-semibold mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              {lang === "fr"
                ? "Comparateur cash vs miles en temps réel"
                : "Real-time cash vs miles comparison"}
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-3 leading-tight">
              <span className="gradient-text">
                {lang === "fr" ? "Payez moins cher." : "Pay less."}
              </span>
              <br />
              <span className="text-white">
                {lang === "fr" ? "Voyagez mieux." : "Travel better."}
              </span>
            </h1>
            <p className="text-muted text-sm max-w-sm mx-auto leading-relaxed">
              {lang === "fr"
                ? "Cash, miles ou transfert — KEZA analyse chaque vol et décide pour vous."
                : "Cash, miles, or transfer — KEZA analyses every flight and decides for you."}
            </p>
          </div>
        </section>
      )}

      {/* ── Main content ──────────────────────────── */}
      <main className="max-w-2xl mx-auto px-4 pb-16 space-y-6">

        {/* Promo banner */}
        {!hasResults && <PromoBanner lang={lang} />}

        {/* Search form */}
        <section>
          {!hasResults && (
            <p className="section-rule mb-4">
              {lang === "fr" ? "Rechercher un vol" : "Search a flight"}
            </p>
          )}
          <SearchForm onResults={setResults} onLoading={setLoading} lang={lang} />
        </section>

        {/* Results */}
        {hasResults && (
          <section>
            <p className="section-rule mb-4">
              {lang === "fr" ? "Résultats" : "Results"}
            </p>
            <Results results={results} loading={loading} lang={lang} />

            {/* Back to search hint */}
            {!loading && results.length > 0 && (
              <button
                type="button"
                onClick={() => setResults([])}
                className="mt-6 w-full py-2.5 rounded-xl border border-border text-xs text-muted hover:text-white hover:border-border-light transition-all"
              >
                {lang === "fr" ? "← Nouvelle recherche" : "← New search"}
              </button>
            )}
          </section>
        )}

        {/* How it works — only on landing */}
        {!hasResults && <HowItWorks lang={lang} />}
      </main>

      {/* ── Footer ────────────────────────────────── */}
      <footer className="border-t border-border/50 py-6">
        <div className="max-w-2xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted/50">
          <span>
            <span className="text-accent font-bold">KE</span>
            <span className="font-bold text-white/40">ZA</span>
            {" · "}
            {lang === "fr" ? "Moteur de décision voyage" : "Travel Decision Engine"}
          </span>
          <span>
            {lang === "fr" ? "Conçu à Dakar, Sénégal 🇸🇳" : "Built in Dakar, Senegal 🇸🇳"}
          </span>
        </div>
      </footer>
    </div>
  );
}
