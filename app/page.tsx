"use client";

import { useState } from "react";
import type { FlightResult } from "@/lib/engine";
import { SearchForm } from "@/components/SearchForm";
import { Results } from "@/components/Results";

export default function HomePage() {
  const [results, setResults] = useState<FlightResult[]>([]);
  const [loading, setLoading] = useState(false);

  return (
    <main className="min-h-screen bg-surface">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <span className="text-xl font-bold tracking-tight">
              <span className="text-accent">KE</span>ZA
            </span>
          </div>
          <span className="text-xs text-muted">Travel Decision Engine</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-10">
        {/* Search section */}
        <section className="space-y-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white">
              Find the best way to fly
            </h1>
            <p className="text-sm text-muted">
              Cash, miles, or transfer — KEZA decides for you.
            </p>
          </div>
          <SearchForm onResults={setResults} onLoading={setLoading} />
        </section>

        {/* Results section */}
        <section>
          <Results results={results} loading={loading} />
        </section>
      </div>
    </main>
  );
}
