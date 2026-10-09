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

// Dynamically import PriceChart with CalendarSkeleton fallback
// Lazy loads on-demand to reduce main bundle size
// PriceChart is already a "use client" component, so no ssr: false needed
const PriceChart = dynamic(() => import("./PriceChart").then((mod) => ({ default: mod.PriceChart })), {
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
  title: "Meilleur moment pour voyager | Xalifly",
  description:
    "Découvrez le meilleur mois pour voyager vers 24 destinations depuis Dakar — prix cash et recommandation miles estimés mois par mois.",
  openGraph: {
    title: "Meilleur moment pour voyager | Xalifly",
    description:
      "24 destinations · prix estimés mois par mois · miles vs cash recalculé chaque mois.",
    url: `${SITE_URL}/prix`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Meilleur moment pour voyager | Xalifly",
    description: "24 destinations · prix estimés mois par mois · miles vs cash recalculé chaque mois.",
  },
  alternates: {
    canonical: `${SITE_URL}/prix`,
    languages: {
      fr: `${SITE_URL}/prix`,
      en: `${SITE_URL}/en/prix`,
      "x-default": `${SITE_URL}/prix`,
    },
  },
};

export default function PrixPage() {
  // Wrapped in try/catch — page must never 500 regardless of data issues
  let histories = null;
  let dataError = false;
  try {
    histories = getAllDestinationPriceHistories();
    if (!histories || histories.length === 0) dataError = true;
  } catch (err) {
    logError("[/prix] Failed to load price histories", err);
    dataError = true;
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header lang="fr" />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10">

        {/* Back link */}
        <Link href="/" className="text-xs text-muted hover:text-fg transition-colors">
          ← Retour
        </Link>

        {/* Hero */}
        <div className="mt-6 mb-8">
          <h1 className="text-3xl sm:text-4xl font-black leading-tight">
            <span className="bg-gradient-to-br from-blue-300 via-primary to-blue-500 bg-clip-text text-transparent">
              Meilleur moment
            </span>
            <span className="text-fg"> pour voyager</span>
          </h1>
          <p className="text-sm text-muted mt-2">
            {DESTINATIONS.length} destinations · prix estimés depuis Dakar · clique pour explorer
          </p>
        </div>

        {/* Data unavailable fallback */}
        {dataError || !histories ? (
          <div className="bg-surface border border-border rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
              <WarningIcon />
            </span>
            <p className="font-bold text-fg">Données temporairement indisponibles</p>
            <p className="text-sm text-muted">
              Les graphiques de prix seront disponibles dans quelques instants.
            </p>
            <Link
              href="/"
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-colors"
            >
              <SearchFlightIcon />
              Rechercher un vol
            </Link>
          </div>
        ) : (
          <>
            {/* Interactive chart - lazy loaded with Suspense boundary */}
            <Suspense fallback={<CalendarSkeleton />}>
              <PriceChart
                histories={histories}
                destinations={DESTINATIONS}
                lang="fr"
              />
            </Suspense>

            {/* CTA */}
            <div className="mt-8 text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-colors"
              >
                <SearchFlightIcon />
                Rechercher un vol
              </Link>
            </div>
          </>
        )}

      </main>
      <Footer lang="fr" />
    </div>
  );
}
