// app/en/deals/page.tsx
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DealsPageClient } from "@/app/deals/DealsPageClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { redis } from "@/lib/redis";
import { DEALS_KEY } from "@/lib/redisKeys";
import { sortDeals } from "@/lib/dealsEngine";
import type { LiveDeal, RawDeal } from "@/lib/dealsEngine";
import { SITE_URL } from "@/lib/siteConfig";
import { logWarn } from "@/lib/logger";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Flight Deals — Best Cash & Miles Offers | Xalifly",
  description:
    "Discover the best flight deals: cheap cash fares and high-value miles redemptions updated daily.",
  openGraph: {
    title: "Flight Deals — Best Cash & Miles Offers | Xalifly",
    description:
      "Discover the best flight deals: cheap cash fares and high-value miles redemptions updated daily.",
    images: [{ url: "/deals/opengraph-image" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Flight Deals — Best Cash & Miles Offers | Xalifly",
    description:
      "Discover the best flight deals: cheap cash fares and high-value miles redemptions updated daily.",
  },
  alternates: {
    canonical: `${SITE_URL}/en/deals`,
    languages: {
      fr: `${SITE_URL}/deals`,
      en: `${SITE_URL}/en/deals`,
      "x-default": `${SITE_URL}/deals`,
    },
  },
};

const FALLBACK_DEALS: RawDeal[] = [
  { from: "DSS", to: "CDG", fromFlag: "🇸🇳", toFlag: "🇫🇷", cashPrice: 680, milesRequired: 35000, program: "Flying Blue" },
  { from: "JFK", to: "LHR", fromFlag: "🇺🇸", toFlag: "🇬🇧", cashPrice: 520, milesRequired: 26000, program: "Aeroplan" },
  { from: "LOS", to: "LHR", fromFlag: "🇳🇬", toFlag: "🇬🇧", cashPrice: 490, milesRequired: 32000, program: "LifeMiles" },
  { from: "CMN", to: "CDG", fromFlag: "🇲🇦", toFlag: "🇫🇷", cashPrice: 320, milesRequired: 18000, program: "Flying Blue" },
  { from: "CDG", to: "NRT", fromFlag: "🇫🇷", toFlag: "🇯🇵", cashPrice: 610, milesRequired: 55000, program: "Miles&Smiles" },
  { from: "ABJ", to: "CDG", fromFlag: "🇨🇮", toFlag: "🇫🇷", cashPrice: 590, milesRequired: 30000, program: "Flying Blue" },
];

async function getDeals(): Promise<LiveDeal[]> {
  try {
    const cached = await redis.get<LiveDeal[]>(DEALS_KEY);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
  } catch (e) {
    logWarn("[deals/en] Redis unavailable, using fallback", undefined, { error: String(e) });
  }
  return sortDeals(FALLBACK_DEALS);
}

export default async function EnDealsPage() {
  const deals = await getDeals();

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Best flight deals — cash & miles",
    description: "The best flight deals — cash or miles — updated continuously.",
    url: `${SITE_URL}/en/deals`,
    numberOfItems: Math.min(deals.length, 10),
    itemListElement: deals.slice(0, 10).map((deal, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${deal.from} → ${deal.to} — $${deal.cashPrice} or ${deal.milesRequired} miles`,
      url: `${SITE_URL}/?from=${deal.from}&to=${deal.to}`,
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <Header lang="en" />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
        <div className="mb-8 animate-fade-up">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-muted uppercase tracking-wider">Live</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-fg mb-2">
            Best flight deals — cash &amp; miles
          </h1>
          <p className="text-sm text-subtle max-w-xl">
            Xalifly calculates in real time the value of your miles on each route.
            Pay the best price — cash or miles.
          </p>
        </div>

        <ErrorBoundary lang="en">
          <DealsPageClient initialDeals={deals} lang="en" />
        </ErrorBoundary>
      </main>

      <Footer lang="en" />
    </div>
  );
}
