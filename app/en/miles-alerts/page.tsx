import type { Metadata } from "next";
import { MilesAlertsClient } from "@/app/miles-alerts/MilesAlertsClient";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Miles Alerts — Manage Rewards Deals | Xalifly",
  description:
    "Set alerts for great miles deals. Get notified when excellent redemption values are available for your favorite programs.",
  openGraph: {
    title: "Miles Alerts — Manage Rewards Deals | Xalifly",
    description:
      "Set alerts for great miles deals. Get notified when excellent redemption values are available for your favorite programs.",
    url: `${SITE_URL}/en/miles-alerts`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Miles Alerts — Manage Rewards Deals | Xalifly",
    description:
      "Set alerts for great miles deals. Get notified when excellent redemption values are available for your favorite programs.",
  },
  alternates: {
    canonical: `${SITE_URL}/en/miles-alerts`,
    languages: {
      fr: `${SITE_URL}/miles-alerts`,
      en: `${SITE_URL}/en/miles-alerts`,
      "x-default": `${SITE_URL}/miles-alerts`,
    },
  },
};

export default function EnMilesAlertsPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">Miles Alerts</h1>
      <p className="text-gray-600 mb-8">
        Set alerts for great miles deals. We&apos;ll notify you by email when your target price is reached.
      </p>
      <MilesAlertsClient />
    </div>
  );
}
