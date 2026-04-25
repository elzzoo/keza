"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchForm } from "@/components/SearchForm";
import { Results } from "@/components/Results";
import { PriceAlertForm } from "@/components/PriceAlertForm";
import type { FlightResult } from "@/lib/engine";
import { airportsMap } from "@/data/airports";

// ─── RouteMeta interface (sourced from @/data/routeMeta when available) ──────

interface RouteMeta {
  durationMin: number;
  airlines: string[];
  bestPrograms: string[];
  seasonTip: { fr: string; en: string };
  milesToEconomy: number;
  milesToBusiness: number;
  isNonstop: boolean;
  hub?: string;
}

// ─── Props ───────────────────────────────────────────────────────────────────

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
  routeMeta?: RouteMeta;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

function formatMiles(miles: number): string {
  // Format as "~25 000" style (space-separated thousands, French convention)
  return "~" + miles.toLocaleString("fr-FR");
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RoutePageClient({
  from, to, fromCity, fromCityFr, toCity, toCityFr,
  fromFlag, toFlag, cheapestPrice, cheapestDate, priceCount,
  relatedRoutes, routeMeta,
}: Props) {
  const [lang, setLang] = useState<"fr" | "en">("fr");
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
                  ? "KEZA calcule si vos miles valent plus que le prix cash — en temps réel."
                  : "KEZA calculates whether your miles are worth more than cash — in real time."
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

        {/* SEO editorial content — shown before any search */}
        {!hasSearched && (
          <div className="space-y-8 mt-4">

            {/* ── Route Analysis ── */}
            {routeMeta && (
              <div className="bg-surface rounded-2xl border border-border p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-fg uppercase tracking-wide">
                    {fr ? "Analyse de la route" : "Route analysis"}
                  </h2>
                  <span className="text-sm font-semibold text-muted">
                    {from} → {to}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Duration */}
                  <div className="flex items-start gap-3 rounded-xl bg-surface-2 border border-border px-4 py-3">
                    <span className="text-lg mt-0.5">✈</span>
                    <div>
                      <p className="text-xs text-muted uppercase tracking-wider mb-0.5">
                        {fr ? "Durée" : "Duration"}
                      </p>
                      <p className="text-sm font-semibold text-fg">
                        {formatDuration(routeMeta.durationMin)}
                        {" · "}
                        {routeMeta.isNonstop
                          ? (fr ? "Direct" : "Nonstop")
                          : (fr ? "Avec escale" : "With stop")
                        }
                      </p>
                    </div>
                  </div>

                  {/* Airlines */}
                  <div className="flex items-start gap-3 rounded-xl bg-surface-2 border border-border px-4 py-3">
                    <span className="text-lg mt-0.5">🏢</span>
                    <div>
                      <p className="text-xs text-muted uppercase tracking-wider mb-0.5">
                        {fr ? "Compagnies" : "Airlines"}
                      </p>
                      <p className="text-sm font-semibold text-fg">
                        {routeMeta.airlines.join(", ")}
                      </p>
                    </div>
                  </div>

                  {/* Best programs */}
                  <div className="flex items-start gap-3 rounded-xl bg-surface-2 border border-border px-4 py-3">
                    <span className="text-lg mt-0.5">⭐</span>
                    <div>
                      <p className="text-xs text-muted uppercase tracking-wider mb-0.5">
                        {fr ? "Meilleurs programmes" : "Best programs"}
                      </p>
                      <p className="text-sm font-semibold text-fg">
                        {routeMeta.bestPrograms.join(" · ")}
                      </p>
                    </div>
                  </div>

                  {/* Season tip */}
                  <div className="flex items-start gap-3 rounded-xl bg-surface-2 border border-border px-4 py-3">
                    <span className="text-lg mt-0.5">📅</span>
                    <div>
                      <p className="text-xs text-muted uppercase tracking-wider mb-0.5">
                        {fr ? "Meilleure période" : "Best season"}
                      </p>
                      <p className="text-sm font-semibold text-fg">
                        {fr ? routeMeta.seasonTip.fr : routeMeta.seasonTip.en}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Combien de miles faut-il ? ── */}
            {routeMeta && (
              <div className="bg-surface rounded-2xl border border-border p-5 space-y-4">
                <h2 className="text-lg font-bold text-fg">
                  {fr
                    ? "Combien de miles faut-il ?"
                    : "How many miles do you need?"
                  }
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-muted font-medium pb-2 pr-4">
                          {fr ? "Classe" : "Cabin"}
                        </th>
                        <th className="text-left text-muted font-medium pb-2 pr-4">
                          {fr ? "Miles (approx)" : "Miles (approx)"}
                        </th>
                        <th className="text-left text-muted font-medium pb-2">
                          {fr ? "vs Cash" : "vs Cash"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="py-3 pr-4 font-semibold text-fg">
                          {fr ? "Économique" : "Economy"}
                        </td>
                        <td className="py-3 pr-4 font-mono text-primary font-bold">
                          {formatMiles(routeMeta.milesToEconomy)}{" "}
                          <span className="text-muted font-normal">miles</span>
                        </td>
                        <td className="py-3 text-muted text-xs">
                          {fr ? "Lancez une recherche ↑" : "Search above ↑"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 pr-4 font-semibold text-fg">
                          {fr ? "Business" : "Business"}
                        </td>
                        <td className="py-3 pr-4 font-mono text-primary font-bold">
                          {formatMiles(routeMeta.milesToBusiness)}{" "}
                          <span className="text-muted font-normal">miles</span>
                        </td>
                        <td className="py-3 text-muted text-xs">
                          {fr ? "Lancez une recherche ↑" : "Search above ↑"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-xs text-muted border-t border-border pt-3">
                  {fr
                    ? "Ces chiffres sont des estimations. Lancez une recherche pour voir la valeur exacte de vos miles sur cette route."
                    : "These figures are estimates. Run a search to see the exact value of your miles on this route."
                  }
                </p>
              </div>
            )}

            {/* ── Nonstop or via hub? ── */}
            {routeMeta && (
              <div className="bg-surface rounded-2xl border border-border p-5 space-y-2">
                <h2 className="text-lg font-bold text-fg">
                  {fr ? "Nonstop ou escale ?" : "Nonstop or via a hub?"}
                </h2>
                <p className="text-sm text-muted leading-relaxed">
                  {routeMeta.isNonstop
                    ? (fr
                        ? `Des vols directs existent sur ${displayFromCity} → ${displayToCity}. Un vol sans escale vous fait gagner du temps et simplifie l'utilisation de miles.`
                        : `Nonstop flights exist on ${displayFromCity} → ${displayToCity}. Flying direct saves time and often simplifies miles redemptions.`
                      )
                    : (fr
                        ? `Il n'existe pas de vol direct sur ${displayFromCity} → ${displayToCity}. La plupart des itinéraires transitent par${routeMeta.hub ? ` ${routeMeta.hub}` : " un hub"}. Pensez à vérifier la disponibilité de miles sur chaque segment séparément.`
                        : `There are no nonstop flights on ${displayFromCity} → ${displayToCity}. Most itineraries connect through${routeMeta.hub ? ` ${routeMeta.hub}` : " a hub"}. Consider checking miles availability on each segment separately.`
                      )
                  }
                </p>
              </div>
            )}

            {/* ── General info section ── */}
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

            {/* ── Tips ── */}
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
                {/* Route-specific season tip */}
                {routeMeta && (
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">✦</span>
                    {fr ? routeMeta.seasonTip.fr : routeMeta.seasonTip.en}
                  </li>
                )}
              </ul>
            </div>

            {/* ── Price alert ── */}
            <div>
              <h2 className="section-rule mb-4">
                {fr ? "Suivre ce vol" : "Track this flight"}
              </h2>
              <PriceAlertForm
                from={from}
                to={to}
                cabin="economy"
                currentPrice={cheapestPrice ?? 500}
                lang={lang}
              />
            </div>

            {/* ── Related routes ── */}
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
