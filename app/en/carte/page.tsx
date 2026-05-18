// app/en/carte/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { DESTINATIONS } from "@/data/destinations";
import { computeDealRatio, classifyDeal } from "@/lib/dealsEngine";
import type { DestinationWithRec } from "@/app/carte/WorldMap";
import { WorldMapDynamic } from "@/app/carte/WorldMapDynamic";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Flight Price Map — Find Cheap Destinations | KEZA",
  description:
    "Explore cheap flights from your city on an interactive map. Compare cash prices and miles redemptions.",
  openGraph: {
    title: "Flight Price Map — Find Cheap Destinations | KEZA",
    description:
      "Explore cheap flights from your city on an interactive map. Compare cash prices and miles redemptions.",
    url: `${SITE_URL}/en/carte`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Flight Price Map — Find Cheap Destinations | KEZA",
    description:
      "Explore cheap flights from your city on an interactive map. Compare cash prices and miles redemptions.",
  },
  alternates: {
    canonical: `${SITE_URL}/en/carte`,
    languages: {
      fr: `${SITE_URL}/carte`,
      en: `${SITE_URL}/en/carte`,
      "x-default": `${SITE_URL}/carte`,
    },
  },
};

// Compute recommendations server-side at build time
const DESTINATIONS_WITH_REC: DestinationWithRec[] = DESTINATIONS.map((d) => {
  const cpm = computeDealRatio(d.cashEstimateUsd, d.milesEstimate);
  return { ...d, recommendation: classifyDeal(cpm), cpm };
});

// Stats for display
const MILES_COUNT = DESTINATIONS_WITH_REC.filter(
  (d) => d.recommendation === "USE_MILES"
).length;
const NEUTRAL_COUNT = DESTINATIONS_WITH_REC.filter(
  (d) => d.recommendation === "NEUTRAL"
).length;
const CASH_COUNT = DESTINATIONS_WITH_REC.filter(
  (d) => d.recommendation === "USE_CASH"
).length;

export default function EnCartePage() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Back link */}
        <Link href="/en" className="text-xs text-muted hover:text-fg transition-colors">
          ← Back
        </Link>

        {/* Hero */}
        <div className="mt-6 mb-6">
          <h1 className="text-3xl sm:text-4xl font-black leading-tight">
            <span className="bg-gradient-to-br from-blue-300 via-primary to-blue-500 bg-clip-text text-transparent">
              Explore
            </span>
            <span className="text-fg"> the world with miles</span>
          </h1>
          <p className="text-sm text-muted mt-2">
            {DESTINATIONS.length} destinations · click to see cash &amp; miles prices
          </p>
        </div>

        {/* Map */}
        <ErrorBoundary lang="en">
          <WorldMapDynamic destinations={DESTINATIONS_WITH_REC} lang="en" />
        </ErrorBoundary>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-surface border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-primary">{MILES_COUNT}</div>
            <div className="text-[11px] text-muted mt-0.5">Miles win</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-success">{NEUTRAL_COUNT}</div>
            <div className="text-[11px] text-muted mt-0.5">If you have miles</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-warning">{CASH_COUNT}</div>
            <div className="text-[11px] text-muted mt-0.5">Cash wins</div>
          </div>
        </div>

        {/* CTA back to search */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-colors"
          >
            ✈ Search a flight
          </Link>
        </div>

      </div>
    </div>
  );
}
