"use client";

import { useState } from "react";
import Link from "next/link";

interface Props {
  lang: "fr" | "en";
  onClose: () => void;
  /** If provided, will attempt checkout directly from the modal */
  prefillEmail?: string;
}

type UpgradeIconName = "bell" | "device" | "chart" | "passengers" | "spark" | "lock" | "gift";

function UpgradeIcon({ name, className = "h-4 w-4" }: { name: UpgradeIconName; className?: string }) {
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
  if (name === "lock") {
    return (
      <svg {...common}>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    );
  }
  if (name === "gift") {
    return (
      <svg {...common}>
        <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7" />
        <path d="M2 7h20v5H2z" />
        <path d="M12 22V7" />
        <path d="M12 7H7.5a2.5 2.5 0 1 1 2.2-3.7L12 7Z" />
        <path d="M12 7h4.5a2.5 2.5 0 1 0-2.2-3.7L12 7Z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" />
      <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" />
    </svg>
  );
}

const FEATURES_FR = [
  { icon: "bell" as const, text: "Alertes illimitées sur toutes tes routes" },
  { icon: "device" as const, text: "Push multi-devices simultanés" },
  { icon: "chart" as const, text: "Historique 6 mois + tendances" },
  { icon: "passengers" as const, text: "Multi-passagers dans tes alertes" },
  { icon: "spark" as const, text: "Priorité sur les nouvelles fonctionnalités" },
];

const FEATURES_EN = [
  { icon: "bell" as const, text: "Unlimited alerts on all your routes" },
  { icon: "device" as const, text: "Push notifications on all devices" },
  { icon: "chart" as const, text: "6-month price history + trends" },
  { icon: "passengers" as const, text: "Multi-passenger alerts" },
  { icon: "spark" as const, text: "Early access to new features" },
];

export function UpgradeModal({ lang, onClose, prefillEmail = "" }: Props) {
  const fr = lang === "fr";
  const features = fr ? FEATURES_FR : FEATURES_EN;
  const [email, setEmail] = useState(prefillEmail);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState("");
  const proHref = fr ? "/pro" : "/en/pro";
  const alertsHref = fr ? "/alertes" : "/en/alertes";

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
        window.location.href = proHref;
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
            aria-label={fr ? "Fermer" : "Close"}
          >
            ✕
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-[11px] font-bold text-amber-400 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            {fr ? "Xalifly Pro — 9$ / mois" : "Xalifly Pro — $9 / month"}
          </div>

          <h2 className="flex items-center gap-2 text-xl font-black text-fg">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-400">
              <UpgradeIcon name="lock" className="h-4 w-4" />
            </span>
            {fr ? "Limite gratuite atteinte" : "Free limit reached"}
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
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400">
                <UpgradeIcon name={f.icon} className="h-3.5 w-3.5" />
              </span>
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
            <span className="inline-flex items-center gap-1.5">
              <UpgradeIcon name="lock" className="h-3.5 w-3.5" />
              {fr ? "Paiement sécurisé · Annulable" : "Secure payment · Cancel anytime"}
            </span>
            <Link href={proHref} onClick={onClose} className="text-primary hover:underline">
              {fr ? "En savoir plus" : "Learn more"}
            </Link>
          </div>

          {/* Referral alternative */}
          <div className="mt-1 pt-3 border-t border-border text-center">
            <p className="text-[11px] text-muted">
              {fr ? "Pas prêt ? " : "Not ready? "}
              <Link href={alertsHref} onClick={onClose} className="text-primary hover:underline">
                <span className="inline-flex items-center gap-1.5">
                  <UpgradeIcon name="gift" className="h-3.5 w-3.5" />
                  {fr ? "Parraine un ami pour débloquer +1 alerte gratuite" : "Refer a friend to unlock +1 free alert"}
                </span>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
