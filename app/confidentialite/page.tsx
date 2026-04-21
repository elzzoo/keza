import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité — KEZA",
  description: "Politique de confidentialité et protection des données personnelles de KEZA.",
};

export default function Confidentialite() {
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

        <h1 className="text-3xl font-black text-fg mb-8">Politique de confidentialité</h1>

        <div className="space-y-8 text-sm text-muted leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Introduction</h2>
            <p>
              KEZA s&apos;engage à protéger la vie privée de ses utilisateurs. Cette politique de
              confidentialité décrit les données que nous collectons, comment nous les utilisons et
              les droits dont vous disposez conformément au Règlement Général sur la Protection des
              Données (RGPD).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Données collectées</h2>
            <p className="mb-2">KEZA collecte les données suivantes :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li><strong className="text-fg">Recherches de vols</strong> : aéroports de départ et d&apos;arrivée, dates, classe de voyage. Ces données sont stockées localement sur votre appareil (localStorage) et ne sont pas transmises à nos serveurs.</li>
              <li><strong className="text-fg">Adresse email</strong> : uniquement si vous créez une alerte prix. Utilisée exclusivement pour vous envoyer des notifications de baisse de prix.</li>
              <li><strong className="text-fg">Données de navigation</strong> : pages visitées, durée de visite, type d&apos;appareil. Collectées via Plausible Analytics, un outil respectueux de la vie privée qui ne dépose aucun cookie et n&apos;utilise pas de données personnelles identifiables.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Cookies</h2>
            <p>
              KEZA <strong className="text-fg">ne dépose aucun cookie</strong> sur votre appareil.
              Vos préférences (langue, devise, thème) sont stockées dans le localStorage de votre
              navigateur et ne sont pas accessibles par des tiers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Utilisation des données</h2>
            <p className="mb-2">Vos données sont utilisées pour :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li>Fournir les résultats de comparaison de prix de vols</li>
              <li>Envoyer des alertes de baisse de prix (si vous en avez créé)</li>
              <li>Améliorer le service via des statistiques anonymes de navigation</li>
            </ul>
            <p className="mt-2">
              Vos données ne sont <strong className="text-fg">jamais vendues, louées ou partagées</strong> avec
              des tiers à des fins commerciales.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Services tiers</h2>
            <p className="mb-2">KEZA utilise les services tiers suivants :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li><strong className="text-fg">Plausible Analytics</strong> : statistiques anonymes de navigation (sans cookies, conforme RGPD)</li>
              <li><strong className="text-fg">Vercel</strong> : hébergement du site (données de performance)</li>
              <li><strong className="text-fg">Upstash</strong> : stockage des alertes prix (données chiffrées)</li>
              <li><strong className="text-fg">Resend</strong> : envoi des emails d&apos;alerte prix</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Conservation des données</h2>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li><strong className="text-fg">Alertes prix</strong> : conservées jusqu&apos;à désabonnement ou 90 jours d&apos;inactivité</li>
              <li><strong className="text-fg">Statistiques de navigation</strong> : anonymes, conservées 2 ans maximum</li>
              <li><strong className="text-fg">Préférences locales</strong> : stockées sur votre appareil, supprimables à tout moment</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Vos droits (RGPD)</h2>
            <p className="mb-2">Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              <li><strong className="text-fg">Droit d&apos;accès</strong> : obtenir une copie de vos données personnelles</li>
              <li><strong className="text-fg">Droit de rectification</strong> : corriger vos données inexactes</li>
              <li><strong className="text-fg">Droit à l&apos;effacement</strong> : demander la suppression de vos données</li>
              <li><strong className="text-fg">Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
              <li><strong className="text-fg">Droit d&apos;opposition</strong> : vous opposer au traitement de vos données</li>
            </ul>
            <p className="mt-3">
              Pour exercer ces droits, contactez-nous à : {" "}
              <a href="mailto:privacy@keza.app" className="text-primary hover:underline">privacy@keza.app</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Notifications push</h2>
            <p>
              Si vous activez les notifications push, votre abonnement est stocké de manière sécurisée.
              Vous pouvez désactiver les notifications à tout moment via les paramètres de votre navigateur.
              Aucune donnée personnelle n&apos;est utilisée pour le ciblage publicitaire.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-fg mb-3">Modifications</h2>
            <p>
              Cette politique peut être mise à jour. En cas de modification significative,
              un avis sera affiché sur le site. Dernière mise à jour : avril 2026.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
