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

export function ProClient() {
  const [lang] = useState<"fr" | "en">("fr");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [position, setPosition] = useState<number | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/pro/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setPosition(data.position);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header lang={lang} onLangChange={() => {}} />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pb-16">
        {/* Hero */}
        <div className="pt-12 pb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Bientôt disponible
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

        {/* Waitlist form */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
          {status === "success" ? (
            <div className="text-center py-4">
              <p className="text-2xl mb-2">🎉</p>
              <p className="font-semibold text-fg">Tu es sur la liste !</p>
              {position && (
                <p className="text-sm text-muted mt-1">
                  Position #{position} — on te contacte en priorité.
                </p>
              )}
              <Link href="/" className="mt-4 inline-block text-xs text-primary hover:underline">
                Retourner sur KEZA →
              </Link>
            </div>
          ) : (
            <>
              <p className="font-semibold text-fg mb-1">Rejoindre la liste d&apos;attente</p>
              <p className="text-xs text-muted mb-4">
                Accès prioritaire + tarif early-bird. Gratuit de s&apos;inscrire.
              </p>
              <form onSubmit={handleSubmit} className="flex gap-2">
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
                  disabled={status === "loading" || !email.trim()}
                  className="rounded-lg bg-amber-500 text-black text-sm font-bold px-4 py-2 hover:bg-amber-400 transition-colors disabled:opacity-50"
                >
                  {status === "loading" ? "…" : "S'inscrire"}
                </button>
              </form>
              {status === "error" && (
                <p className="mt-2 text-xs text-red-400">Une erreur est survenue. Réessaie.</p>
              )}
            </>
          )}
        </div>

        {/* Comparison */}
        <div className="mt-8 rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Fonctionnalité</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Gratuit</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-amber-400 uppercase tracking-wider">Pro</th>
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
      </main>
      <Footer lang={lang} />
    </div>
  );
}
