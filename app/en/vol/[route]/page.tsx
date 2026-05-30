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
import { PriceHeatmap } from "@/components/PriceHeatmap";

export const revalidate = 86400;

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

  const fromCity = fromApt.cityEn ?? fromApt.city;
  const toCity   = toApt.cityEn   ?? toApt.city;
  const title    = `${fromCity} to ${toCity} Flights — Cash or Miles? | KEZA`;
  const description =
    `Compare cash price vs miles on ${from}→${to} (${fromCity}–${toCity}). ` +
    `${meta.airlines.slice(0, 2).join(", ")} · Best programs: ${meta.bestPrograms.slice(0, 2).join(", ")}. ` +
    (meta.seasonTip.en ?? meta.seasonTip.fr).slice(0, 100) + "…";

  const ogUrl    = `${SITE_URL}/api/og?from=${from}&to=${to}&lang=en`;
  const canonical = `${SITE_URL}/en/vol/${route}`;
  const frUrl     = `${SITE_URL}/vol/${route}`;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: { fr: frUrl, en: canonical },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "KEZA",
      locale: "en_US",
      type: "website",
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `${fromCity} to ${toCity} flights` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

export default async function EnRoutePage(
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

  const fromCity    = fromApt.cityEn   ?? fromApt.city;
  const toCity      = toApt.cityEn     ?? toApt.city;
  const fromCountry = fromApt.countryEn ?? fromApt.country;
  const toCountry   = toApt.countryEn  ?? toApt.country;
  const fromFlag    = fromApt.flag;
  const toFlag      = toApt.flag;
  const searchUrl   = `/en/?from=${from}&to=${to}`;
  const seasonTip   = meta.seasonTip.en ?? meta.seasonTip.fr;

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Flights", item: `${SITE_URL}/en/vol` },
          { "@type": "ListItem", position: 3, name: `${fromCity} → ${toCity}`, item: `${SITE_URL}/en/vol/${route}` },
        ],
      },
      {
        "@type": "Product",
        name: `${fromCity} to ${toCity} Flights`,
        description: `Cash vs miles comparison for ${from}→${to}. Best programs: ${meta.bestPrograms.join(", ")}.`,
        brand: { "@type": "Brand", name: "KEZA" },
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `Should I pay cash or use miles for ${fromCity} to ${toCity}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `It depends on the program and dates. KEZA compares all options — cash prices, miles redemptions (best programs: ${meta.bestPrograms.slice(0, 3).join(", ")}), and credit card point transfers — to find the cheapest option.`,
            },
          },
          {
            "@type": "Question",
            name: `How many miles do I need to fly from ${fromCity} to ${toCity}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `In economy, expect around ${meta.milesToEconomy.toLocaleString("en-US")} miles one-way, and ${meta.milesToBusiness.toLocaleString("en-US")} miles in business class. Best programs on this route: ${meta.bestPrograms.join(", ")}.`,
            },
          },
          {
            "@type": "Question",
            name: `What is the best time to fly from ${fromCity} to ${toCity}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: seasonTip,
            },
          },
          {
            "@type": "Question",
            name: `Are there direct flights between ${fromCity} and ${toCity}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: meta.isNonstop
                ? `Yes, nonstop flights are available between ${fromCity} and ${toCity} with ${meta.airlines.join(", ")}.`
                : `Flights between ${fromCity} and ${toCity} typically connect via ${meta.hub ?? "a major hub"}. Airlines include ${meta.airlines.join(", ")}.`,
            },
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-bg">
      <JsonLd data={structuredData} />

      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/en" className="font-black text-lg">
            <span className="text-primary">KE</span>
            <span className="text-fg">ZA</span>
          </Link>
          <Link
            href={searchUrl}
            className="text-xs font-semibold px-4 py-2 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Compare this flight →
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider">
          <Link href="/en" className="hover:text-fg transition-colors">Home</Link>
          <span>›</span>
          <span>Flights</span>
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
            <span className="text-muted text-xl font-semibold">Cash or Miles?</span>
          </h1>

          <p className="text-muted text-base leading-relaxed max-w-2xl">
            Compare the true cost of {from}→{to} flights between {fromCity} ({fromCountry}) and {toCity} ({toCountry}) —
            live cash prices vs the value of your miles on {meta.bestPrograms.slice(0, 2).join(", ")} and more.
          </p>

          <Link
            href={searchUrl}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all hover:scale-[1.02] shadow-lg shadow-primary/20"
          >
            ✈ Compare cash vs miles now
          </Link>
        </div>

        {/* Route stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Flight time",      value: formatDuration(meta.durationMin),             icon: "⏱" },
            { label: "Nonstop",          value: meta.isNonstop ? "Yes ✓" : `Via ${meta.hub ?? "hub"}`, icon: "✈" },
            { label: "Economy (miles)",  value: meta.milesToEconomy.toLocaleString("en-US"),  icon: "💺" },
            { label: "Business (miles)", value: meta.milesToBusiness.toLocaleString("en-US"), icon: "🛋" },
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
              Main airlines
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
              Best miles programs
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
            <h2 className="text-sm font-bold text-fg mb-1">Best time to fly</h2>
            <p className="text-sm text-muted leading-relaxed">{seasonTip}</p>
          </div>
        </div>

        {/* Miles explainer */}
        <div className="bg-surface rounded-2xl border border-border p-5 space-y-4">
          <h2 className="text-sm font-black text-fg">
            How to use miles on {fromCity} → {toCity}?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-muted leading-relaxed">
            <div>
              <p className="font-semibold text-fg mb-1">💺 Economy</p>
              <p>
                Expect around{" "}
                <strong className="text-fg">{meta.milesToEconomy.toLocaleString("en-US")} miles</strong>{" "}
                one-way with the best programs.
                KEZA automatically compares all taxes and fees.
              </p>
            </div>
            <div>
              <p className="font-semibold text-fg mb-1">🛋 Business / First</p>
              <p>
                From{" "}
                <strong className="text-fg">{meta.milesToBusiness.toLocaleString("en-US")} miles</strong>{" "}
                one-way — often 4–8× more value per mile than economy.
              </p>
            </div>
          </div>
        </div>

        <CheapestDatesCalendar from={from} to={to} lang="en" />

        {/* 6-month price heatmap */}
        <PriceHeatmap from={from} to={to} lang="en" />

        {/* Price history sparkline */}
        <PriceSparkline from={from} to={to} lang="en" />

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
                fromCity: fApt?.cityEn ?? fApt?.city ?? f,
                toCity: tApt?.cityEn ?? tApt?.city ?? t,
              };
            });
          if (related.length === 0) return null;
          return (
            <div className="space-y-3">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-muted">Similar routes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {related.map(r => (
                  <Link
                    key={r.slug}
                    href={`/en/vol/${r.slug}`}
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
            Ready to compare {fromCity} → {toCity}?
          </p>
          <p className="text-sm text-muted">
            KEZA pulls live prices and tells you whether your miles are worth more than the cash price.
          </p>
          <Link
            href={searchUrl}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all hover:scale-[1.02] shadow-lg shadow-primary/20"
          >
            ✈ Compare now — free
          </Link>
        </div>

        {/* FR version link */}
        <p className="text-center text-xs text-subtle">
          <Link href={`/vol/${route}`} className="hover:text-muted transition-colors">
            Voir la version française →
          </Link>
        </p>
      </main>

      <footer className="border-t border-border mt-12 py-8 text-center text-xs text-muted">
        <Link href="/en" className="hover:text-fg transition-colors">KEZA</Link>
        {" · "}Cash or Miles?{" · "}
        <Link href={searchUrl} className="hover:text-fg transition-colors">
          Search {from}→{to}
        </Link>
      </footer>
    </div>
  );
}
