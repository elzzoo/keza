"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import type { ProAccessStatus } from "@/lib/proAccess";

const FEATURES = [
  { icon: "🔔", title: "Alertes illimitées", desc: "Surveillez autant de routes que vous voulez, sans limite." },
  { icon: "📱", title: "Multi-devices", desc: "Notifications push sur tous vos appareils simultanément." },
  { icon: "📊", title: "Historique 6 mois", desc: "Visualisez l'évolution des prix et choisissez le bon moment." },
  { icon: "✈️", title: "Alertes multi-passagers", desc: "Prix pour 2, 3 ou 4 passagers directement dans l'alerte." },
];

type CheckoutStatus = "idle" | "loading" | "waitlisted";

interface ProClientProps {
  upgraded?: boolean;
  isLoggedIn?: boolean;
  proStatus?: ProAccessStatus | null;
  userEmail?: string;
  initialEmail?: string;
}

// Basic email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ProClient({
  upgraded,
  isLoggedIn,
  proStatus,
  userEmail,
  initialEmail,
}: ProClientProps) {
  const router = useRouter();
  const [lang] = useState<"fr" | "en">("fr");
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
      setEmailError("Veuillez entrer votre email");
    } else if (!EMAIL_REGEX.test(value.trim())) {
      setEmailError("Veuillez entrer une adresse email valide");
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
      setCheckoutError(data.error ?? "Impossible de rejoindre la liste d'attente.");
      setCheckoutStatus("idle");
      return false;
    } catch {
      setCheckoutError("Erreur réseau. Réessaie.");
      setCheckoutStatus("idle");
      return false;
    }
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = email.trim();

    // Validate email before proceeding
    if (!trimmed) {
      setEmailError("Veuillez entrer votre email");
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError("Veuillez entrer une adresse email valide");
      return;
    }

    // If not logged in, redirect to sign in with return URL + email
    if (!isLoggedIn) {
      const callbackUrl = trimmed
        ? `/pro?email=${encodeURIComponent(trimmed)}`
        : "/pro";
      router.push(`/connexion?callbackUrl=${encodeURIComponent(callbackUrl)}`);
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
      setCheckoutError(data.error ?? "Une erreur est survenue.");
      setCheckoutStatus("idle");
    } catch {
      setCheckoutError("Erreur réseau. Réessaie.");
      setCheckoutStatus("idle");
    }
  }

  if (upgraded) {
    return (
      <div className="min-h-screen bg-bg flex flex-col">
        <Header lang={lang} onLangChange={() => {}} />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <p className="text-5xl mb-4">🎉</p>
            <h1 className="text-2xl font-black text-fg mb-2">Bienvenue dans Xalifly Pro !</h1>
            <p className="text-sm text-muted mb-6">
              Tes alertes illimitées sont maintenant actives. Crée ta première alerte dès maintenant.
            </p>
            <Link
              href="/alertes"
              className="inline-block rounded-lg bg-primary text-white text-sm font-bold px-6 py-3 hover:bg-primary/90 transition-colors"
            >
              Gérer mes alertes →
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
            9$ / mois
          </div>
          <h1 className="text-4xl font-black text-fg mb-3">
            <span className="text-primary">Xalifly</span> Pro
          </h1>
          <p className="text-base text-muted max-w-md mx-auto">
            Alertes illimitées, notifications multi-devices et historique des prix — pour les voyageurs sérieux.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-2 gap-3 mb-10">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-surface p-4">
              <span className="text-2xl">{f.icon}</span>
              <p className="mt-2 text-sm font-semibold text-fg">{f.title}</p>
              <p className="mt-1 text-xs text-muted">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Checkout / waitlist form */}
        {checkoutStatus === "waitlisted" ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
            <p className="text-3xl mb-2">✅</p>
            <p className="font-semibold text-fg mb-1">Tu es sur la liste !</p>
            <p className="text-xs text-muted">
              {waitlistPosition
                ? `Tu es n°${waitlistPosition} sur la liste. On te contactera dès l'ouverture des paiements.`
                : "On te contactera dès l'ouverture des paiements Xalifly Pro."}
            </p>
            <p className="mt-3 text-xs text-muted/60">
              En attendant, profite des 3 alertes gratuites + parrainage pour en débloquer plus.
            </p>
            <Link
              href="/alertes"
              className="mt-4 inline-block rounded-lg bg-primary text-white text-sm font-bold px-5 py-2 hover:bg-primary/90 transition-colors"
            >
              Créer une alerte gratuite →
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-fg">
                {paymentsAvailable ? "Passer en Pro" : "Rejoindre la liste d'attente"}
              </p>
              <span className="text-lg font-black text-amber-400">9$ <span className="text-xs font-normal text-muted">/ mois</span></span>
            </div>
            <p className="text-xs text-muted mb-4">
              {paymentsAvailable
                ? "Sans engagement · Annulable à tout moment · Paiement via Lemon Squeezy"
                : "Les paiements ouvriront très bientôt — sois prévenu en premier."}
            </p>
            <form onSubmit={handleCheckout} className="space-y-2">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="ton@email.com"
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
                    ? "💎 Passer en Pro — 9$ / mois →"
                    : "Rejoindre la liste →"}
              </button>
            </form>
            {checkoutError && (
              <p className="mt-2 text-xs text-amber-400">{checkoutError}</p>
            )}
            <div className="mt-3 flex items-center justify-center gap-1 text-[11px] text-muted/60">
              <span>🔒</span>
              <span>
                {paymentsAvailable
                  ? "Paiement sécurisé · Facture email automatique"
                  : "Inscription gratuite — aucun engagement."}
              </span>
            </div>
          </div>
        )}

        {/* Comparison table */}
        <div className="mt-8 rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Fonctionnalité</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Gratuit</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-amber-400 uppercase tracking-wider">Pro 9$/mois</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Alertes actives", "3", "Illimitées"],
                ["Notifications push", "1 device", "Multi-devices"],
                ["Historique des prix", "—", "6 mois"],
                ["Multi-passagers", "—", "✓"],
                ["Digest hebdo", "✓", "✓"],
              ].map(([feature, free, pro]) => (
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
                <p className="text-3xl mb-2">🎉</p>
                <p className="font-semibold text-fg mb-1">Tu as Xalifly Pro</p>
                <p className="text-sm text-muted">
                  Profite de tes alertes illimitées et de toutes les fonctionnalités Pro.
                </p>
                <Link
                  href="/alertes"
                  className="mt-4 inline-block rounded-lg bg-primary text-white text-sm font-bold px-5 py-2 hover:bg-primary/90 transition-colors"
                >
                  Gérer mes alertes →
                </Link>
              </>
            ) : proStatus.hasTrial ? (
              <>
                <p className="text-3xl mb-2">✨</p>
                <p className="font-semibold text-fg mb-1">Essai gratuit actif</p>
                <p className="text-sm text-muted">
                  {proStatus.daysLeft && proStatus.daysLeft > 0
                    ? `Tu as ${proStatus.daysLeft} jour${proStatus.daysLeft > 1 ? "s" : ""} d'essai gratuit restant.`
                    : "Ton essai gratuit est actif."}
                </p>
                <Link
                  href="/alertes"
                  className="mt-4 inline-block rounded-lg bg-primary text-white text-sm font-bold px-5 py-2 hover:bg-primary/90 transition-colors"
                >
                  Créer une alerte →
                </Link>
              </>
            ) : null}
          </div>
        )}

        {/* FAQ */}
        <div className="mt-12 pt-8 border-t border-border">
          <h2 className="text-2xl font-black text-fg mb-6 text-center">Questions fréquentes</h2>
          <div className="space-y-3">
            <details className="rounded-lg bg-surface border border-border p-4 group cursor-pointer">
              <summary className="font-semibold text-fg flex items-center justify-between">
                <span>Combien coûte Xalifly Pro ?</span>
                <span className="text-lg group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-sm text-muted mt-3">
                Xalifly Pro coûte 9$ par mois. Tu peux commencer par un essai gratuit de 7 jours, sans carte de crédit.
              </p>
            </details>
            <details className="rounded-lg bg-surface border border-border p-4 group cursor-pointer">
              <summary className="font-semibold text-fg flex items-center justify-between">
                <span>Puis-je annuler mon abonnement ?</span>
                <span className="text-lg group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-sm text-muted mt-3">
                Oui, tu peux annuler ton abonnement &agrave; tout moment. Tu conserveras l&apos;acc&egrave;s Pro jusqu&apos;&agrave; la fin de ta p&eacute;riode de facturation actuelle.
              </p>
            </details>
            <details className="rounded-lg bg-surface border border-border p-4 group cursor-pointer">
              <summary className="font-semibold text-fg flex items-center justify-between">
                <span>Qu&apos;est-ce qui inclus dans Pro ?</span>
                <span className="text-lg group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-sm text-muted mt-3">
                Alertes illimitées, notifications push multi-devices, historique des prix sur 6 mois, et alertes pour plusieurs passagers simultanément.
              </p>
            </details>
            <details className="rounded-lg bg-surface border border-border p-4 group cursor-pointer">
              <summary className="font-semibold text-fg flex items-center justify-between">
                <span>Comment fonctionne l&apos;essai gratuit ?</span>
                <span className="text-lg group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-sm text-muted mt-3">
                Tu as 7 jours d&apos;acc&egrave;s gratuit &agrave; toutes les fonctionnalit&eacute;s Pro. Aucune carte de cr&eacute;dit n&apos;est requise. Si tu ne convertis pas &agrave; la fin de l&apos;essai, ton compte reviendra &agrave; la version gratuite.
              </p>
            </details>
            <details className="rounded-lg bg-surface border border-border p-4 group cursor-pointer">
              <summary className="font-semibold text-fg flex items-center justify-between">
                <span>Est-ce que mes donn&eacute;es sont s&ucirc;res ?</span>
                <span className="text-lg group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-sm text-muted mt-3">
                Oui. Xalifly utilise HTTPS, du chiffrement de bout en bout, et les meilleures pratiques de s&eacute;curit&eacute; pour prot&eacute;ger tes informations personnelles.
              </p>
            </details>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted/60">
          Question ?{" "}
          <a href="mailto:hello@keza.app" className="underline hover:text-muted">
            hello@keza.app
          </a>
        </p>
      </main>
      <Footer lang={lang} />
    </div>
  );
}
