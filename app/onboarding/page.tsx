import { OnboardingClient } from "./OnboardingClient";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata = {
  title: "Configurer ton profil | Xalifly",
  description:
    "Choisis tes programmes de fidelite pour personnaliser les recommandations cash ou miles.",
  alternates: {
    canonical: `${SITE_URL}/onboarding`,
    languages: {
      fr: `${SITE_URL}/onboarding`,
      en: `${SITE_URL}/en/onboarding`,
      "x-default": `${SITE_URL}/onboarding`,
    },
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function OnboardingPage() {
  return <OnboardingClient lang="fr" />;
}
