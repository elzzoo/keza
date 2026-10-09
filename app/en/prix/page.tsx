// app/en/prix/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { DESTINATIONS } from "@/data/destinations";
import { getAllDestinationPriceHistories } from "@/lib/priceHistory";
import { SITE_URL } from "@/lib/siteConfig";
import { logError } from "@/lib/logger";
import { CalendarSkeleton } from "@/components/Skeletons";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const PriceChart = dynamic(() => import("@/app/prix/PriceChart").then((mod) => ({ default: mod.PriceChart })), {
  loading: () => <CalendarSkeleton />,
});

function WarningIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path d="M12 4 3.8 18.5h16.4L12 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 9v4M12 16.5h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SearchFlightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path d="M4 17 20 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m9 14-3.7-2.2 1.3-1.2 5 1.8M15 10l1 5.2 1.5-1.1-.1-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
    <div className="min-h-screen bg-bg flex flex-col">
      <Header lang="en" />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10">

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
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
              <WarningIcon />
            </span>
            <p className="font-bold text-fg">Data temporarily unavailable</p>
            <p className="text-sm text-muted">
              Price charts will be available in a few moments.
            </p>
            <Link
              href="/en"
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-colors"
            >
              <SearchFlightIcon />
              Search a flight
            </Link>
          </div>
        ) : (
          <>
            {/* Interactive chart - lazy loaded with Suspense boundary */}
            <Suspense fallback={<CalendarSkeleton />}>
              <PriceChart
                histories={histories}
                destinations={DESTINATIONS}
                lang="en"
              />
            </Suspense>

            {/* CTA */}
            <div className="mt-8 text-center">
              <Link
                href="/en"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-colors"
              >
                <SearchFlightIcon />
                Search a flight
              </Link>
            </div>
          </>
        )}

      </main>
      <Footer lang="en" />
    </div>
  );
}
