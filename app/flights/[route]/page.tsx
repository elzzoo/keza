import { Metadata } from "next";
import { notFound } from "next/navigation";
import { airportsMap } from "@/data/airports";
import { fetchCalendarPrices } from "@/lib/engine";
import { RoutePageClient } from "./RoutePageClient";
import { SITE_URL } from "@/lib/siteConfig";

// ─── ISR Revalidation ───────────────────────────────────────────────────────
// Revalidate every 6 hours — prices refresh without full rebuild
export const revalidate = 21600;
// Allow rendering unknown routes on-demand (not in generateStaticParams)
export const dynamicParams = true;

// ─── Types ──────────────────────────────────────────────────────────────────

interface Props {
  params: { route: string };
}

// ─── Parse route param (DSS-CDG → { from: "DSS", to: "CDG" }) ──────────────

function parseRoute(route: string): { from: string; to: string } | null {
  const match = route.match(/^([A-Z]{3})-([A-Z]{3})$/i);
  if (!match) return null;
  const from = match[1].toUpperCase();
  const to = match[2].toUpperCase();
  if (from === to) return null;
  return { from, to };
}

// ─── Static generation for popular routes ───────────────────────────────────

const POPULAR_ROUTES = [
  // Africa ↔ Europe
  "DSS-CDG", "ABJ-CDG", "LOS-LHR", "CMN-CDG", "NBO-CDG", "ACC-LHR",
  "JNB-LHR", "CAI-CDG", "ADD-DXB", "DSS-IST", "ABJ-IST", "CMN-JFK",
  "LOS-ATL", "NBO-DXB",
  // North America ↔ Europe
  "JFK-LHR", "CDG-JFK", "LAX-CDG", "JFK-AMS", "ORD-LHR", "BOS-LHR",
  "MIA-MAD",
  // North America ↔ Asia
  "JFK-NRT", "LAX-NRT", "SFO-NRT", "LAX-BKK", "LAX-SIN", "YYZ-LHR",
  // Europe ↔ Asia
  "LHR-SIN", "CDG-NRT", "LHR-DXB", "LHR-BKK", "CDG-BKK", "FRA-SIN",
  "LHR-HKG",
  // Middle East hub routes
  "DXB-LHR", "DXB-JFK", "DOH-LHR", "DOH-JFK", "IST-JFK",
  // Asia-Pacific
  "SIN-SYD", "SIN-NRT", "HKG-LHR", "SYD-LHR",
  // Latin America
  "MIA-BOG", "GRU-LHR", "GRU-CDG", "EZE-MAD", "SCL-MIA", "BOG-MAD",
];

export async function generateStaticParams() {
  return POPULAR_ROUTES.map(route => ({ route }));
}

