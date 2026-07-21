// app/en/prix/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { DESTINATIONS } from "@/data/destinations";
import { getAllDestinationPriceHistories } from "@/lib/priceHistory";
import { PriceChart } from "@/app/prix/PriceChart";
import { SITE_URL } from "@/lib/siteConfig";
import { logError } from "@/lib/logger";

export const metadata: Metadata = {
  title: "Flight Prices — Compare Cash & Miles | Xalifly",
  description:
    "Compare flight prices in cash and miles for all routes. Find the cheapest way to book your next flight.",
  openGraph: {
    title: "Flight Prices — Compare Cash & Miles | Xalifly",
    description:
      "Compare flight prices in cash and miles for all routes. Find the cheapest way to book your next flight.",
    url: `${SITE_URL}/en/prix`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Flight Prices — Compare Cash & Miles | Xalifly",
    description:
      "Compare flight prices in cash and miles for all routes. Find the cheapest way to book your next flight.",
  },
  alternates: {
    canonical: `${SITE_URL}/en/prix`,
    languages: {
      fr: `${SITE_URL}/prix`,
      en: `${SITE_URL}/en/prix`,
      "x-default": `${SITE_URL}/prix`,
    },
  },
};

export default function EnPrixPage() {
  let histories = null;
  let dataError = false;
  try {
    histories = getAllDestinationPriceHistories();
    if (!histories || histories.length === 0) dataError = true;
  } catch (err) {
    logError("[/en/prix] Failed to load price histories", err);
    dataError = true;
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

        {/* Back link */}
        <Link href="/en" className="text-xs text-muted hover:text-fg transition-colors">
          ← Back
        </Link>

        {/* Hero */}
        <div className="mt-6 mb-8">
          <h1 className="text-3xl sm:text-4xl font-black leading-tight">
            <span className="bg-gradient-to-br from-blue-300 via-primary to-blue-500 bg-clip-text text-transparent">
              Best time
            </span>
            <span className="text-fg"> to travel</span>
          </h1>
          <p className="text-sm text-muted mt-2">
            {DESTINATIONS.length} destinations · estimated prices from Dakar · click to explore
          </p>
        </div>

        {/* Data unavailable fallback */}
        {dataError || !histories ? (
          <div className="bg-surface border border-border rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
            <span className="text-4xl">⚠️</span>
            <p className="font-bold text-fg">Data temporarily unavailable</p>
            <p className="text-sm text-muted">
              Price charts will be available in a few moments.
            </p>
            <Link
              href="/"
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-colors"
            >
              ✈ Search a flight
            </Link>
          </div>
        ) : (
          <>
            {/* Interactive chart */}
            <PriceChart
              histories={histories}
              destinations={DESTINATIONS}
              lang="en"
            />

            {/* CTA */}
            <div className="mt-8 text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-colors"
              >
                ✈ Search a flight
              </Link>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
