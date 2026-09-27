"use client";

import Link from "next/link";

type ProUpgradeCardProps = {
  daysLeft: number | null;
  lang?: "fr" | "en";
};

export function ProUpgradeCard({ daysLeft, lang = "fr" }: ProUpgradeCardProps) {
  if (daysLeft === null) {
    // Pro user, show nothing
    return null;
  }

  const fr = lang === "fr";
  const trialLabel = fr
    ? `Essai gratuit: ${daysLeft} jour${daysLeft > 1 ? "s restants" : " restant"}`
    : `Free trial: ${daysLeft} day${daysLeft > 1 ? "s" : ""} left`;

  return (
    <div className="rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-6 mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-amber-900 mb-2">
            {daysLeft > 0 ? trialLabel : fr ? "Essai expiré" : "Trial expired"}
          </h3>
          <p className="text-sm text-amber-800 mb-4">
            {fr
              ? "Passe à Xalifly Pro pour débloquer l'historique des prix sur 6 mois et les alertes multi-passagers."
              : "Upgrade to Xalifly Pro to unlock 6-month price history and multi-passenger alerts."}
          </p>
        </div>
      </div>
      <Link
        href={fr ? "/pro" : "/en/pro"}
        className="inline-block rounded-lg bg-amber-600 text-white text-sm font-bold px-6 py-2 hover:bg-amber-700 transition-colors"
      >
        {fr ? "Passer à Xalifly Pro" : "Upgrade to Xalifly Pro"}
      </Link>
    </div>
  );
}