// ─── Metadata ───────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const parsed = parseRoute(params.route);
  if (!parsed) return { title: "Route not found — KEZA" };

  const fromAirport = airportsMap[parsed.from];
  const toAirport = airportsMap[parsed.to];
  const fromCityFrMeta = fromAirport?.city ?? fromAirport?.cityEn ?? parsed.from;
  const toCityFrMeta = toAirport?.city ?? toAirport?.cityEn ?? parsed.to;

  const title = `Vols ${fromCityFrMeta} → ${toCityFrMeta} — Cash ou Miles ? | KEZA`;
  const description = `Comparez le prix cash et le coût en miles pour ${fromCityFrMeta} (${parsed.from}) → ${toCityFrMeta} (${parsed.to}). Trouvez la façon la moins chère de réserver. Mis à jour chaque jour.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${SITE_URL}/flights/${params.route}`,
    },
    alternates: {
      canonical: `${SITE_URL}/flights/${params.route.toUpperCase()}`,
      languages: {
        'fr': `${SITE_URL}/flights/${params.route.toUpperCase()}`,
        'en': `${SITE_URL}/en/flights/${params.route.toUpperCase()}`,
        'x-default': `${SITE_URL}/flights/${params.route.toUpperCase()}`,
      },
    },
  };
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function RoutePage({ params }: Props) {
  const parsed = parseRoute(params.route);
  if (!parsed) notFound();

  const fromAirport = airportsMap[parsed.from];
  const toAirport = airportsMap[parsed.to];

  // If neither airport is known, still show the page (dynamic route)
  const fromCity = fromAirport?.cityEn ?? parsed.from;
  const fromCityFr = fromAirport?.city ?? parsed.from;
  const toCity = toAirport?.cityEn ?? parsed.to;
  const toCityFr = toAirport?.city ?? parsed.to;
  const fromFlag = fromAirport?.flag ?? "";
  const toFlag = toAirport?.flag ?? "";

  // Fetch calendar prices for current + next month
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}-01`;

  const [pricesThisMonth, pricesNextMonth] = await Promise.all([
    fetchCalendarPrices(parsed.from, parsed.to, thisMonth).catch(() => []),
    fetchCalendarPrices(parsed.from, parsed.to, nextMonth).catch(() => []),
  ]);

  const allPrices = [...pricesThisMonth, ...pricesNextMonth];
  const cheapest = allPrices.length > 0
    ? allPrices.reduce((min, d) => d.price < min.price ? d : min)
    : null;

  // Related routes: same origin, different destinations
  const relatedRoutes = POPULAR_ROUTES
    .filter(r => r !== params.route.toUpperCase())
    .filter(r => r.startsWith(parsed.from) || r.endsWith(parsed.to))
    .slice(0, 6);

  // Add some global routes if not enough related
  if (relatedRoutes.length < 4) {
    for (const r of POPULAR_ROUTES) {
      if (relatedRoutes.length >= 6) break;
      if (!relatedRoutes.includes(r) && r !== params.route.toUpperCase()) {
        relatedRoutes.push(r);
      }
    }
  }

  // Try to import routeMeta — may not exist yet (created by a separate agent)
  let routeMeta = undefined;
  try {
    const { getRouteMeta } = await import("@/data/routeMeta");
    routeMeta = getRouteMeta(parsed.from, parsed.to);
  } catch {
    // routeMeta.ts not yet available — page renders without it
  }

  // Schema.org BreadcrumbList structured data
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "KEZA",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Vols",
        item: `${SITE_URL}/flights`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${fromCity} → ${toCity}`,
        item: `${SITE_URL}/flights/${params.route.toUpperCase()}`,
      },
    ],
  };

  // Schema.org FAQ structured data — enriched with routeMeta when available
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Vaut-il mieux payer en cash ou en miles pour ${fromCityFr} → ${toCityFr} ?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Cela dépend du programme et des dates. KEZA compare toutes les options — prix cash, rachat de miles${routeMeta ? ` (meilleurs programmes : ${routeMeta.bestPrograms.join(", ")})` : ""}, et transferts de points bancaires — pour trouver la solution la moins chère.`,
        },
      },
      {
        "@type": "Question",
        name: `Quelle est la meilleure période pour voler ${fromCityFr} → ${toCityFr} ?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: routeMeta
            ? routeMeta.seasonTip.fr
            : cheapest
            ? `D'après les données actuelles, les prix commencent à $${cheapest.price} autour du ${cheapest.date}. Utilisez le calendrier de prix KEZA pour trouver les meilleures dates.`
            : `Les prix varient selon la saison. Utilisez le calendrier KEZA pour comparer les prix journaliers.`,
        },
      },
      {
        "@type": "Question",
        name: `Combien de miles faut-il pour voler ${fromCityFr} → ${toCityFr} ?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: routeMeta
            ? `En classe économique, comptez environ ${routeMeta.milesToEconomy.toLocaleString("fr-FR")} miles, et ${routeMeta.milesToBusiness.toLocaleString("fr-FR")} miles en business. Les meilleurs programmes sur cette route sont ${routeMeta.bestPrograms.join(", ")}.`
            : `Les besoins en miles varient selon le programme et les disponibilités. KEZA vérifie les 46 programmes de fidélité en temps réel pour trouver le meilleur rachat.`,
        },
      },
      {
        "@type": "Question",
        name: `Y a-t-il des vols directs entre ${fromCityFr} et ${toCityFr} ?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: routeMeta
            ? routeMeta.isNonstop
              ? `Oui, des vols sans escale sont disponibles entre ${fromCityFr} et ${toCityFr} avec ${routeMeta.airlines.join(", ")}.`
              : `Il n'y a pas de vol direct sur cette route. La plupart des correspondances passent par ${routeMeta.hub ?? "un hub majeur"}. Les compagnies opérant cette route incluent ${routeMeta.airlines.join(", ")}.`
            : `Consultez la recherche KEZA pour les options de vol actuelles entre ${fromCityFr} et ${toCityFr}.`,
        },
      },
    ],
  };

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <RoutePageClient
        from={parsed.from}
        to={parsed.to}
        fromCity={fromCity}
        fromCityFr={fromCityFr}
        toCity={toCity}
        toCityFr={toCityFr}
        fromFlag={fromFlag}
        toFlag={toFlag}
        cheapestPrice={cheapest?.price ?? null}
        cheapestDate={cheapest?.date ?? null}
        priceCount={allPrices.length}
        relatedRoutes={relatedRoutes}
        routeMeta={routeMeta}
        defaultLang="fr"
      />
    </>
  );
}
