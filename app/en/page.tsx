import type { Metadata } from "next";
import { HomeClient } from "@/app/HomeClient";
import { SITE_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "KEZA — Compare Flight Prices: Cash vs Miles",
  description:
    "Compare cash prices and miles redemptions for flights. Find the best value — pay with cash or points.",
  alternates: {
    canonical: `${SITE_URL}/en`,
    languages: { fr: `${SITE_URL}` },
  },
  openGraph: {
    title: "KEZA — Compare Flight Prices: Cash vs Miles",
    description:
      "Compare cash prices and miles redemptions for flights. Find the best value — pay with cash or points.",
    url: `${SITE_URL}/en`,
    locale: "en_US",
  },
};

export default function EnHomePage() {
  return <HomeClient defaultLang="en" />;
}
