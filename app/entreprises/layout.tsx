import type { Metadata } from "next";

const TITLE       = "Xalifly pour les entreprises — Optimisez votre budget voyage d'affaires";
const DESCRIPTION = "Xalifly aide les travel managers et équipes finance à maximiser les économies sur chaque vol — en comparant automatiquement cash et miles pour toute votre équipe.";
const CANONICAL   = "https://keza-taupe.vercel.app/entreprises";

export const metadata: Metadata = {
  title:       TITLE,
  description: DESCRIPTION,
  alternates:  { canonical: CANONICAL },
  openGraph: {
    title:       TITLE,
    description: DESCRIPTION,
    url:         CANONICAL,
    siteName:    "Xalifly",
    locale:      "fr_FR",
    type:        "website",
    images: [{ url: `https://keza-taupe.vercel.app/api/og?lang=fr`, width: 1200, height: 630, alt: "Xalifly Entreprises" }],
  },
  twitter: {
    card:        "summary_large_image",
    title:       TITLE,
    description: DESCRIPTION,
    images:      [`https://keza-taupe.vercel.app/api/og?lang=fr`],
  },
};

export default function EntreprisesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
