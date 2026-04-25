import { Metadata } from "next";
import { notFound } from "next/navigation";
import { airportsMap } from "@/data/airports";
import { fetchCalendarPrices } from "@/lib/engine";
import { RoutePageClient } from "@/app/flights/[route]/RoutePageClient";
import { SITE_URL } from "@/lib/siteConfig";

// Same revalidation as FR pages
export const revalidate = 21600;
export const dynamicParams = true;

interface Props {
  params: { route: string };
}

function parseRoute(route: string): { from: string; to: string } | null {
  const match = route.match(/^([A-Z]{3})-([A-Z]{3})$/i);
  if (!match) return null;
  const from = match[1].toUpperCase();
  const to = match[2].toUpperCase();
  if (from === to) return null;
  return { from, to };
}

// Same popular routes as FR pages
const POPULAR_ROUTES = [
  // Africa ↔ Europe (original)
  "DSS-CDG", "ABJ-CDG", "LOS-LHR", "CMN-CDG", "NBO-CDG", "ACC-LHR",
  "JNB-LHR", "CAI-CDG", "ADD-DXB", "DSS-IST", "ABJ-IST", "CMN-JFK",
  "LOS-ATL", "NBO-DXB",
  // North America ↔ Europe (original)
  "JFK-LHR", "CDG-JFK", "LAX-CDG", "JFK-AMS", "ORD-LHR", "BOS-LHR",
  "MIA-MAD",
  // North America ↔ Asia (original)
  "JFK-NRT", "LAX-NRT", "SFO-NRT", "LAX-BKK", "LAX-SIN", "YYZ-LHR",
  // Europe ↔ Asia (original)
  "LHR-SIN", "CDG-NRT", "LHR-DXB", "LHR-BKK", "CDG-BKK", "FRA-SIN",
  "LHR-HKG",
  // Middle East hub routes (original)
  "DXB-LHR", "DXB-JFK", "DOH-LHR", "DOH-JFK", "IST-JFK",
  // Asia-Pacific (original)
  "SIN-SYD", "SIN-NRT", "HKG-LHR", "SYD-LHR",
  // Latin America (original)
  "MIA-BOG", "GRU-LHR", "GRU-CDG", "EZE-MAD", "SCL-MIA", "BOG-MAD",

  // Africa ↔ Europe (expanded)
  "DSS-LHR", "DSS-MAD", "DSS-AMS", "DSS-BRU", "DSS-FCO", "DSS-LIS",
  "ABJ-LHR", "ABJ-MAD", "ABJ-AMS", "ABJ-BRU",
  "LOS-CDG", "LOS-MAD", "LOS-AMS", "LOS-IST", "LOS-DXB",
  "CMN-LHR", "CMN-MAD", "CMN-IST", "CMN-AMS",
  "NBO-LHR", "NBO-IST",
  "ACC-CDG", "ACC-MAD", "ACC-IST",
  "JNB-CDG", "JNB-IST", "JNB-DXB",
  "CAI-LHR", "CAI-IST", "CAI-DXB",
  "TUN-CDG", "TUN-LHR", "TUN-MAD",
  "ALG-CDG", "ALG-LHR", "ALG-MAD",

  // Africa ↔ Americas
  "LOS-JFK", "LOS-IAD",
  "ACC-JFK", "ACC-IAD",
  "JNB-JFK", "JNB-MIA",
  "NBO-JFK",

  // Africa ↔ Middle East
  "LOS-DOH", "ACC-DXB", "JNB-DOH",

  // Africa intra
  "DSS-ABJ", "DSS-LOS", "DSS-CMN",

  // Europe ↔ Americas (high volume)
  "LHR-JFK", "LHR-LAX", "LHR-MIA", "LHR-YYZ", "LHR-YUL",
  "CDG-LAX", "CDG-MIA", "CDG-YUL", "CDG-YYZ", "CDG-ORD",
  "MAD-JFK", "MAD-MIA", "MAD-BOG",
  "AMS-JFK", "AMS-LAX",
  "FRA-JFK", "FRA-LAX", "FRA-YYZ",

  // Asia ↔ Americas
  "NRT-LAX", "NRT-JFK", "NRT-SFO",
  "SIN-LAX", "SIN-JFK",

  // More Middle East hubs
  "DXB-CDG", "DXB-SIN", "DXB-BKK", "DXB-SYD",
  "DOH-CDG", "DOH-SIN", "DOH-BKK",
];

