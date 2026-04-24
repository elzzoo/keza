import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page introuvable | KEZA",
  description: "Cette page n'existe pas. Retournez à KEZA pour comparer vos vols cash vs miles.",
  robots: "noindex",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 text-center">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-1">
        <span className="text-4xl font-black leading-none">
          <span className="text-primary">KE</span>
          <span className="text-fg">ZA</span>
        </span>
        <span className="text-[10px] font-semibold tracking-widest uppercase text-muted">
          Cash ou Miles ?
        </span>
      </div>

      {/* 404 badge */}
      <div className="w-20 h-20 rounded-2xl bg-surface border border-border flex items-center justify-center mb-6">
        <span className="text-3xl font-black text-primary">404</span>
      </div>

      <h1 className="text-2xl font-black text-fg mb-2">Page introuvable</h1>
      <p className="text-sm text-muted max-w-sm mb-8">
        Cette page n&apos;existe pas ou a été déplacée. Pas de panique — revenez à l&apos;accueil pour
        trouver le meilleur tarif pour votre prochain vol.
      </p>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          ← Retour à l&apos;accueil
        </Link>
        <Link
          href="/deals"
          className="px-6 py-2.5 rounded-xl bg-surface border border-border text-fg text-sm font-semibold hover:bg-surface-2 transition-colors"
        >
          Voir les deals du moment
        </Link>
      </div>

      {/* Quick nav */}
      <div className="mt-12 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted">
        {[
          { href: "/programmes", label: "Programmes miles" },
          { href: "/carte", label: "Carte destinations" },
          { href: "/comparer", label: "Comparer" },
          { href: "/alertes", label: "Mes alertes" },
        ].map(({ href, label }) => (
          <Link key={href} href={href} className="hover:text-fg transition-colors">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
