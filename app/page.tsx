"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { FlightResult } from "@/lib/engine";
import { Header }        from "@/components/Header";
import { Footer }        from "@/components/Footer";
import { TrustBar }      from "@/components/TrustBar";
import { SearchForm }    from "@/components/SearchForm";
import { Results }       from "@/components/Results";
import { HowItWorks }    from "@/components/HowItWorks";
import { PromoBanner }   from "@/components/PromoBanner";
import { PopularRoutes } from "@/components/PopularRoutes";
import { DealsStrip }              from "@/components/DealsStrip";
import { DestinationsGrid }        from "@/components/DestinationsGrid";
import { MilesCalculatorWidget }   from "@/components/MilesCalculatorWidget";
import { RecentSearches } from "@/components/RecentSearches";
import { ShareButton }   from "@/components/ShareButton";
import { MultiDateCompare } from "@/components/MultiDateCompare";
import { PushNotifBanner } from "@/components/PushNotifBanner";
import { ErrorBoundary }  from "@/components/ErrorBoundary";
import { useProfile }    from "@/hooks/useProfile";
import { useCurrency }   from "@/hooks/useCurrency";
import { useGeo }        from "@/hooks/useGeo";
import { getRoutesForCountry, getRegionLabel } from "@/lib/geoRoutes";
import { trackPopularRoute, trackRecentSearch } from "@/lib/analytics";

