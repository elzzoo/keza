import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DealsPageClient } from "./DealsPageClient";
import { redis } from "@/lib/redis";
import { DEALS_KEY } from "@/lib/redisKeys";
import { sortDeals } from "@/lib/dealsEngine";
import type { LiveDeal, RawDeal } from "@/lib/dealsEngine";
import { SITE_URL } from "@/lib/siteConfig";

export const revalidate = 3600; // Re-fetch every hour

export const metadata: Metadata = {
  title: "Deals cash vs miles du moment | KEZA",
  description:
    "Comparez les meilleurs deals vols en cash et en miles. KEZA calcule en temps réel quand payer cash ou utiliser vos miles.",
  openGraph: {
    title: "Deals cash vs miles | KEZA",
    description: "Les meilleurs deals vols — cash ou miles — mis à jour en continu.",
    images: [{ url: "/deals/opengraph-image" }],
  },
};

// Fallback statique si le cron n'a pas encore tourné
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
    console.error("[deals] Redis unavailable, using fallback:", e);
  }
  return sortDeals(FALLBACK_DEALS);
}

export default async function DealsPage() {
  const deals = await getDeals();

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Deals cash vs miles du moment",
    description: "Les meilleurs deals vols — cash ou miles — mis à jour en continu.",
    url: `${SITE_URL}/deals`,
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
      <Header lang="fr" />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
        {/* Hero */}
        <div className="mb-8 animate-fade-up">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-muted uppercase tracking-wider">Live</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-fg mb-2">
            Deals cash vs miles du moment
          </h1>
          <p className="text-sm text-subtle max-w-xl">
            KEZA calcule en temps réel la valeur de vos miles sur chaque route.
            Payez au meilleur prix — cash ou miles.
          </p>
        </div>

        <DealsPageClient initialDeals={deals} />
      </main>

      <Footer lang="fr" />
    </div>
  );
}
