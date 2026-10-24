import type { Metadata } from "next";
import { HomeClient } from "@/app/HomeClient";
import { SITE_URL } from "@/lib/siteConfig";
import { HOME_METADATA } from "@/lib/homeMetadata";

export const metadata: Metadata = {
  title: HOME_METADATA.en.title,
  description: HOME_METADATA.en.description,
  alternates: {
    canonical: `${SITE_URL}/en`,
    languages: {
      fr: SITE_URL,
      en: `${SITE_URL}/en`,
      "x-default": SITE_URL,
    },
  },
  openGraph: {
    title: HOME_METADATA.en.title,
    description: HOME_METADATA.en.description,
    url: `${SITE_URL}/en`,
    locale: HOME_METADATA.en.ogLocale,
  },
};

export default function EnHomePage() {
  return <HomeClient defaultLang="en" />;
}
