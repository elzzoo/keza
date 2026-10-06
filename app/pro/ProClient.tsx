"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import type { ProAccessStatus } from "@/lib/proAccess";
import { EMAIL_DOMAIN } from "@/lib/brand";

const COPY = {
  fr: {
    features: [
      { icon: "bell", title: "Alertes illimitées", desc: "Surveillez autant de routes que vous voulez, sans limite." },
      { icon: "device", title: "Multi-devices", desc: "Notifications push sur tous vos appareils simultanément." },
      { icon: "chart", title: "Historique 6 mois", desc: "Visualisez l'évolution des prix et choisissez le bon moment." },
      { icon: "passengers", title: "Alertes multi-passagers", desc: "Prix pour 2, 3 ou 4 passagers directement dans l'alerte." },
    ],
    emailRequired: "Veuillez entrer votre email",
    emailInvalid: "Veuillez entrer une adresse email valide",
    waitlistError: "Impossible de rejoindre la liste d'attente.",
    networkError: "Erreur réseau. Réessaie.",
    upgradedTitle: "Bienvenue dans Xalifly Pro !",
    upgradedDesc: "Tes alertes illimitées sont maintenant actives. Crée ta première alerte dès maintenant.",
    manageAlerts: "Gérer mes alertes →",
    price: "9$ / mois",
    heroDesc: "Alertes illimitées, notifications multi-devices et historique des prix — pour les voyageurs sérieux.",
    waitlistedTitle: "Tu es sur la liste !",
    waitlistedWithPosition: (position: number) => `Tu es n°${position} sur la liste. On te contactera dès l'ouverture des paiements.`,
    waitlistedNoPosition: "On te contactera dès l'ouverture des paiements Xalifly Pro.",
    waitlistedHint: "En attendant, profite des 3 alertes gratuites + parrainage pour en débloquer plus.",
    createFreeAlert: "Créer une alerte gratuite →",
    checkoutTitle: "Passer en Pro",
    waitlistTitle: "Rejoindre la liste d'attente",
    checkoutDesc: "Sans engagement · Annulable à tout moment · Paiement via Lemon Squeezy",
    waitlistDesc: "Les paiements ouvriront très bientôt — sois prévenu en premier.",
    emailPlaceholder: "ton@email.com",
    upgradeButton: "Passer en Pro — 9$ / mois →",
    waitlistButton: "Rejoindre la liste →",
    securePayment: "Paiement sécurisé · Facture email automatique",
    freeSignup: "Inscription gratuite — aucun engagement.",
    tableFeature: "Fonctionnalité",
    tableFree: "Gratuit",
    tablePro: "Pro 9$/mois",
    rows: [
      ["Alertes actives", "3", "Illimitées"],
      ["Notifications push", "1 device", "Multi-devices"],
      ["Historique des prix", "—", "6 mois"],
      ["Multi-passagers", "—", "✓"],
      ["Digest hebdo", "✓", "✓"],
    ],
    proStatusTitle: "Tu as Xalifly Pro",
    proStatusDesc: "Profite de tes alertes illimitées et de toutes les fonctionnalités Pro.",
    trialTitle: "Essai gratuit actif",
    trialWithDays: (days: number) => `Tu as ${days} jour${days > 1 ? "s" : ""} d'essai gratuit restant.`,
    trialActive: "Ton essai gratuit est actif.",
    createAlert: "Créer une alerte →",
    faqTitle: "Questions fréquentes",
    faqs: [
      ["Combien coûte Xalifly Pro ?", "Xalifly Pro coûte 9$ par mois. Tu peux commencer par un essai gratuit de 7 jours, sans carte de crédit."],
      ["Puis-je annuler mon abonnement ?", "Oui, tu peux annuler ton abonnement à tout moment. Tu conserveras l'accès Pro jusqu'à la fin de ta période de facturation actuelle."],
      ["Qu'est-ce qui est inclus dans Pro ?", "Alertes illimitées, notifications push multi-devices, historique des prix sur 6 mois, et alertes pour plusieurs passagers simultanément."],
      ["Comment fonctionne l'essai gratuit ?", "Tu as 7 jours d'accès gratuit à toutes les fonctionnalités Pro. Aucune carte de crédit n'est requise. Si tu ne convertis pas à la fin de l'essai, ton compte reviendra à la version gratuite."],
      ["Est-ce que mes données sont sûres ?", "Oui. Xalifly utilise HTTPS et les meilleures pratiques de sécurité pour protéger tes informations personnelles."],
    ],
    question: "Question ?",
  },
  en: {
    features: [
      { icon: "bell", title: "Unlimited alerts", desc: "Track as many routes as you want, with no alert cap." },
      { icon: "device", title: "Multi-device push", desc: "Receive push notifications across all your devices." },
      { icon: "chart", title: "6-month history", desc: "See price trends and choose the right booking moment." },
      { icon: "passengers", title: "Multi-passenger alerts", desc: "Track prices for 2, 3, or 4 passengers in each alert." },
    ],
    emailRequired: "Please enter your email",
    emailInvalid: "Please enter a valid email address",
    waitlistError: "Could not join the waitlist.",
    networkError: "Network error. Try again.",
    upgradedTitle: "Welcome to Xalifly Pro!",
    upgradedDesc: "Your unlimited alerts are now active. Create your first alert whenever you're ready.",
    manageAlerts: "Manage my alerts →",
    price: "$9 / month",
    heroDesc: "Unlimited alerts, multi-device notifications, and price history for serious travellers.",
    waitlistedTitle: "You're on the list!",
    waitlistedWithPosition: (position: number) => `You're #${position} on the list. We'll contact you as soon as payments open.`,
    waitlistedNoPosition: "We'll contact you as soon as Xalifly Pro payments open.",
    waitlistedHint: "In the meantime, use your 3 free alerts and referrals to unlock more.",
    createFreeAlert: "Create a free alert →",
    checkoutTitle: "Upgrade to Pro",
    waitlistTitle: "Join the waitlist",
    checkoutDesc: "No commitment · Cancel anytime · Payment via Lemon Squeezy",
    waitlistDesc: "Payments will open soon — be first to know.",
    emailPlaceholder: "you@example.com",
    upgradeButton: "Upgrade to Pro — $9 / month →",
    waitlistButton: "Join the waitlist →",
    securePayment: "Secure payment · Automatic email receipt",
    freeSignup: "Free signup — no commitment.",
    tableFeature: "Feature",
    tableFree: "Free",
    tablePro: "Pro $9/mo",
    rows: [
      ["Active alerts", "3", "Unlimited"],
      ["Push notifications", "1 device", "Multi-device"],
      ["Price history", "—", "6 months"],
      ["Multi-passenger alerts", "—", "✓"],
      ["Weekly digest", "✓", "✓"],
    ],
    proStatusTitle: "You have Xalifly Pro",
    proStatusDesc: "Enjoy unlimited alerts and all Pro features.",
    trialTitle: "Free trial active",
    trialWithDays: (days: number) => `You have ${days} free trial day${days > 1 ? "s" : ""} left.`,
    trialActive: "Your free trial is active.",
    createAlert: "Create an alert →",
    faqTitle: "Frequently asked questions",
    faqs: [
      ["How much does Xalifly Pro cost?", "Xalifly Pro costs $9 per month. You can start with a 7-day free trial, no credit card required."],
      ["Can I cancel my subscription?", "Yes. You can cancel anytime and keep Pro access until the end of your current billing period."],
      ["What's included in Pro?", "Unlimited alerts, multi-device push notifications, 6-month price history, and alerts for multiple passengers at once."],
      ["How does the free trial work?", "You get 7 days of free access to every Pro feature. No credit card is required. If you don't convert, your account returns to the free plan."],
      ["Is my data safe?", "Yes. Xalifly uses HTTPS and security best practices to protect your personal information."],
    ],
    question: "Question?",
  },
} as const;

