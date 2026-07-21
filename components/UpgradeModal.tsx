"use client";

import { useState } from "react";
import Link from "next/link";

interface Props {
  lang: "fr" | "en";
  onClose: () => void;
  /** If provided, will attempt checkout directly from the modal */
  prefillEmail?: string;
}

const FEATURES_FR = [
  { icon: "🔔", text: "Alertes illimitées sur toutes tes routes" },
  { icon: "📱", text: "Push multi-devices simultanés" },
  { icon: "📊", text: "Historique 6 mois + tendances" },
  { icon: "✈️", text: "Multi-passagers dans tes alertes" },
  { icon: "⚡", text: "Priorité sur les nouvelles fonctionnalités" },
];

const FEATURES_EN = [
  { icon: "🔔", text: "Unlimited alerts on all your routes" },
  { icon: "📱", text: "Push notifications on all devices" },
  { icon: "📊", text: "6-month price history + trends" },
  { icon: "✈️", text: "Multi-passenger alerts" },
  { icon: "⚡", text: "Early access to new features" },
];

export function UpgradeModal({ lang, onClose, prefillEmail = "" }: Props) {
  const fr = lang === "fr";
  const features = fr ? FEATURES_FR : FEATURES_EN;
  const [email, setEmail] = useState(prefillEmail);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState("");

  async function handleUpgrade(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || status === "loading") return;
    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/pro/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json() as { url?: string; error?: string };

      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      // 503 = payments not yet live → go to /pro waitlist page
      if (res.status === 503) {
        window.location.href = "/pro";
        return;
      }
      setError(data.error ?? (fr ? "Une erreur est survenue." : "Something went wrong."));
      setStatus("idle");
    } catch {
      setError(fr ? "Erreur réseau. Réessaie." : "Network error. Try again.");
      setStatus("idle");
    }
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md bg-surface rounded-2xl border border-amber-500/30 shadow-2xl shadow-black/50 animate-fade-up overflow-hidden">
        {/* Gradient header */}
        <div className="bg-gradient-to-br from-amber-500/20 via-primary/10 to-transparent px-6 pt-6 pb-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-fg hover:bg-surface-2 transition-colors"
            aria-label="Fermer"
          >
            ✕
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-[11px] font-bold text-amber-400 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            {fr ? "Xalifly Pro — 9$ / mois" : "Xalifly Pro — $9 / month"}
          </div>

          <h2 className="text-xl font-black text-fg">
            {fr ? "🔒 Limite gratuite atteinte" : "🔒 Free limit reached"}
          </h2>
          <p className="text-sm text-muted mt-1">
            {fr
              ? "Tu as utilisé tes 3 alertes gratuites. Passe en Pro pour en créer autant que tu veux."
              : "You've used your 3 free alerts. Upgrade to Pro to create unlimited alerts."}
          </p>
        </div>

        {/* Features */}
        <div className="px-6 py-4 space-y-2 border-t border-border">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-2.5 text-sm">
              <span>{f.icon}</span>
              <span className="text-fg/80">{f.text}</span>
            </div>
          ))}
        </div>

        {/* Checkout form */}
        <div className="px-6 pb-6 pt-3 border-t border-border space-y-3">
          <form onSubmit={handleUpgrade} className="space-y-2">
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={fr ? "ton@email.com" : "your@email.com"}
              className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-amber-500/50"
            />
            <button
              type="submit"
              disabled={status === "loading" || !email.trim()}
              className="w-full py-3 rounded-xl bg-amber-500 text-black text-sm font-black hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              {status === "loading"
                ? "…"
                : fr ? "Passer en Pro — 9$ / mois →" : "Upgrade to Pro — $9 / month →"}
            </button>
          </form>

          {error && <p className="text-xs text-amber-400 text-center">{error}</p>}

          <div className="flex items-center justify-between text-[11px] text-muted">
            <span>🔒 {fr ? "Paiement sécurisé · Annulable" : "Secure payment · Cancel anytime"}</span>
            <Link href="/pro" onClick={onClose} className="text-primary hover:underline">
              {fr ? "En savoir plus" : "Learn more"}
            </Link>
          </div>

          {/* Referral alternative */}
          <div className="mt-1 pt-3 border-t border-border text-center">
            <p className="text-[11px] text-muted">
              {fr ? "Pas prêt ? " : "Not ready? "}
              <Link href="/alertes" onClick={onClose} className="text-primary hover:underline">
                🎁 {fr ? "Parraine un ami pour débloquer +1 alerte gratuite" : "Refer a friend to unlock +1 free alert"}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
