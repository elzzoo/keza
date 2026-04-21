// app/programmes/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ProgramsTable } from "./ProgramsTable";

export const metadata: Metadata = {
  title: "Meilleurs programmes miles & points 2026 | KEZA",
  description:
    "Comparez les 33 meilleurs programmes de fidélité : Flying Blue, Aeroplan, Chase UR, Amex MR… Score KEZA, valeur du mile, partenaires de transfert.",
  openGraph: {
    title: "Meilleurs programmes miles & points 2026 | KEZA",
    description: "Classement KEZA des 33 meilleurs programmes de fidélité — valeur du mile, partenaires, meilleur usage.",
    url: "https://keza-taupe.vercel.app/programmes",
  },
};

export default function ProgrammesPage() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Back link */}
        <Link href="/" className="text-xs text-muted hover:text-fg transition-colors">
          ← Retour
        </Link>

        {/* Hero */}
        <div className="mt-6 mb-8">
          <h1 className="text-3xl sm:text-4xl font-black leading-tight">
            <span className="bg-gradient-to-br from-blue-300 via-primary to-blue-500 bg-clip-text text-transparent">
              Programmes miles
            </span>
            <br />
            <span className="text-fg">Quel programme vaut vraiment le coup ?</span>
          </h1>
          <p className="text-sm text-muted mt-3 max-w-xl">
            33 programmes analysés — airlines, hôtels, cartes de transfert. Score KEZA calculé sur la valeur du mile, les partenaires disponibles et la flexibilité d&apos;utilisation.
          </p>
          <p className="text-xs text-muted/60 mt-1">
            Mis à jour : avril 2026 · Sources : ThePointsGuy, NerdWallet, AwardWallet
          </p>
        </div>

        {/* Table */}
        <ProgramsTable lang="fr" />

        {/* Editorial note */}
        <div className="mt-10 bg-surface border border-border rounded-2xl p-5">
          <h2 className="text-sm font-bold text-fg mb-2">Comment KEZA calcule le Score</h2>
          <p className="text-xs text-muted leading-relaxed">
            Le Score KEZA (0–100) combine trois critères : la <strong className="text-fg">valeur estimée du mile</strong> (50%) basée sur les valuations de marché de ThePointsGuy et NerdWallet, le <strong className="text-fg">nombre de partenaires de transfert</strong> (30%) qui détermine la flexibilité d&apos;alimentation du programme, et la <strong className="text-fg">flexibilité d&apos;utilisation</strong> (20%) évaluant la facilité à obtenir des sièges prime. Les valeurs sont mises à jour manuellement 2 à 4 fois par an.
          </p>
        </div>

      </div>
    </div>
  );
}
