"use client";

import { useState, useCallback, useRef } from "react";
import type { FlightResult } from "@/lib/engine";
import { Header }        from "@/components/Header";
import { Footer }        from "@/components/Footer";
import { TrustBar }      from "@/components/TrustBar";
import { SearchForm }    from "@/components/SearchForm";
import { Results }       from "@/components/Results";
import { HowItWorks }    from "@/components/HowItWorks";
import { PromoBanner }   from "@/components/PromoBanner";
import { PopularRoutes } from "@/components/PopularRoutes";

export default function HomePage() {
  const [lang,    setLang]    = useState<"fr" | "en">("fr");
  const [results, setResults] = useState<FlightResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleResults = useCallback((r: FlightResult[]) => {
    setResults(r);
    setHasSearched(true);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, []);

  const handleBack = () => {
    setResults([]); setHasSearched(false);
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header lang={lang} onLangChange={setLang} />
      <TrustBar lang={lang} />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-12">

        {/* ── Hero ──────────────────────────────────────────── */}
        {!hasSearched && (
          <div className="pt-10 pb-8 text-center space-y-4 animate-fade-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/8 border border-primary/15 text-xs font-semibold text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {lang === "fr" ? "Comparateur cash vs miles · Données en temps réel" : "Cash vs miles comparator · Real-time data"}
            </div>

            {/* Title */}
            <div className="space-y-1">
              <h1 className="text-4xl sm:text-5xl font-black leading-tight">
                <span className="bg-gradient-to-br from-blue-800 via-primary to-blue-400 bg-clip-text text-transparent">
                  {lang === "fr" ? "Cash ou miles ?" : "Cash or miles?"}
                </span>
                <br />
                <span className="text-fg">
                  {lang === "fr" ? "KEZA décide." : "KEZA decides."}
                </span>
              </h1>
              <p className="text-base text-muted max-w-sm mx-auto leading-relaxed">
                {lang === "fr"
                  ? "Comparez le vrai coût de chaque option — cash, miles ou transfert — sur chaque vol partant d'Afrique."
                  : "Compare the real cost of each option — cash, miles or transfer — on every flight from Africa."}
              </p>
            </div>
          </div>
        )}

        {/* ── Compact heading in results mode ───────────────── */}
        {hasSearched && (
          <div className="pt-6 pb-4">
            <div className="flex items-center justify-between">
              <span className="font-black text-lg">
                <span className="text-primary">KE</span>
                <span className="text-fg">ZA</span>
              </span>
              <span className="text-xs text-muted">
                {lang === "fr" ? "Cash ou Miles ?" : "Cash or Miles?"}
              </span>
            </div>
          </div>
        )}

        {/* ── Search form ───────────────────────────────────── */}
        <div className="animate-fade-up">
          <SearchForm onResults={handleResults} onLoading={setLoading} lang={lang} />
        </div>

        {/* ── Results ───────────────────────────────────────── */}
        {(hasSearched || loading) && (
          <div ref={resultsRef} className="mt-6">
            <Results
              results={results}
              loading={loading}
              lang={lang}
              onBack={handleBack}
            />
          </div>
        )}

        {/* ── Homepage content (hidden during results) ──────── */}
        {!hasSearched && (
          <div className="mt-8 space-y-6 animate-fade-up">
            {/* Popular routes */}
            <PopularRoutes
              lang={lang}
              onSelect={(_from, _to) => {
                // Selecting a popular route scrolls to form — the user then submits
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />

            {/* Promo banner */}
            <PromoBanner lang={lang} />

            {/* How it works */}
            <HowItWorks lang={lang} />

            {/* Recommendation legend */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 space-y-3">
              <p className="section-rule">
                {lang === "fr" ? "Nos recommandations" : "Our recommendations"}
              </p>
              <div className="space-y-2.5">
                {[
                  {
                    band: "bg-miles-band",
                    label: lang === "fr" ? "UTILISER LES MILES" : "USE MILES",
                    desc: lang === "fr" ? "La valeur de vos miles est supérieure au prix cash. Rachetez vos points !" : "Your miles value exceeds the cash price. Redeem your points!",
                    icon: "✈",
                  },
                  {
                    band: "bg-consider-band",
                    label: lang === "fr" ? "À CONSIDÉRER" : "CONSIDER",
                    desc: lang === "fr" ? "Valeur correcte. Bon choix selon votre programme et vos points disponibles." : "Decent value. Good choice depending on your program and available points.",
                    icon: "◎",
                  },
                  {
                    band: "bg-cash-band",
                    label: lang === "fr" ? "PAYER EN CASH" : "USE CASH",
                    desc: lang === "fr" ? "Le prix cash est plus avantageux. Gardez vos miles pour une meilleure occasion." : "Cash price is more advantageous. Save your miles for a better deal.",
                    icon: "◈",
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-20 px-2 py-1 rounded-lg ${item.band} flex items-center justify-center`}>
                      <span className="text-white text-[10px] font-black tracking-wide">{item.icon} {item.label.split(" ")[0]}</span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed flex-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {!hasSearched && <Footer lang={lang} />}
    </div>
  );
}
