import type { Metadata } from "next";
import { SITE_URL } from "@/lib/siteConfig";

const TITLE       = "Xalifly pour les entreprises — Optimisez votre budget voyage d'affaires";
const DESCRIPTION = "Xalifly aide les travel managers et équipes finance à maximiser les économies sur chaque vol — en comparant automatiquement cash et miles pour toute votre équipe.";
const CANONICAL   = `${SITE_URL}/entreprises`;

export const metadata: Metadata = {
  title:       TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: CANONICAL,
    languages: { fr: CANONICAL, en: `${SITE_URL}/en/entreprises` },
  },
  openGraph: {
    title:       TITLE,
    description: DESCRIPTION,
    url:         CANONICAL,
    siteName:    "Xalifly",
    locale:      "fr_FR",
    type:        "website",
    images: [{ url: `${SITE_URL}/api/og?lang=fr`, width: 1200, height: 630, alt: "Xalifly Entreprises" }],
  },
  twitter: {
    card:        "summary_large_image",
    title:       TITLE,
    description: DESCRIPTION,
    images:      [`${SITE_URL}/api/og?lang=fr`],
  },
};

export default function EntreprisesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
