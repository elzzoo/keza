import type { Metadata } from "next";
import { HomeClient } from "./HomeClient";
import { SITE_URL } from "@/lib/siteConfig";
import { HOME_METADATA } from "@/lib/homeMetadata";

const TITLE = HOME_METADATA.fr.title;
const DESCRIPTION = HOME_METADATA.fr.description;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: SITE_URL,
    languages: {
      fr: SITE_URL,
      en: `${SITE_URL}/en`,
      "x-default": SITE_URL,
    },
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Xalifly",
    locale: HOME_METADATA.fr.ogLocale,
    type: "website",
    images: [{ url: `${SITE_URL}/api/og?lang=fr`, width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${SITE_URL}/api/og?lang=fr`],
  },
};

export default function HomePage() {
  return <HomeClient defaultLang="fr" />;
}
