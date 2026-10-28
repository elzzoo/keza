import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/siteConfig";
import { POPULAR_ROUTES } from "@/data/popularRoutes";
import { rateLimitResponse } from "@/lib/ratelimit";

export const revalidate = 3600; // 1h cache

// Human-readable labels for airports used in feed titles
const AIRPORT_CITY: Record<string, string> = {
  CDG: "Paris CDG",
  LHR: "Londres LHR",
  JFK: "New York JFK",
  LAX: "Los Angeles LAX",
  DSS: "Dakar DSS",
  ABJ: "Abidjan ABJ",
  LOS: "Lagos LOS",
  CMN: "Casablanca CMN",
  NBO: "Nairobi NBO",
  ACC: "Accra ACC",
  JNB: "Johannesburg JNB",
  DXB: "Dubaï DXB",
  IST: "Istanbul IST",
  AMS: "Amsterdam AMS",
  MAD: "Madrid MAD",
  SIN: "Singapour SIN",
  NRT: "Tokyo NRT",
  BKK: "Bangkok BKK",
  DOH: "Doha DOH",
  SYD: "Sydney SYD",
  GRU: "São Paulo GRU",
  MIA: "Miami MIA",
  YYZ: "Toronto YYZ",
  ORD: "Chicago ORD",
  BOS: "Boston BOS",
  SFO: "San Francisco SFO",
  HKG: "Hong Kong HKG",
  CAI: "Le Caire CAI",
  ADD: "Addis-Abeba ADD",
  FRA: "Francfort FRA",
  EZE: "Buenos Aires EZE",
  SCL: "Santiago SCL",
  BOG: "Bogotá BOG",
  IAD: "Washington IAD",
  ATL: "Atlanta ATL",
};

function cityLabel(iata: string): string {
  return AIRPORT_CITY[iata] ?? iata;
}

export async function GET(request: Request) {
  const limited = await rateLimitResponse(request, {
    namespace: "api:feed",
    limit: 120,
    windowSeconds: 60,
  });
  if (limited) return limited;

  // Pick the first 10 routes from the popular-routes list for the feed
  const feedRoutes = POPULAR_ROUTES.slice(0, 10);

  const items = feedRoutes.map((route) => {
    const [from, to] = route.split("-");
    const fromLabel = cityLabel(from);
    const toLabel = cityLabel(to);
    return {
      title: `${fromLabel} → ${toLabel} — Analyse cash vs miles`,
      link: `${SITE_URL}/flights/${route}`,
      description: `Explorez une estimation cash vs miles pour ${fromLabel}-${toLabel}. Confirmez le tarif et la disponibilité auprès du fournisseur avant de réserver.`,
      guid: `${SITE_URL}/flights/${route}`,
    };
  });

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Xalifly — Comparaisons vols cash vs miles</title>
    <link>${SITE_URL}</link>
    <description>Itinéraires populaires pour comparer les prix cash et une estimation du coût en miles.</description>
    <language>fr</language>
    <atom:link href="${SITE_URL}/api/feed" rel="self" type="application/rss+xml" />
    ${items
      .map(
        (item) => `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${item.link}</link>
      <description><![CDATA[${item.description}]]></description>
      <guid isPermaLink="true">${item.guid}</guid>
    </item>`
      )
      .join("")}
  </channel>
</rss>`;

  return new NextResponse(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
