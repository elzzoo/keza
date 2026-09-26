import type { Metadata } from "next";
import EntreprisesPage from "@/app/entreprises/page";
import { SITE_URL } from "@/lib/siteConfig";

const TITLE = "Xalifly for Business — Optimize Your Corporate Travel Budget";
const DESCRIPTION =
  "Xalifly helps travel managers and finance teams maximize savings on every flight by comparing cash and miles automatically.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/en/entreprises`,
    languages: { fr: `${SITE_URL}/entreprises`, en: `${SITE_URL}/en/entreprises` },
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/en/entreprises`,
    siteName: "Xalifly",
    locale: "en_US",
    type: "website",
    images: [{ url: `${SITE_URL}/api/og?lang=en`, width: 1200, height: 630, alt: "Xalifly for Business" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${SITE_URL}/api/og?lang=en`],
  },
};

export default function EnglishBusinessPage() {
  return <EntreprisesPage initialLang="en" />;
}
