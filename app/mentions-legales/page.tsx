import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Mentions légales — KEZA",
  description: "Mentions légales et informations juridiques de KEZA.",
};

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </Link>

        <h1 className="text-3xl font-black text-fg mb-8">Mentions légales</h1>

        <div className="space-y-8 text-sm text-muted leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Éditeur du site</h2>
            <p>
              KEZA est un service en ligne de comparaison de prix de vols (cash vs miles).
            </p>
            <p className="mt-2">
              Éditeur : KEZA Inc. (en cours d&apos;immatriculation, Delaware, États-Unis)
            </p>
            <p className="mt-2">
              Contact : <a href="mailto:contact@keza.app" className="text-primary hover:underline">contact@keza.app</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Hébergement</h2>
            <p>
              Hébergement : Vercel Inc., 340 Pine Street, Suite 900, San Francisco, CA 94104, États-Unis.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Protection des données (RGPD)</h2>
            <p>
              Conformément au Règlement Général sur la Protection des Données (RGPD), les utilisateurs
              disposent d&apos;un droit d&apos;accès, de rectification et de suppression de leurs données
              personnelles. Pour exercer ces droits, contactez-nous à{" "}
              <a href="mailto:privacy@keza.app" className="text-primary hover:underline">privacy@keza.app</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Propriété intellectuelle</h2>
            <p>
              L&apos;ensemble des contenus présents sur le site KEZA (textes, graphismes, logos, icônes, logiciels)
              est protégé par les lois relatives à la propriété intellectuelle. Toute reproduction,
              représentation ou diffusion, en tout ou partie, du contenu de ce site est interdite sans
              autorisation préalable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Données de prix</h2>
            <p>
              Les prix affichés sur KEZA sont fournis à titre indicatif et proviennent de sources tierces.
              KEZA ne garantit pas l&apos;exactitude, l&apos;exhaustivité ou l&apos;actualité des prix affichés.
              Les prix peuvent varier au moment de la réservation auprès de la compagnie aérienne ou de
              l&apos;agence de voyage.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Responsabilité</h2>
            <p>
              KEZA est un comparateur et ne vend pas de billets d&apos;avion. KEZA ne saurait être tenu
              responsable des décisions prises par les utilisateurs sur la base des informations fournies.
              L&apos;utilisateur est seul responsable de ses choix de réservation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Liens hypertextes</h2>
            <p>
              Le site KEZA peut contenir des liens vers des sites tiers. KEZA n&apos;exerce aucun contrôle
              sur ces sites et décline toute responsabilité quant à leur contenu.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Droit applicable</h2>
            <p>
              Les présentes mentions légales sont soumises au droit de l&apos;État du Delaware, États-Unis.
              Tout litige relatif à l&apos;utilisation du site sera soumis à la compétence des juridictions
              compétentes. Les utilisateurs situés dans l&apos;Union européenne bénéficient des protections
              prévues par le RGPD.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
