// app/en/alertes/page.tsx
import type { Metadata } from "next";
import { AlertesClient } from "@/app/alertes/AlertesClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Price Alerts — Track Flights | KEZA",
  description:
    "Set price alerts for your flights. Get notified when prices drop or miles redemptions improve.",
  openGraph: {
    title: "Price Alerts — Track Flights | KEZA",
    description:
      "Set price alerts for your flights. Get notified when prices drop or miles redemptions improve.",
    url: `${SITE_URL}/en/alertes`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Price Alerts — Track Flights | KEZA",
    description:
      "Set price alerts for your flights. Get notified when prices drop or miles redemptions improve.",
  },
  alternates: {
    canonical: `${SITE_URL}/en/alertes`,
    languages: {
      fr: `${SITE_URL}/alertes`,
      en: `${SITE_URL}/en/alertes`,
      "x-default": `${SITE_URL}/alertes`,
    },
  },
};

export default function EnAlertesPage() {
  return (
    <ErrorBoundary lang="en">
      <AlertesClient />
    </ErrorBoundary>
  );
}
