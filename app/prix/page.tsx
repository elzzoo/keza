import type { Metadata } from "next";
import Link from "next/link";
import { DESTINATIONS } from "@/data/destinations";
import { getAllDestinationPriceHistories } from "@/lib/priceHistory";
import { PriceChart } from "./PriceChart";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Meilleur moment pour voyager | KEZA",
  description:
    "Découvrez le meilleur mois pour voyager vers 20 destinations depuis Dakar — prix cash et recommandation miles estimés mois par mois.",
  openGraph: {
    title: "Meilleur moment pour voyager | KEZA",
    description:
      "20 destinations · prix estimés mois par mois · miles vs cash recalculé chaque mois.",
    url: `${SITE_URL}/prix`,
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
    console.error("[/prix] Failed to load price histories:", err);
    dataError = true;
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

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
            <span className="text-4xl">⚠️</span>
            <p className="font-bold text-fg">Données temporairement indisponibles</p>
            <p className="text-sm text-muted">
              Les graphiques de prix seront disponibles dans quelques instants.
            </p>
            <Link
              href="/"
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-colors"
            >
              ✈ Rechercher un vol
            </Link>
          </div>
        ) : (
          <>
            {/* Interactive chart */}
            <PriceChart
              histories={histories}
              destinations={DESTINATIONS}
              lang="fr"
            />

            {/* CTA */}
            <div className="mt-8 text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-colors"
              >
                ✈ Rechercher un vol
              </Link>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
