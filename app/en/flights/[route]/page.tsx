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
  "DSS-CDG", "ABJ-CDG", "LOS-LHR", "CMN-CDG", "NBO-CDG", "ACC-LHR",
  "JNB-LHR", "CAI-CDG", "ADD-DXB", "DSS-IST", "ABJ-IST", "CMN-JFK",
  "LOS-ATL", "NBO-DXB",
  "JFK-LHR", "CDG-JFK", "LAX-CDG", "JFK-AMS", "ORD-LHR", "BOS-LHR",
  "MIA-MAD", "JFK-NRT", "LAX-NRT", "SFO-NRT", "LAX-BKK", "LAX-SIN",
  "YYZ-LHR", "LHR-SIN", "CDG-NRT", "LHR-DXB", "LHR-BKK", "CDG-BKK",
  "FRA-SIN", "LHR-HKG", "DXB-LHR", "DXB-JFK", "DOH-LHR", "DOH-JFK",
  "IST-JFK", "SIN-SYD", "SIN-NRT", "HKG-LHR", "SYD-LHR",
  "MIA-BOG", "GRU-LHR", "GRU-CDG", "EZE-MAD", "SCL-MIA", "BOG-MAD",
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

  return (
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
  );
}
