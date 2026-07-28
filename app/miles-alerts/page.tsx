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
  return <MilesAlertsClient />;
}
