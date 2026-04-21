// app/carte/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { DESTINATIONS } from "@/data/destinations";
import { computeDealRatio, classifyDeal } from "@/lib/dealsEngine";
import { WorldMap, type DestinationWithRec } from "./WorldMap";

export const metadata: Metadata = {
  title: "Carte des destinations miles | KEZA",
  description:
    "Explorez 20 destinations en avion — carte interactive cash vs miles. Trouvez où vos points valent le plus.",
  openGraph: {
    title: "Carte des destinations miles | KEZA",
    description: "20 destinations sur une carte interactive. Points colorés par recommandation KEZA : miles gagnent, cash gagne.",
    url: "https://keza-taupe.vercel.app/carte",
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
    <div className="min-h-screen bg-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

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

        {/* Map */}
        <WorldMap destinations={DESTINATIONS_WITH_REC} lang="fr" />

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
            ✈ Rechercher un vol
          </Link>
        </div>

      </div>
    </div>
  );
}
