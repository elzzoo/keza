"use client";

import { useState } from "react";
import type { FlightResult } from "@/lib/engine";
import { SearchForm } from "@/components/SearchForm";
import { Results } from "@/components/Results";

type Lang = "fr" | "en";

export default function HomePage() {
  const [results, setResults] = useState<FlightResult[]>([]);
  const [loading, setLoading]   = useState(false);
  const [lang, setLang]         = useState<Lang>("fr");

  return (
    <main className="min-h-screen bg-surface">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <span className="text-xl font-bold tracking-tight">
              <span className="text-accent">KE</span>ZA
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted hidden sm:block">Travel Decision Engine</span>

            {/* Language toggle */}
            <div className="flex gap-0.5 bg-card border border-border rounded-lg p-0.5">
              {(["fr", "en"] as Lang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={[
                    "px-2.5 py-1 rounded-md text-xs font-semibold transition-all",
                    lang === l
                      ? "bg-accent text-white shadow-sm"
                      : "text-muted hover:text-white",
                  ].join(" ")}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-10">
        {/* Search section */}
        <section className="space-y-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white">
              {lang === "fr" ? "Trouvez la meilleure façon de voyager" : "Find the best way to fly"}
            </h1>
            <p className="text-sm text-muted">
              {lang === "fr"
                ? "Cash, miles ou transfert — KEZA décide pour vous."
                : "Cash, miles, or transfer — KEZA decides for you."}
            </p>
          </div>
          <SearchForm onResults={setResults} onLoading={setLoading} lang={lang} />
        </section>

        {/* Results section */}
        <section>
          <Results results={results} loading={loading} lang={lang} />
        </section>
      </div>
    </main>
  );
}
