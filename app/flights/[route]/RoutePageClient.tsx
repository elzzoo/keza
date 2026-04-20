"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchForm } from "@/components/SearchForm";
import { Results } from "@/components/Results";
import type { FlightResult } from "@/lib/engine";
import { airportsMap } from "@/data/airports";

interface Props {
  from: string;
  to: string;
  fromCity: string;
  fromCityFr: string;
  toCity: string;
  toCityFr: string;
  fromFlag: string;
  toFlag: string;
  cheapestPrice: number | null;
  cheapestDate: string | null;
  priceCount: number;
  relatedRoutes: string[];
}

export function RoutePageClient({
  from, to, fromCity, fromCityFr, toCity, toCityFr,
  fromFlag, toFlag, cheapestPrice, cheapestDate, priceCount,
  relatedRoutes,
}: Props) {
  const [lang, setLang] = useState<"fr" | "en">("en");
  const [results, setResults] = useState<FlightResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const fr = lang === "fr";

  const handleResults = (r: FlightResult[]) => {
    setResults(r);
    setHasSearched(true);
  };

  function routeLabel(route: string): string {
    const [f, t] = route.split("-");
    const fa = airportsMap[f];
    const ta = airportsMap[t];
    const fc = fr ? (fa?.city ?? f) : (fa?.cityEn ?? f);
    const tc = fr ? (ta?.city ?? t) : (ta?.cityEn ?? t);
    return `${fc} → ${tc}`;
  }

  const displayFromCity = fr ? fromCityFr : fromCity;
  const displayToCity = fr ? toCityFr : toCity;

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header lang={lang} onLangChange={setLang} />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pb-12">
        {/* Breadcrumb */}
        <nav className="pt-4 pb-2 text-xs text-muted">
          <Link href="/" className="hover:text-fg transition-colors">KEZA</Link>
          <span className="mx-1.5">/</span>
          <span className="text-fg">{from} → {to}</span>
        </nav>

        {/* Hero */}
        <div className="pt-4 pb-8 space-y-4">
          <div className="flex items-center gap-3">
            {fromFlag && <span className="text-3xl">{fromFlag}</span>}
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-fg leading-tight">
                {fr
                  ? `Vols ${displayFromCity} → ${displayToCity}`
                  : `Flights ${displayFromCity} → ${displayToCity}`
                }
              </h1>
              <p className="text-sm text-muted mt-1">
                {fr
                  ? `Comparez cash vs miles sur ${from} → ${to}. Trouvez la meilleure option.`
                  : `Compare cash vs miles on ${from} → ${to}. Find the smartest way to book.`
                }
              </p>
            </div>
            {toFlag && <span className="text-3xl ml-auto">{toFlag}</span>}
          </div>

          {/* Price summary card */}
          {cheapestPrice && (
            <div className="bg-surface rounded-2xl border border-border p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 text-xl font-black">
                $
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted">
                  {fr ? "Prix le plus bas trouvé" : "Lowest price found"}
                </p>
                <p className="text-2xl font-black text-fg">
                  ${cheapestPrice}
                  <span className="text-sm font-normal text-muted ml-2">
                    {fr ? "à partir du" : "from"}{" "}
                    {cheapestDate && new Date(cheapestDate + "T12:00:00").toLocaleDateString(
                      fr ? "fr-FR" : "en-US",
                      { day: "numeric", month: "short" }
                    )}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-subtle">
                  {priceCount} {fr ? "dates analysées" : "dates analyzed"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Search form (pre-filled) */}
        <div className="mb-6">
          <SearchForm
            onResults={handleResults}
            onLoading={setLoading}
            lang={lang}
            initialFrom={from}
            initialTo={to}
          />
        </div>

        {/* Results */}
        {(hasSearched || loading) && (
          <div className="mb-8">
            <Results
              results={results}
              loading={loading}
              lang={lang}
              onBack={() => { setResults([]); setHasSearched(false); }}
            />
          </div>
        )}

        {/* SEO content */}
        {!hasSearched && (
          <div className="space-y-8 mt-4">
            {/* Info section */}
            <div className="bg-surface rounded-2xl border border-border p-5 space-y-4">
              <h2 className="text-lg font-bold text-fg">
                {fr
                  ? `Comment économiser sur ${displayFromCity} → ${displayToCity}`
                  : `How to save on ${displayFromCity} → ${displayToCity}`
                }
              </h2>
              <div className="space-y-3 text-sm text-muted leading-relaxed">
                <p>
                  {fr
                    ? `KEZA compare automatiquement le prix cash et le coût en miles pour ${displayFromCity} → ${displayToCity}. Nous analysons 46 programmes de fidélité et vérifions si un transfert de points bancaires (Amex MR, Chase UR, Citi ThankYou) serait moins cher.`
                    : `KEZA automatically compares the cash price and miles cost for ${displayFromCity} → ${displayToCity}. We analyze 46 loyalty programs and check if transferring bank points (Amex MR, Chase UR, Citi ThankYou) would be cheaper.`
                  }
                </p>
                <p>
                  {fr
                    ? "Notre calendrier de prix vous montre les jours les moins chers du mois — plus besoin de deviner."
                    : "Our price calendar shows you the cheapest days of the month — no more guessing."
                  }
                </p>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-surface rounded-2xl border border-border p-5 space-y-3">
              <h2 className="text-lg font-bold text-fg">
                {fr ? "Astuces pour cette route" : "Tips for this route"}
              </h2>
              <ul className="space-y-2 text-sm text-muted">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✦</span>
                  {fr
                    ? "Utilisez le calendrier de prix pour trouver les jours les moins chers"
                    : "Use the price calendar to find the cheapest days"
                  }
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✦</span>
                  {fr
                    ? "Renseignez vos programmes miles pour des recommandations personnalisées"
                    : "Enter your miles programs for personalized recommendations"
                  }
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✦</span>
                  {fr
                    ? "Comparez les classes (Éco, Business, First) — les économies en miles sont souvent plus grandes en Business"
                    : "Compare cabins (Eco, Business, First) — miles savings are often bigger in Business"
                  }
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✦</span>
                  {fr
                    ? "Vérifiez les transferts de points bancaires — parfois plus avantageux que l'achat direct"
                    : "Check bank point transfers — sometimes cheaper than buying miles directly"
                  }
                </li>
              </ul>
            </div>

            {/* Related routes */}
            {relatedRoutes.length > 0 && (
              <div>
                <h2 className="section-rule mb-3">
                  {fr ? "Routes similaires" : "Related routes"}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {relatedRoutes.map(route => {
                    const [rf, rt] = route.split("-");
                    const rfa = airportsMap[rf];
                    const rta = airportsMap[rt];
                    return (
                      <Link
                        key={route}
                        href={`/flights/${route}`}
                        className="bg-surface-2 border border-border rounded-xl px-4 py-3 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                      >
                        <div className="flex items-center gap-1.5 text-sm">
                          {rfa?.flag && <span>{rfa.flag}</span>}
                          <span className="font-bold text-fg">{rf}</span>
                          <span className="text-subtle group-hover:text-primary">→</span>
                          <span className="font-bold text-fg">{rt}</span>
                          {rta?.flag && <span>{rta.flag}</span>}
                        </div>
                        <p className="text-[11px] text-muted mt-0.5 truncate">
                          {routeLabel(route)}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer lang={lang} />
    </div>
  );
}
