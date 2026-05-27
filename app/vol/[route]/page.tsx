import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ROUTE_META } from "@/data/routeMeta";
import { AIRPORTS } from "@/data/airports";
import { slugToIata, iataToSlug, routeKey } from "@/lib/routeSlug";
import { SITE_URL } from "@/lib/siteConfig";
import { JsonLd } from "@/components/JsonLd";
import { RouteAlertCta } from "@/components/RouteAlertCta";
import { PriceSparkline } from "@/components/PriceSparkline";
import { CheapestDatesCalendar } from "@/components/CheapestDatesCalendar";

// ISR: revalidate every 24h — route metadata rarely changes
export const revalidate = 86400;

// Pre-generate all routes present in ROUTE_META at build time
export function generateStaticParams() {
  return Array.from(ROUTE_META.keys()).map(key => {
    const [from, to] = key.split("-");
    return { route: iataToSlug(from!, to!) };
  });
}

function getAirport(code: string) {
  return AIRPORTS.find(a => a.code === code);
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
}

export async function generateMetadata(
  { params }: { params: Promise<{ route: string }> }
): Promise<Metadata> {
  const { route } = await params;
  const iata = slugToIata(route);
  if (!iata) return {};

  const { from, to } = iata;
  const meta    = ROUTE_META.get(routeKey(from, to));
  const fromApt = getAirport(from);
  const toApt   = getAirport(to);
  if (!meta || !fromApt || !toApt) return {};

  const fromCity = fromApt.city;
  const toCity   = toApt.city;
  const title    = `Vols ${fromCity} → ${toCity} — Cash ou Miles ? | KEZA`;
  const description =
    `Comparez prix cash vs miles sur le vol ${from}→${to} (${fromCity}–${toCity}). ` +
    `${meta.airlines.slice(0, 2).join(", ")} · Meilleurs programmes : ${meta.bestPrograms.slice(0, 2).join(", ")}. ` +
    meta.seasonTip.fr.slice(0, 100) + "…";

  const ogUrl    = `${SITE_URL}/api/og?from=${from}&to=${to}&lang=fr`;
  const canonical = `${SITE_URL}/vol/${route}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "KEZA",
      locale: "fr_FR",
      type: "website",
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `Vol ${fromCity} → ${toCity}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

export default async function RoutePage(
  { params }: { params: Promise<{ route: string }> }
) {
  const { route } = await params;
  const iata = slugToIata(route);
  if (!iata) notFound();

  const { from, to } = iata;
  const meta    = ROUTE_META.get(routeKey(from, to));
  const fromApt = getAirport(from);
  const toApt   = getAirport(to);
  if (!meta || !fromApt || !toApt) notFound();

  const fromCity    = fromApt.city;
  const toCity      = toApt.city;
  const fromCountry = fromApt.country;
  const toCountry   = toApt.country;
  const fromFlag    = fromApt.flag;
  const toFlag      = toApt.flag;
  const searchUrl   = `/?from=${from}&to=${to}`;

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Vols", item: `${SITE_URL}/vol` },
          { "@type": "ListItem", position: 3, name: `${fromCity} → ${toCity}`, item: `${SITE_URL}/vol/${route}` },
        ],
      },
      {
        "@type": "Product",
        name: `Vol ${fromCity} → ${toCity}`,
        description: `Comparaison cash vs miles pour le vol ${from}→${to}. Meilleurs programmes : ${meta.bestPrograms.join(", ")}.`,
        brand: { "@type": "Brand", name: "KEZA" },
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Inject JSON-LD after hydration */}
      <JsonLd data={structuredData} />

      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-black text-lg">
            <span className="text-primary">KE</span>
            <span className="text-fg">ZA</span>
          </Link>
          <Link
            href={searchUrl}
            className="text-xs font-semibold px-4 py-2 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Comparer ce vol →
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider">
          <Link href="/" className="hover:text-fg transition-colors">Accueil</Link>
          <span>›</span>
          <span>Vols</span>
          <span>›</span>
          <span>{from}–{to}</span>
        </nav>

        {/* Hero */}
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-4xl font-black text-fg leading-tight">
            <span className="text-2xl mr-2">{fromFlag}</span>
            {fromCity}
            <span className="text-primary mx-3">→</span>
            <span className="text-2xl mr-2">{toFlag}</span>
            {toCity}
            <br />
            <span className="text-muted text-xl font-semibold">Cash ou Miles ?</span>
          </h1>

          <p className="text-muted text-base leading-relaxed max-w-2xl">
            Comparez le vrai coût du vol {from}→{to} entre {fromCity} ({fromCountry}) et {toCity} ({toCountry}) —
            prix cash en temps réel vs valeur de vos miles sur {meta.bestPrograms.slice(0, 2).join(", ")} et plus.
          </p>

          <Link
            href={searchUrl}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all hover:scale-[1.02] shadow-lg shadow-primary/20"
          >
            ✈ Comparer cash vs miles maintenant
          </Link>
        </div>

        {/* Route stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Durée vol",       value: formatDuration(meta.durationMin),              icon: "⏱" },
            { label: "Vol direct",      value: meta.isNonstop ? "Oui ✓" : `Via ${meta.hub ?? "hub"}`, icon: "✈" },
            { label: "Éco (miles)",     value: meta.milesToEconomy.toLocaleString("fr-FR"),   icon: "💺" },
            { label: "Business (miles)",value: meta.milesToBusiness.toLocaleString("fr-FR"),  icon: "🛋" },
          ].map(stat => (
            <div key={stat.label} className="bg-surface rounded-xl border border-border p-4 text-center">
              <div className="text-xl mb-1">{stat.icon}</div>
              <div className="text-lg font-black text-fg">{stat.value}</div>
              <div className="text-[11px] text-muted mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Airlines + Programs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-surface rounded-2xl border border-border p-5 space-y-3">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-muted">
              Compagnies principales
            </h2>
            <ul className="space-y-2">
              {meta.airlines.map(airline => (
                <li key={airline} className="flex items-center gap-2 text-sm text-fg font-medium">
                  <span className="text-primary text-base">✈</span>
                  {airline}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-surface rounded-2xl border border-border p-5 space-y-3">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-muted">
              Meilleurs programmes miles
            </h2>
            <ul className="space-y-2">
              {meta.bestPrograms.map((prog, i) => (
                <li key={prog} className="flex items-center gap-2 text-sm font-medium">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                    i === 0 ? "bg-warning/20 text-warning" :
                    i === 1 ? "bg-primary/15 text-blue-400" :
                              "bg-surface-2 text-muted"
                  }`}>
                    {i + 1}
                  </span>
                  <span className={i === 0 ? "text-fg" : "text-muted"}>{prog}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Season tip */}
        <div className="bg-primary/8 rounded-2xl border border-primary/15 p-5 flex items-start gap-4">
          <span className="text-2xl flex-shrink-0 mt-0.5">📅</span>
          <div>
            <h2 className="text-sm font-bold text-fg mb-1">Meilleure période pour voyager</h2>
            <p className="text-sm text-muted leading-relaxed">{meta.seasonTip.fr}</p>
          </div>
        </div>

        {/* Miles explainer */}
        <div className="bg-surface rounded-2xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-black text-fg">
            Comment utiliser vos miles sur {fromCity} → {toCity} ?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-muted leading-relaxed">
            <div>
              <p className="font-semibold text-fg mb-1">💺 Classe économique</p>
              <p>
                Comptez environ{" "}
                <strong className="text-fg">{meta.milesToEconomy.toLocaleString("fr-FR")} miles</strong>{" "}
                aller simple avec les meilleurs programmes.
                KEZA compare automatiquement les taxes et frais.
              </p>
            </div>
            <div>
              <p className="font-semibold text-fg mb-1">🛋 Business / Première</p>
              <p>
                À partir de{" "}
                <strong className="text-fg">{meta.milesToBusiness.toLocaleString("fr-FR")} miles</strong>{" "}
                aller simple — souvent 4–8× plus de valeur par mile qu&apos;en économique.
              </p>
            </div>
          </div>
        </div>

        <CheapestDatesCalendar from={from} to={to} lang="fr" />

        {/* Price history sparkline */}
        <PriceSparkline from={from} to={to} lang="fr" />

        {/* Alert CTA */}
        <RouteAlertCta from={from} to={to} fromCity={fromCity} toCity={toCity} />

        {/* Related routes */}
        {(() => {
          const related = Array.from(ROUTE_META.entries())
            .filter(([k]) => {
              if (k === routeKey(from, to)) return false;
              const [f, t] = k.split("-");
              return f === from || t === to;
            })
            .slice(0, 6)
            .map(([k]) => {
              const [f, t] = k.split("-");
              const fApt = AIRPORTS.find(a => a.code === f);
              const tApt = AIRPORTS.find(a => a.code === t);
              return {
                slug: iataToSlug(f!, t!),
                fromFlag: fApt?.flag ?? "",
                toFlag: tApt?.flag ?? "",
                fromCity: fApt?.city ?? f,
                toCity: tApt?.city ?? t,
              };
            });
          if (related.length === 0) return null;
          return (
            <div className="space-y-3">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-muted">Routes similaires</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {related.map(r => (
                  <Link
                    key={r.slug}
                    href={`/vol/${r.slug}`}
                    className="group flex items-center gap-2 px-4 py-3 bg-surface rounded-xl border border-border hover:border-primary/30 hover:bg-surface-2 transition-all text-sm"
                  >
                    <span>{r.fromFlag}</span>
                    <span className="font-semibold text-fg">{r.fromCity}</span>
                    <span className="text-primary">→</span>
                    <span>{r.toFlag}</span>
                    <span className="font-semibold text-fg">{r.toCity}</span>
                    <span className="ml-auto text-[10px] text-muted group-hover:text-primary">→</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Bottom CTA */}
        <div className="bg-gradient-to-br from-primary/10 to-surface rounded-2xl border border-primary/20 p-6 text-center space-y-3">
          <p className="text-lg font-black text-fg">
            Prêt à comparer {fromCity} → {toCity} ?
          </p>
          <p className="text-sm text-muted">
            KEZA récupère les prix en temps réel et calcule si vos miles valent plus que le prix cash.
          </p>
          <Link
            href={searchUrl}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all hover:scale-[1.02] shadow-lg shadow-primary/20"
          >
            ✈ Comparer maintenant — gratuit
          </Link>
        </div>
      </main>

      <footer className="border-t border-border mt-12 py-8 text-center text-xs text-muted">
        <Link href="/" className="hover:text-fg transition-colors">KEZA</Link>
        {" · "}Cash ou Miles ?{" · "}
        <Link href={searchUrl} className="hover:text-fg transition-colors">
          Rechercher {from}→{to}
        </Link>
      </footer>
    </div>
  );
}
