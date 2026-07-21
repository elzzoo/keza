import type { Metadata } from "next";
import { AlertesClient } from "./AlertesClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Mes alertes prix | Xalifly",
  description:
    "Gérez vos alertes prix Xalifly — recevez un email quand un tarif baisse de 10%+.",
  alternates: {
    canonical: `${SITE_URL}/alertes`,
    languages: {
      fr: `${SITE_URL}/alertes`,
      en: `${SITE_URL}/en/alertes`,
      "x-default": `${SITE_URL}/alertes`,
    },
  },
};

export default function AlertesPage() {
  return (
    <ErrorBoundary lang="fr">
      <AlertesClient />
    </ErrorBoundary>
  );
}