type CheckoutStatus = "idle" | "loading" | "waitlisted";

type ProIconName = "bell" | "device" | "chart" | "passengers" | "check" | "spark" | "lock" | "party";

function ProIcon({ name, className = "h-4 w-4" }: { name: ProIconName | string; className?: string }) {
  const common = {
    className,
    fill: "none",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "bell") {
    return (
      <svg {...common}>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" />
        <path d="M10 21h4" />
      </svg>
    );
  }
  if (name === "device") {
    return (
      <svg {...common}>
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" />
      </svg>
    );
  }
  if (name === "chart") {
    return (
      <svg {...common}>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 3-4 3 2 4-7" />
      </svg>
    );
  }
  if (name === "passengers") {
    return (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  if (name === "spark") {
    return (
      <svg {...common}>
        <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" />
      </svg>
    );
  }
  if (name === "lock") {
    return (
      <svg {...common}>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    );
  }
  if (name === "party") {
    return (
      <svg {...common}>
        <path d="M5.8 11.3 2 22l10.7-3.8" />
        <path d="M4 14.5 9.5 20" />
        <path d="M13 5a2 2 0 0 0 2 2c1.7 0 3-1.3 3-3" />
        <path d="M15 14a2 2 0 0 1 2-2c1.7 0 3 1.3 3 3" />
        <path d="M9 4h.01" />
        <path d="M20 8h.01" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

interface ProClientProps {
  upgraded?: boolean;
  isLoggedIn?: boolean;
  proStatus?: ProAccessStatus | null;
  userEmail?: string;
  initialEmail?: string;
  lang?: "fr" | "en";
}

// Basic email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ProClient({
  upgraded,
  isLoggedIn,
  proStatus,
  userEmail,
  initialEmail,
  lang = "fr",
}: ProClientProps) {
  const router = useRouter();
  const t = COPY[lang];
  const alertesPath = lang === "en" ? "/en/alertes" : "/alertes";
  const proPath = lang === "en" ? "/en/pro" : "/pro";
  const connexionPath = lang === "en" ? "/en/connexion" : "/connexion";
  const [email, setEmail] = useState(userEmail || initialEmail || "");
  const [emailError, setEmailError] = useState("");
  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatus>("idle");
  const [checkoutError, setCheckoutError] = useState("");
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [paymentsAvailable, setPaymentsAvailable] = useState(true);

  // Validate email on change
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (value.trim() === "") {
      setEmailError(t.emailRequired);
    } else if (!EMAIL_REGEX.test(value.trim())) {
      setEmailError(t.emailInvalid);
    } else {
      setEmailError("");
    }
  };

  async function joinWaitlist(emailValue: string): Promise<boolean> {
    try {
      const res = await fetch("/api/pro/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue }),
      });
      const data = await res.json().catch(() => ({})) as { position?: number; error?: string };
      if (res.ok) {
        setWaitlistPosition(data.position ?? null);
        setCheckoutStatus("waitlisted");
        return true;
      }
      setCheckoutError(data.error ?? t.waitlistError);
      setCheckoutStatus("idle");
      return false;
    } catch {
      setCheckoutError(t.networkError);
      setCheckoutStatus("idle");
      return false;
    }
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = email.trim();

    // Validate email before proceeding
    if (!trimmed) {
      setEmailError(t.emailRequired);
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError(t.emailInvalid);
      return;
    }

    // If not logged in, redirect to sign in with return URL + email
    if (!isLoggedIn) {
      const callbackUrl = trimmed
        ? `${proPath}?email=${encodeURIComponent(trimmed)}`
        : proPath;
      router.push(`${connexionPath}?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }

    if (checkoutStatus === "loading") return;
    setCheckoutStatus("loading");
    setCheckoutError("");

    // If we've already detected payments aren't live, skip straight to waitlist.
    if (!paymentsAvailable) {
      await joinWaitlist(trimmed);
      return;
    }

    try {
      const res = await fetch("/api/pro/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json() as { url?: string | undefined; checkoutUrl?: string; error?: string };
      const checkoutUrl = data.url || data.checkoutUrl;
      if (res.ok && checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }
      if (res.status === 503) {
        // Payments not yet configured — auto-fallback to waitlist signup.
        setPaymentsAvailable(false);
        await joinWaitlist(trimmed);
        return;
      }
      setCheckoutError(data.error ?? (lang === "fr" ? "Une erreur est survenue." : "Something went wrong."));
      setCheckoutStatus("idle");
    } catch {
      setCheckoutError(t.networkError);
      setCheckoutStatus("idle");
    }
  }

  if (upgraded) {
    return (
      <div className="min-h-screen bg-bg flex flex-col">
        <Header lang={lang} onLangChange={() => {}} />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <ProIcon name="party" className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-black text-fg mb-2">{t.upgradedTitle}</h1>
            <p className="text-sm text-muted mb-6">
              {t.upgradedDesc}
            </p>
            <Link
              href={alertesPath}
              className="inline-block rounded-lg bg-primary text-white text-sm font-bold px-6 py-3 hover:bg-primary/90 transition-colors"
            >
              {t.manageAlerts}
            </Link>
          </div>
        </main>
        <Footer lang={lang} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header lang={lang} onLangChange={() => {}} />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pb-16">
        {/* Hero */}
        <div className="pt-12 pb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            {t.price}
          </div>
          <h1 className="text-4xl font-black text-fg mb-3">
            <span className="text-primary">Xalifly</span> Pro
          </h1>
          <p className="text-base text-muted max-w-md mx-auto">
            {t.heroDesc}
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-2 gap-3 mb-10">
          {t.features.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-surface p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400">
                <ProIcon name={f.icon} className="h-4 w-4" />
              </span>
              <p className="mt-2 text-sm font-semibold text-fg">{f.title}</p>
              <p className="mt-1 text-xs text-muted">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Checkout / waitlist form */}
        {checkoutStatus === "waitlisted" ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <ProIcon name="check" className="h-5 w-5" />
            </div>
            <p className="font-semibold text-fg mb-1">{t.waitlistedTitle}</p>
            <p className="text-xs text-muted">
              {waitlistPosition
                ? t.waitlistedWithPosition(waitlistPosition)
                : t.waitlistedNoPosition}
            </p>
            <p className="mt-3 text-xs text-muted/60">
              {t.waitlistedHint}
            </p>
            <Link
              href={alertesPath}
              className="mt-4 inline-block rounded-lg bg-primary text-white text-sm font-bold px-5 py-2 hover:bg-primary/90 transition-colors"
            >
              {t.createFreeAlert}
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-fg">
                {paymentsAvailable ? t.checkoutTitle : t.waitlistTitle}
              </p>
              <span className="text-lg font-black text-amber-400">{t.price}</span>
            </div>
            <p className="text-xs text-muted mb-4">
              {paymentsAvailable
                ? t.checkoutDesc
                : t.waitlistDesc}
            </p>
            <form onSubmit={handleCheckout} className="space-y-2">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className={`w-full rounded-xl border bg-bg px-4 py-3 text-sm text-fg placeholder:text-muted focus:outline-none transition-all ${
                    emailError
                      ? "border-red-500/50 focus:border-red-500"
                      : "border-border focus:border-amber-500/50"
                  }`}
                />
                {emailError && (
                  <p className="mt-1.5 text-xs text-red-500">{emailError}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={checkoutStatus === "loading" || !email.trim() || !!emailError}
                className="w-full rounded-xl bg-amber-500 text-black text-sm font-black py-3 hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                {checkoutStatus === "loading"
                  ? "…"
                  : paymentsAvailable
                    ? t.upgradeButton
                    : t.waitlistButton}
              </button>
            </form>
            {checkoutError && (
              <p className="mt-2 text-xs text-amber-400">{checkoutError}</p>
            )}
            <div className="mt-3 flex items-center justify-center gap-1 text-[11px] text-muted/60">
              <ProIcon name="lock" className="h-3.5 w-3.5" />
              <span>
                {paymentsAvailable
                  ? t.securePayment
                  : t.freeSignup}
              </span>
            </div>
          </div>
        )}

        {/* Comparison table */}
        <div className="mt-8 rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{t.tableFeature}</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{t.tableFree}</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-amber-400 uppercase tracking-wider">{t.tablePro}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {t.rows.map(([feature, free, pro]) => (
                <tr key={feature} className="bg-bg">
                  <td className="px-4 py-3 text-fg">{feature}</td>
                  <td className="px-4 py-3 text-center text-muted">{free}</td>
                  <td className="px-4 py-3 text-center text-amber-400 font-semibold">{pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Trial / Pro status for logged-in users */}
        {isLoggedIn && proStatus && (
          <div className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
            {proStatus.isPro ? (
              <>
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                  <ProIcon name="party" className="h-5 w-5" />
                </div>
                <p className="font-semibold text-fg mb-1">{t.proStatusTitle}</p>
                <p className="text-sm text-muted">
                  {t.proStatusDesc}
                </p>
                <Link
                  href={alertesPath}
                  className="mt-4 inline-block rounded-lg bg-primary text-white text-sm font-bold px-5 py-2 hover:bg-primary/90 transition-colors"
                >
                  {t.manageAlerts}
                </Link>
              </>
            ) : proStatus.hasTrial ? (
              <>
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400">
                  <ProIcon name="spark" className="h-5 w-5" />
                </div>
                <p className="font-semibold text-fg mb-1">{t.trialTitle}</p>
                <p className="text-sm text-muted">
                  {proStatus.daysLeft && proStatus.daysLeft > 0
                    ? t.trialWithDays(proStatus.daysLeft)
                    : t.trialActive}
                </p>
                <Link
                  href={alertesPath}
                  className="mt-4 inline-block rounded-lg bg-primary text-white text-sm font-bold px-5 py-2 hover:bg-primary/90 transition-colors"
                >
                  {t.createAlert}
                </Link>
              </>
            ) : null}
          </div>
        )}

        {/* FAQ */}
        <div className="mt-12 pt-8 border-t border-border">
          <h2 className="text-2xl font-black text-fg mb-6 text-center">{t.faqTitle}</h2>
          <div className="space-y-3">
            {t.faqs.map(([question, answer]) => (
              <details key={question} className="rounded-lg bg-surface border border-border p-4 group cursor-pointer">
                <summary className="font-semibold text-fg flex items-center justify-between">
                  <span>{question}</span>
                  <span className="text-lg group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="text-sm text-muted mt-3">{answer}</p>
              </details>
            ))}
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted/60">
          {t.question}{" "}
          <a href={`mailto:hello@${EMAIL_DOMAIN}`} className="underline hover:text-muted">
            hello@{EMAIL_DOMAIN}
          </a>
        </p>
      </main>
      <Footer lang={lang} />
    </div>
  );
}
