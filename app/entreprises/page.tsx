"use client";

import { useState } from "react";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ContactForm } from "./ContactForm";

// Note: metadata export requires a server component.
// Since we use "use client" for lang state, metadata is declared but
// the canonical way is to have it in a server wrapper.
// For simplicity the metadata is kept as a comment here and can be
// promoted to a layout.tsx if needed.
//
// export const metadata: Metadata = {
//   title: "KEZA for Business — Optimize Your Corporate Travel Budget",
//   description: "KEZA helps travel managers and finance teams maximize savings on every flight — automatically comparing cash vs miles for your entire team.",
// };

const T = {
  fr: {
    /* Nav badge */
    forBusiness: "Pour les entreprises",

    /* Hero */
    heroEyebrow: "KEZA for Business",
    heroTitle: "Votre équipe voyage.",
    heroTitleAccent: "KEZA maximise chaque euro.",
    heroSub:
      "Vos collaborateurs dépensent en cash quand ils auraient dû utiliser leurs miles — et inversement. KEZA le détecte, automatiquement.",
    heroCTA: "Demander une démo",
    heroSecondary: "Voir nos tarifs",

    /* Metrics */
    m1Value: "180 $",
    m1Label: "d'économies moyennes par vol",
    m2Value: "12",
    m2Label: "entreprises embarquées",
    m3Value: "7 900+",
    m3Label: "routes analysées",

    /* Value props */
    vpTitle: "Tout ce dont votre équipe a besoin",
    vp: [
      {
        icon: "⚡",
        title: "Optimisez chaque déplacement",
        desc: "Comparez automatiquement cash vs miles pour tous vos collaborateurs, sur chaque vol, en temps réel.",
      },
      {
        icon: "📊",
        title: "Des économies mesurables",
        desc: "Suivez les économies réalisées par collaborateur, par trimestre, par route. Des chiffres pour votre DG.",
      },
      {
        icon: "🔌",
        title: "Zéro friction",
        desc: "S'intègre à vos outils de réservation existants. Aucune formation requise. Opérationnel en 48h.",
      },
    ],

    /* Use cases */
    ucTitle: "Conçu pour chaque équipe",
    uc: [
      {
        role: "Travel Managers",
        icon: "🗺️",
        points: [
          "Vue globale des dépenses voyages",
          "Alertes quand les miles auraient été plus rentables",
          "Rapports exportables pour audits",
        ],
      },
      {
        role: "Équipes Finance",
        icon: "💼",
        points: [
          "ROI clair sur chaque programme miles",
          "Intégration avec les notes de frais",
          "Suivi budgétaire en temps réel",
        ],
      },
      {
        role: "RH & Avantages",
        icon: "🎁",
        points: [
          "Valorisez les miles dans le package collaborateur",
          "Dashboards par équipe ou par pays",
          "Outil de fidélisation différenciant",
        ],
      },
    ],

    /* Pricing */
    pricingTag: "Tarification simple",
    pricingTitle: "À partir de",
    pricingPrice: "99 €",
    pricingPeriod: "/ mois par équipe",
    pricingNote:
      "Inclut jusqu'à 20 collaborateurs, routes illimitées, et support dédié.",
    pricingCTA: "Contacter les ventes",
    pricingLink: "#contact",

    /* Social proof */
    spTitle: "12 entreprises font déjà confiance à KEZA",
    spSub: "De la startup au grand groupe, sur 4 continents.",
    spLogos: "Rejoignez les premières entreprises pionnières.",

    /* Contact */
    contactTitle: "Discutons de votre projet",
    contactSub:
      "Réponse sous 24h. Pas de commercial agressif — juste une vraie conversation.",
  },

  en: {
    /* Nav badge */
    forBusiness: "For Business",

    /* Hero */
    heroEyebrow: "KEZA for Business",
    heroTitle: "Your team travels.",
    heroTitleAccent: "KEZA maximizes every euro.",
    heroSub:
      "Your employees spend cash when they should have used miles — and vice versa. KEZA detects it, automatically.",
    heroCTA: "Request a demo",
    heroSecondary: "See pricing",

    /* Metrics */
    m1Value: "$180",
    m1Label: "average savings per flight",
    m2Value: "12",
    m2Label: "companies onboarded",
    m3Value: "7,900+",
    m3Label: "routes analyzed",

    /* Value props */
    vpTitle: "Everything your team needs",
    vp: [
      {
        icon: "⚡",
        title: "Optimize every trip",
        desc: "Auto-compare cash vs miles for every employee, on every flight, in real time.",
      },
      {
        icon: "📊",
        title: "Real savings, measured",
        desc: "Track savings per employee, per quarter, per route. Hard numbers for your CFO.",
      },
      {
        icon: "🔌",
        title: "Zero friction",
        desc: "Integrates with your existing booking tools. No training needed. Live in 48h.",
      },
    ],

    /* Use cases */
    ucTitle: "Built for every team",
    uc: [
      {
        role: "Travel Managers",
        icon: "🗺️",
        points: [
          "Global view of travel spend",
          "Alerts when miles would have been more valuable",
          "Exportable reports for audits",
        ],
      },
      {
        role: "Finance Teams",
        icon: "💼",
        points: [
          "Clear ROI on every miles program",
          "Integration with expense reports",
          "Real-time budget tracking",
        ],
      },
      {
        role: "HR & Benefits",
        icon: "🎁",
        points: [
          "Monetize miles as an employee benefit",
          "Dashboards by team or country",
          "A differentiating retention tool",
        ],
      },
    ],

    /* Pricing */
    pricingTag: "Simple pricing",
    pricingTitle: "Starting at",
    pricingPrice: "€99",
    pricingPeriod: "/ month per team",
    pricingNote:
      "Includes up to 20 employees, unlimited routes, and dedicated support.",
    pricingCTA: "Contact sales",
    pricingLink: "#contact",

    /* Social proof */
    spTitle: "12 companies already trust KEZA",
    spSub: "From startups to enterprise, across 4 continents.",
    spLogos: "Be among the first companies to join.",

    /* Contact */
    contactTitle: "Let's talk about your needs",
    contactSub:
      "Reply within 24h. No pushy sales — just a real conversation.",
  },
};