export default function HomePage() {
  const { profile, isLoaded, setLang: saveLang, recordSearch } = useProfile();
  const { currency, setCurrency, formatPrice } = useCurrency();
  const country = useGeo();
  const geoRoutes = getRoutesForCountry(country);
  const geoLabel = getRegionLabel(country);

  const [lang,       setLang]       = useState<"fr" | "en">("fr");
  const [results,    setResults]    = useState<FlightResult[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [prefillFrom, setPrefillFrom] = useState<string | undefined>();
  const [prefillTo,   setPrefillTo]   = useState<string | undefined>();
  const [lastSearch, setLastSearch]   = useState<{from:string;to:string;date:string;cabin:string;tripType:"oneway"|"roundtrip"} | null>(null);
  const [sharedParams, setSharedParams] = useState<{date?:string;cabin?:"economy"|"premium"|"business"|"first";tripType?:"oneway"|"roundtrip";pax?:number} | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Restore language from profile
  useEffect(() => {
    if (isLoaded && profile?.lang) {
      setLang(profile.lang);
    }
  }, [isLoaded, profile?.lang]);

  // Read URL search params on mount to pre-fill shared search
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlFrom = params.get("from");
    const urlTo = params.get("to");
    if (urlFrom) setPrefillFrom(urlFrom);
    if (urlTo) setPrefillTo(urlTo);
    // Store extra params so SearchForm can be pre-filled via lastSearch
    const urlDate = params.get("date");
    const urlCabin = params.get("cabin");
    const urlTripType = params.get("tripType");
    const urlPax = params.get("pax");
    if (urlDate || urlCabin || urlTripType || urlPax) {
      setSharedParams({
        date: urlDate ?? undefined,
        cabin: urlCabin as "economy" | "premium" | "business" | "first" | undefined,
        tripType: (urlTripType as "oneway" | "roundtrip") ?? undefined,
        pax: urlPax ? parseInt(urlPax, 10) : undefined,
      });
    }
  }, []);

  const handleLangChange = useCallback((newLang: "fr" | "en") => {
    setLang(newLang);
    saveLang(newLang);
  }, [saveLang]);

  const handleResults = useCallback((r: FlightResult[]) => {
    setResults(r);
    setHasSearched(true);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

    // Record search in profile
    if (lastSearch && r.length > 0) {
      const best = r.reduce((a, b) => b.savings > a.savings ? b : a, r[0]);
      recordSearch({
        ...lastSearch,
        bestSavings: best.savings,
        recommendation: best.recommendation,
      });
    }
  }, [lastSearch, recordSearch]);

  const handleSearchStart = useCallback((params: {from:string;to:string;date:string;cabin:string;tripType:"oneway"|"roundtrip"}) => {
    setLastSearch(params);
  }, []);

  const handleBack = () => {
    setResults([]); setHasSearched(false);
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header lang={lang} onLangChange={handleLangChange} currency={currency} onCurrencyChange={setCurrency} />
      <TrustBar lang={lang} />

      {/* -- Deals du moment -- */}
      {!hasSearched && (
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6">
          <DealsStrip
            lang={lang}
            onDealClick={(from, to) => {
              setPrefillFrom(from);
              setPrefillTo(to);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </div>
      )}

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 pb-12">

        {/* -- Hero ------------------------------------------------- */}
        {!hasSearched && (
          <div className="pt-10 pb-8 text-center space-y-4 animate-fade-up max-w-2xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {lang === "fr" ? "Comparateur cash vs miles · Données en temps réel" : "Cash vs miles comparator · Real-time data"}
            </div>

            {/* Title */}
            <div className="space-y-1">
              <h1 className="text-4xl sm:text-5xl font-black leading-tight">
                <span className="bg-gradient-to-br from-blue-300 via-primary to-blue-500 bg-clip-text text-transparent">
                  {lang === "fr" ? "Cash ou miles ?" : "Cash or miles?"}
                </span>
                <br />
                <span className="text-fg">
                  {lang === "fr" ? "KEZA décide." : "KEZA decides."}
                </span>
              </h1>
              <p className="text-base text-muted max-w-lg mx-auto leading-relaxed">
                {lang === "fr"
                  ? "Comparez le vrai coût de chaque option — cash, miles ou transfert — sur chaque vol, partout dans le monde."
                  : "Compare the real cost of every option — cash, miles or transfer — on any flight, anywhere in the world."}
              </p>
            </div>
          </div>
        )}

        {/* -- Compact heading in results mode ---------------------- */}
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

        {/* -- Search form ------------------------------------------ */}
        <div className="animate-fade-up max-w-2xl mx-auto">
          <SearchForm
            onResults={handleResults}
            onLoading={setLoading}
            onSearchStart={handleSearchStart}
            lang={lang}
            initialFrom={prefillFrom}
            initialTo={prefillTo}
            savedPrograms={profile?.programs}
            savedCabin={sharedParams?.cabin ?? profile?.cabin}
            formatPrice={formatPrice}
            initialDate={sharedParams?.date}
            initialTripType={sharedParams?.tripType}
            initialPax={sharedParams?.pax}
          />
        </div>

        {/* -- Results ---------------------------------------------- */}
        {(hasSearched || loading) && (
          <div ref={resultsRef} className="mt-6">
            {hasSearched && !loading && lastSearch && (
              <div className="flex justify-end mb-3">
                <ShareButton
                  lang={lang}
                  searchParams={{
                    from: lastSearch.from,
                    to: lastSearch.to,
                    date: lastSearch.date,
                    cabin: lastSearch.cabin,
                    tripType: lastSearch.tripType,
                    pax: 1,
                  }}
                />
              </div>
            )}
            <ErrorBoundary lang={lang}>
              <Results
                results={results}
                loading={loading}
                lang={lang}
                onBack={handleBack}
                searchMeta={lastSearch ? { from: lastSearch.from, to: lastSearch.to, cabin: lastSearch.cabin } : undefined}
                formatPrice={formatPrice}
              />
            </ErrorBoundary>
            {hasSearched && !loading && results.length > 0 && lastSearch && (
              <div className="mt-4">
                <ErrorBoundary lang={lang}>
                  <MultiDateCompare
                    searchParams={{
                      from: lastSearch.from,
                      to: lastSearch.to,
                      cabin: lastSearch.cabin,
                      tripType: lastSearch.tripType,
                    }}
                    lang={lang}
                    formatPrice={formatPrice}
                  />
                </ErrorBoundary>
              </div>
            )}
          </div>
        )}

        {/* -- Homepage content (hidden during results) ------------- */}
        {!hasSearched && (
          <div className="mt-8 space-y-8 animate-fade-up">
            {/* Recent searches (from profile) */}
            {profile && profile.recentSearches.length > 0 && (
              <RecentSearches
                searches={profile.recentSearches}
                lang={lang}
                onSelect={(from, to) => {
                  trackRecentSearch(from, to);
                  setPrefillFrom(from);
                  setPrefillTo(to);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            )}

            {/* Destinations + Calculateur — side by side on desktop */}
            <div id="routes" className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Destinations (takes 2/3 on desktop) */}
              <div className="lg:col-span-2">
                <DestinationsGrid
                  lang={lang}
                  onSelect={(iata, city) => {
                    setPrefillTo(iata);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              </div>
              {/* Calculateur (takes 1/3 on desktop, full width on mobile) */}
              <div className="lg:col-span-1 lg:sticky lg:top-20">
                <MilesCalculatorWidget lang={lang} />
              </div>
            </div>

            {/* Promo banner */}
            <PromoBanner lang={lang} />

            {/* How it works */}
            <HowItWorks lang={lang} />

            {/* Recommendation legend */}
            <div className="bg-surface rounded-2xl border border-border p-5 space-y-3">
              <h2 className="section-rule">
                {lang === "fr" ? "Nos recommandations" : "Our recommendations"}
              </h2>
              <div className="space-y-2.5">
                {[
                  {
                    bg: "bg-primary/15",
                    text: "text-blue-400",
                    border: "border-primary/30",
                    label: lang === "fr" ? "MILES GAGNENT" : "MILES WIN",
                    desc: lang === "fr"
                      ? "La valeur de vos miles est supérieure au prix cash. Rachetez vos points !"
                      : "Your miles value exceeds the cash price. Redeem your points!",
                    icon: "✈",
                  },
                  {
                    bg: "bg-success/10",
                    text: "text-success",
                    border: "border-success/25",
                    label: lang === "fr" ? "SI TU AS LES MILES" : "IF YOU HAVE MILES",
                    desc: lang === "fr"
                      ? "Valeur correcte. Bon choix selon votre programme et vos points disponibles."
                      : "Decent value. Good choice depending on your program and available points.",
                    icon: "◎",
                  },
                  {
                    bg: "bg-warning/10",
                    text: "text-warning",
                    border: "border-warning/25",
                    label: lang === "fr" ? "CASH GAGNE" : "CASH WINS",
                    desc: lang === "fr"
                      ? "Le prix cash est plus avantageux. Gardez vos miles pour une meilleure occasion."
                      : "Cash price is more advantageous. Save your miles for a better deal.",
                    icon: "◈",
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className={`flex-shrink-0 px-2.5 py-1 rounded-lg ${item.bg} border ${item.border} flex items-center justify-center`}>
                      <span className={`${item.text} text-[10px] font-black tracking-wide whitespace-nowrap`}>{item.icon} {item.label.split(" ")[0]}</span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed flex-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* -- Push notification banner -------------------------------- */}
        <div className="mt-6">
          <PushNotifBanner lang={lang} />
        </div>
      </main>

      {!hasSearched && <Footer lang={lang} />}
    </div>
  );
}
