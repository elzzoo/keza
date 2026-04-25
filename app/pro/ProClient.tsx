"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";

const FEATURES = [
  { icon: "🔔", title: "Alertes illimitées", desc: "Surveillez autant de routes que vous voulez, sans limite." },
  { icon: "📱", title: "Multi-devices", desc: "Notifications push sur tous vos appareils simultanément." },
  { icon: "📊", title: "Historique 6 mois", desc: "Visualisez l'évolution des prix et choisissez le bon moment." },
  { icon: "✈️", title: "Alertes multi-passagers", desc: "Prix pour 2, 3 ou 4 passagers directement dans l'alerte." },
];

export function ProClient({ upgraded }: { upgraded?: boolean }) {
  const [lang] = useState<"fr" | "en">("fr");
  const [email, setEmail] = useState("");
  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "loading">("idle");
  const [checkoutError, setCheckoutError] = useState("");

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || checkoutStatus === "loading") return;
    setCheckoutStatus("loading");
    setCheckoutError("");
    try {
      const res = await fetch("/api/pro/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else if (res.status === 503) {
        setCheckoutError("Le paiement arrive bientôt — merci de ta patience !");
        setCheckoutStatus("idle");
      } else {
        setCheckoutError(data.error ?? "Une erreur est survenue.");
        setCheckoutStatus("idle");
      }
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
            <h1 className="text-2xl font-black text-fg mb-2">Bienvenue dans KEZA Pro !</h1>
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
            <span className="text-primary">KEZA</span> Pro
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

        {/* Checkout form */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
          <p className="font-semibold text-fg mb-1">Passer en Pro — 9$ / mois</p>
          <p className="text-xs text-muted mb-4">
            Annulable à tout moment. Paiement sécurisé via Lemon Squeezy.
          </p>
          <form onSubmit={handleCheckout} className="flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.com"
              className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={checkoutStatus === "loading" || !email.trim()}
              className="rounded-lg bg-amber-500 text-black text-sm font-bold px-4 py-2 hover:bg-amber-400 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {checkoutStatus === "loading" ? "…" : "Payer 9$ →"}
            </button>
          </form>
          {checkoutError && (
            <p className="mt-2 text-xs text-amber-400">{checkoutError}</p>
          )}
          <p className="mt-3 text-xs text-muted/60 text-center">
            Tu seras redirigé vers Lemon Squeezy pour finaliser le paiement.
          </p>
        </div>

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

        <p className="mt-6 text-center text-xs text-muted/60">
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
