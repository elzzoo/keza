import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "404 | Xalifly",
  description: "Return to Xalifly to compare cash fares vs miles.",
  robots: "noindex",
};

const COPY = {
  fr: {
    eyebrow: "Cash ou Miles ?",
    title: "Page introuvable",
    description:
      "Cette page n'existe pas ou a été déplacée. Pas de panique — revenez à l'accueil pour trouver le meilleur tarif pour votre prochain vol.",
    homeHref: "/",
    homeCta: "← Retour à l'accueil",
    dealsHref: "/deals",
    dealsCta: "Voir les deals du moment",
    quickLinks: [
      { href: "/programmes", label: "Programmes miles" },
      { href: "/carte", label: "Carte destinations" },
      { href: "/comparer", label: "Comparer" },
      { href: "/alertes", label: "Mes alertes" },
    ],
  },
  en: {
    eyebrow: "Cash or Miles?",
    title: "Page not found",
    description:
      "This page does not exist or has moved. Return home to find the best option for your next flight.",
    homeHref: "/en",
    homeCta: "Back home",
    dealsHref: "/en/deals",
    dealsCta: "See current deals",
    quickLinks: [
      { href: "/en/programmes", label: "Miles programs" },
      { href: "/en/carte", label: "Destination map" },
      { href: "/en/comparer", label: "Compare" },
      { href: "/en/alertes", label: "My alerts" },
    ],
  },
};

export default async function NotFound() {
  const headersList = await headers();
  const locale = headersList.get("x-locale") === "en" ? "en" : "fr";
  const copy = COPY[locale];

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 text-center">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-1">
        <span className="text-4xl font-black leading-none">
          <span className="text-primary">Xali</span>
          <span className="text-fg">fly</span>
        </span>
        <span className="text-[10px] font-semibold tracking-widest uppercase text-muted">
          {copy.eyebrow}
        </span>
      </div>

      {/* 404 badge */}
      <div className="w-20 h-20 rounded-2xl bg-surface border border-border flex items-center justify-center mb-6">
        <span className="text-3xl font-black text-primary">404</span>
      </div>

      <h1 className="text-2xl font-black text-fg mb-2">{copy.title}</h1>
      <p className="text-sm text-muted max-w-sm mb-8">
        {copy.description}
      </p>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={copy.homeHref}
          className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          {copy.homeCta}
        </Link>
        <Link
          href={copy.dealsHref}
          className="px-6 py-2.5 rounded-xl bg-surface border border-border text-fg text-sm font-semibold hover:bg-surface-2 transition-colors"
        >
          {copy.dealsCta}
        </Link>
      </div>

      {/* Quick nav */}
      <div className="mt-12 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted">
        {copy.quickLinks.map(({ href, label }) => (
          <Link key={href} href={href} className="hover:text-fg transition-colors">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
