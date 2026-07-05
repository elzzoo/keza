import type { Metadata } from "next";
import { MilesAlertsClient } from "./MilesAlertsClient";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Alertes Miles — KEZA",
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
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">Alertes Miles</h1>
      <p className="text-gray-600 mb-8">
        Définissez des alertes pour les bonnes affaires miles. Nous vous enverrons un email quand votre prix cible est atteint.
      </p>
      <MilesAlertsClient />
    </div>
  );
}
