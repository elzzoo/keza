import type { Metadata } from "next";
import { MilesAlertsClient } from "./MilesAlertsClient";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Alertes Miles — Xalifly",
  description: "Gérez vos alertes miles et recevez une notification quand une excellente affaire est disponible.",
  alternates: {
    canonical: `${SITE_URL}/miles-alerts`,
    languages: {
      fr: `${SITE_URL}/miles-alerts`,
      en: `${SITE_URL}/en/miles-alerts`,
      "x-default": `${SITE_URL}/miles-alerts`,
    },
  },
};

export default function MilesAlertsPage() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black leading-tight">
            <span className="bg-gradient-to-br from-blue-300 via-primary to-blue-500 bg-clip-text text-transparent">
              Alertes Miles
            </span>
          </h1>
          <p className="text-sm text-muted mt-2">
            Définissez des alertes pour les bonnes affaires miles. Nous vous enverrons un email quand votre prix cible est atteint.
          </p>
        </div>
        <MilesAlertsClient />
      </div>
    </div>
  );
}
