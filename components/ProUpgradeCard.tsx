"use client";

import Link from "next/link";

export function ProUpgradeCard({ daysLeft }: { daysLeft: number | null }) {
  if (daysLeft === null) {
    // Pro user, show nothing
    return null;
  }

  return (
    <div className="rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-6 mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-amber-900 mb-2">
            {daysLeft > 0 ? `Essai gratuit: ${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant` : "Essai expiré"}
          </h3>
          <p className="text-sm text-amber-800 mb-4">
            Passe à KEZA Pro pour débloquer l&apos;historique des prix sur 6 mois et les alertes multi-passagers.
          </p>
        </div>
      </div>
      <Link
        href="/pro"
        className="inline-block rounded-lg bg-amber-600 text-white text-sm font-bold px-6 py-2 hover:bg-amber-700 transition-colors"
      >
        Passer à KEZA Pro
      </Link>
    </div>
  );
}