export async function generateStaticParams() {
  return POPULAR_ROUTES.map(route => ({ route }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const parsed = parseRoute(params.route);
  if (!parsed) return { title: "Route not found — KEZA" };

  const fromAirport = airportsMap[parsed.from];
  const toAirport = airportsMap[parsed.to];
  const fromCity = fromAirport?.cityEn ?? parsed.from;
  const toCity = toAirport?.cityEn ?? parsed.to;

  const title = `Flights ${fromCity} to ${toCity} — Cash or Miles? | KEZA`;
  const description = `Compare cash price vs miles cost for ${fromCity} (${parsed.from}) to ${toCity} (${parsed.to}). Find the cheapest way to book. Updated daily.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website", url: `${SITE_URL}/en/flights/${params.route}` },
    alternates: {
      canonical: `${SITE_URL}/en/flights/${params.route.toUpperCase()}`,
      languages: {
        'fr': `${SITE_URL}/flights/${params.route.toUpperCase()}`,
        'en': `${SITE_URL}/en/flights/${params.route.toUpperCase()}`,
        'x-default': `${SITE_URL}/flights/${params.route.toUpperCase()}`,
      },
    },
  };
}

export default async function EnRoutePage({ params }: Props) {
  const parsed = parseRoute(params.route);
  if (!parsed) notFound();

  const fromAirport = airportsMap[parsed.from];
  const toAirport = airportsMap[parsed.to];

  const fromCity = fromAirport?.cityEn ?? parsed.from;
  const fromCityFr = fromAirport?.city ?? parsed.from;
  const toCity = toAirport?.cityEn ?? parsed.to;
  const toCityFr = toAirport?.city ?? parsed.to;
  const fromFlag = fromAirport?.flag ?? "";
  const toFlag = toAirport?.flag ?? "";

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

  const relatedRoutes = POPULAR_ROUTES
    .filter(r => r !== params.route.toUpperCase())
    .filter(r => r.startsWith(parsed.from) || r.endsWith(parsed.to))
    .slice(0, 6);

  if (relatedRoutes.length < 4) {
    for (const r of POPULAR_ROUTES) {
      if (relatedRoutes.length >= 6) break;
      if (!relatedRoutes.includes(r) && r !== params.route.toUpperCase()) relatedRoutes.push(r);
    }
  }

  let routeMeta = undefined;
  try {
    const { getRouteMeta } = await import("@/data/routeMeta");
    routeMeta = getRouteMeta(parsed.from, parsed.to);
  } catch { /* no routeMeta */ }

  // ── JSON-LD ──────────────────────────────────────────────────────────────
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "KEZA", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Flights", item: `${SITE_URL}/en/flights` },
      {
        "@type": "ListItem",
        position: 3,
        name: `${fromCity} → ${toCity}`,
        item: `${SITE_URL}/en/flights/${params.route.toUpperCase()}`,
      },
    ],
  };

  const faqItems = [
    {
      "@type": "Question",
      name: `Should I use miles or cash for ${fromCity} to ${toCity}?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: `It depends on the program and dates. KEZA compares all options — cash price, miles redemption${routeMeta ? ` (top programs: ${routeMeta.bestPrograms.join(", ")})` : ""}, and bank point transfers — to find the cheapest way to book ${fromCity} to ${toCity}.`,
      },
    },
    {
      "@type": "Question",
      name: `What is the cheapest time to fly ${fromCity} to ${toCity}?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: routeMeta
          ? routeMeta.seasonTip.en
          : cheapest
          ? `Based on current data, prices start from $${cheapest.price} around ${cheapest.date}. Use KEZA's price calendar to find the best dates.`
          : `Prices vary by season. Use KEZA's price calendar to compare daily prices and find the cheapest dates.`,
      },
    },
    {
      "@type": "Question",
      name: `How many miles do I need for ${fromCity} to ${toCity}?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: routeMeta
          ? `Economy class typically requires around ${routeMeta.milesToEconomy.toLocaleString("en-US")} miles, and business class around ${routeMeta.milesToBusiness.toLocaleString("en-US")} miles. The best programs for this route are ${routeMeta.bestPrograms.join(", ")}.`
          : `Miles requirements vary by program and availability. KEZA checks all 46 loyalty programs in real time to find the best redemption for your dates.`,
      },
    },
    {
      "@type": "Question",
      name: `Is there a nonstop flight from ${fromCity} to ${toCity}?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: routeMeta
          ? routeMeta.isNonstop
            ? `Yes, nonstop flights are available between ${fromCity} and ${toCity} with ${routeMeta.airlines.join(", ")}.`
            : `There are no direct nonstop flights on this route. Most connections go through ${routeMeta.hub ?? "a major hub"}. Airlines operating this route include ${routeMeta.airlines.join(", ")}.`
          : `Check KEZA's search for current flight options and availability between ${fromCity} and ${toCity}.`,
      },
    },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems,
  };

  return (
    <>
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
        defaultLang="en"
      />
    </>
  );
}
