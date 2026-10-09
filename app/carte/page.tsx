// app/carte/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { DESTINATIONS } from "@/data/destinations";
import { computeDealRatio, classifyDeal } from "@/lib/dealsEngine";
import type { DestinationWithRec } from "./WorldMap";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SITE_URL } from "@/lib/siteConfig";
import { WorldMapClient } from "./WorldMapClient";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

function MapIcon({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 3v15M15 6v15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SearchFlightIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path d="M10.5 20.5 13 13l7.5-2.5a1 1 0 0 0 .1-1.86L4.7 2.16a1 1 0 0 0-1.27 1.27l6.48 15.9a1 1 0 0 0 1.86-.1Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m13 13-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export const metadata: Metadata = {
  title: "Carte des destinations miles | Xalifly",
  description:
    "Explorez 24 destinations en avion — carte interactive cash vs miles. Trouvez où vos points valent le plus.",
  openGraph: {
    title: "Carte des destinations miles | Xalifly",
    description: "24 destinations sur une carte interactive. Points colorés par recommandation Xalifly : miles gagnent, cash gagne.",
    url: `${SITE_URL}/carte`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Carte des destinations miles | Xalifly",
    description: "24 destinations sur une carte interactive. Points colorés par recommandation Xalifly.",
  },
  alternates: {
    canonical: `${SITE_URL}/carte`,
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

export default function CartePage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header lang="fr" />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">

        {/* Back link */}
        <Link href="/" className="text-xs text-muted hover:text-fg transition-colors">
          ← Retour
        </Link>

        {/* Hero */}
        <div className="mt-6 mb-6">
          <h1 className="text-3xl sm:text-4xl font-black leading-tight">
            <span className="bg-gradient-to-br from-blue-300 via-primary to-blue-500 bg-clip-text text-transparent">
              Explore
            </span>
            <span className="text-fg"> le monde en miles</span>
          </h1>
          <p className="text-sm text-muted mt-2">
            {DESTINATIONS.length} destinations · clique pour voir les prix cash &amp; miles
          </p>
        </div>

        {/* Map - wrapped in error boundary to catch any rendering errors */}
        <ErrorBoundary lang="fr" fallback={
          <div className="bg-surface rounded-2xl border border-border p-8 flex flex-col items-center gap-4 text-center min-h-96">
            <MapIcon className="h-10 w-10 text-primary" />
            <p className="font-bold text-fg text-base">
              La carte ne peut pas s&apos;afficher
            </p>
            <p className="text-sm text-muted">
              Veuillez rafraîchir la page et réessayer
            </p>
          </div>
        }>
          <WorldMapClient destinations={DESTINATIONS_WITH_REC} lang="fr" />
        </ErrorBoundary>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-surface border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-primary">{MILES_COUNT}</div>
            <div className="text-[11px] text-muted mt-0.5">Miles gagnent</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-success">{NEUTRAL_COUNT}</div>
            <div className="text-[11px] text-muted mt-0.5">Si tu as les miles</div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-warning">{CASH_COUNT}</div>
            <div className="text-[11px] text-muted mt-0.5">Cash gagne</div>
          </div>
        </div>

        {/* CTA back to search */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-colors"
          >
            <SearchFlightIcon />
            Rechercher un vol
          </Link>
        </div>

      </main>
      <Footer lang="fr" />
    </div>
  );
}
