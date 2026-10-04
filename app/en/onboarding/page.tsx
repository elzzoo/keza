import { OnboardingClient } from "@/app/onboarding/OnboardingClient";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata = {
  title: "Set up your profile | Xalifly",
  description:
    "Choose your loyalty programs to personalize cash or miles recommendations.",
  alternates: {
    canonical: `${SITE_URL}/en/onboarding`,
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

export default function EnglishOnboardingPage() {
  return <OnboardingClient lang="en" />;
}