export default function EntreprisesPage() {
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const t = T[lang];

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header lang={lang} onLangChange={setLang} />

      <main className="flex-1">

        {/* ── HERO ─────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Background gradient blob */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.12) 0%, transparent 70%)",
            }}
          />

          <div className="max-w-5xl mx-auto px-4 pt-20 pb-16 text-center space-y-6 animate-fade-up">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {t.heroEyebrow}
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl font-black leading-tight tracking-tight">
              <span className="text-fg">{t.heroTitle}</span>
              <br />
              <span className="bg-gradient-to-br from-blue-300 via-primary to-blue-500 bg-clip-text text-transparent">
                {t.heroTitleAccent}
              </span>
            </h1>

            <p className="text-base sm:text-lg text-muted max-w-2xl mx-auto leading-relaxed">
              {t.heroSub}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <a
                href="#contact"
                className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-sm tracking-wide transition-all duration-150 shadow-blue-sm hover:shadow-blue press-effect"
              >
                {t.heroCTA}
              </a>
              <a
                href="#pricing"
                className="px-6 py-3 rounded-xl border border-border hover:border-primary/40 text-fg hover:text-primary font-semibold text-sm transition-all duration-150"
              >
                {t.heroSecondary}
              </a>
            </div>
          </div>
        </section>

        {/* ── METRICS BAR ─────────────────────────────────────────── */}
        <section className="border-y border-border bg-surface">
          <div className="max-w-5xl mx-auto px-4 py-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border text-center">
              {[
                { value: t.m1Value, label: t.m1Label },
                { value: t.m2Value, label: t.m2Label },
                { value: t.m3Value, label: t.m3Label },
              ].map((m) => (
                <div key={m.label} className="py-5 sm:py-4 px-6 space-y-1">
                  <div className="text-3xl font-black text-primary">{m.value}</div>
                  <div className="text-xs text-muted font-medium uppercase tracking-wider">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── VALUE PROPS ─────────────────────────────────────────── */}
        <section className="max-w-5xl mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-fg">{t.vpTitle}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
            {t.vp.map((card) => (
              <div
                key={card.title}
                className="bg-surface border border-border rounded-2xl p-6 space-y-3 hover-lift shadow-card hover:shadow-card-hover transition-shadow duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl">
                  {card.icon}
                </div>
                <h3 className="font-bold text-fg text-base">{card.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── USE CASES ───────────────────────────────────────────── */}
        <section className="bg-surface border-y border-border">
          <div className="max-w-5xl mx-auto px-4 py-20">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-black text-fg">{t.ucTitle}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
              {t.uc.map((uc) => (
                <div
                  key={uc.role}
                  className="rounded-2xl border border-border bg-bg p-6 space-y-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{uc.icon}</span>
                    <h3 className="font-bold text-fg text-base">{uc.role}</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {uc.points.map((point) => (
                      <li key={point} className="flex items-start gap-2.5">
                        <svg
                          className="w-4 h-4 text-success flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-muted leading-relaxed">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING TEASER ──────────────────────────────────────── */}
        <section id="pricing" className="max-w-5xl mx-auto px-4 py-20">
          <div className="relative rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/5 via-surface to-surface overflow-hidden">
            {/* Subtle glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-3xl opacity-30"
              style={{ background: "rgb(59,130,246)" }}
            />
            <div className="relative px-8 py-12 text-center space-y-5">
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary uppercase tracking-wider">
                {t.pricingTag}
              </span>
              <div className="space-y-1">
                <p className="text-sm text-muted font-medium">{t.pricingTitle}</p>
                <div className="flex items-end justify-center gap-1">
                  <span className="text-5xl font-black text-fg">{t.pricingPrice}</span>
                  <span className="text-muted text-sm mb-2">{t.pricingPeriod}</span>
                </div>
              </div>
              <p className="text-sm text-muted max-w-sm mx-auto">{t.pricingNote}</p>
              <a
                href={t.pricingLink}
                className="inline-block px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-sm tracking-wide transition-all duration-150 shadow-blue-sm hover:shadow-blue press-effect"
              >
                {t.pricingCTA}
              </a>
            </div>
          </div>
        </section>

        {/* ── SOCIAL PROOF ────────────────────────────────────────── */}
        <section className="border-t border-border bg-surface">
          <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-success/10 border border-success/20 text-xs font-bold text-success">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
              {t.spTitle}
            </div>
            <p className="text-sm text-muted">{t.spSub}</p>

            {/* Logo placeholders */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="w-28 h-10 rounded-xl bg-surface-2 border border-border skeleton opacity-50"
                />
              ))}
            </div>
            <p className="text-xs text-subtle pt-2">{t.spLogos}</p>
          </div>
        </section>

        {/* ── CONTACT FORM ────────────────────────────────────────── */}
        <section id="contact" className="max-w-5xl mx-auto px-4 py-20">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8 space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-fg">{t.contactTitle}</h2>
              <p className="text-muted text-sm">{t.contactSub}</p>
            </div>
            <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-card">
              <ContactForm lang={lang} />
            </div>
          </div>
        </section>

      </main>

      <Footer lang={lang} />
    </div>
  );
}
