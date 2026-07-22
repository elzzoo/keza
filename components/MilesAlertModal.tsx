"use client";

import { useState } from "react";
import { toast } from "sonner";

interface MilesAlertModalProps {
  route: string; // "SIN-LAX"
  program: string; // "Singapore KrisFlyer"
  currentCpp: number; // Current value per mile/point in cents
  onClose: () => void;
  lang?: "fr" | "en";
}

const L = {
  fr: {
    title: "Alerte miles",
    close: "Fermer",
    email: "Votre email",
    cppLabel: "Seuil CPP",
    cppHint: "Alerte quand CPP ≤",
    submit: "Créer l'alerte",
    submitting: "Création…",
    success: "Alerte créée !",
    error: "Erreur, réessayez.",
    routeLabel: "Route",
    programLabel: "Programme",
  },
  en: {
    title: "Miles alert",
    close: "Close",
    email: "Your email",
    cppLabel: "CPP Threshold",
    cppHint: "Alert when CPP ≤",
    submit: "Create alert",
    submitting: "Creating…",
    success: "Alert created!",
    error: "Error, please retry.",
    routeLabel: "Route",
    programLabel: "Program",
  },
};

export function MilesAlertModal({
  route,
  program,
  currentCpp,
  onClose,
  lang = "fr",
}: MilesAlertModalProps) {
  const t = L[lang];
  const [email, setEmail] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("keza:alertes:email") ?? "" : ""
  );
  const [thresholdCpp, setThresholdCpp] = useState(Math.round(currentCpp * 0.9 * 100) / 100);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error(t.email);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/miles-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          route,
          program,
          thresholdCpp,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || t.error);
        return;
      }

      const data = await res.json();
      toast.success(t.success);
      localStorage.setItem("keza:alertes:email", email.toLowerCase().trim());
      // Manage token proves ownership for GET/DELETE on /api/miles-alerts —
      // see app/api/miles-alerts/route.ts for why this replaced the old
      // "just pass an email" access model.
      if (data.manageToken) {
        localStorage.setItem(`keza:miles-alerts:token:${email.toLowerCase().trim()}`, data.manageToken);
      }
      onClose();
    } catch {
      toast.error(t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface rounded-2xl p-6 w-full max-w-sm border border-border shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-bold text-fg">🔔 {t.title}</h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-fg text-2xl leading-none"
            aria-label={t.close}
          >
            ×
          </button>
        </div>

        {/* Route and program info */}
        <div className="bg-card rounded-xl p-3 mb-4 flex items-center gap-3">
          <div className="text-2xl">✈</div>
          <div className="flex-1">
            <div className="text-xs text-muted">{t.routeLabel}</div>
            <div className="font-semibold text-fg">{route}</div>
            <div className="text-xs text-muted mt-1">{t.programLabel}</div>
            <div className="font-semibold text-amber-400">{program}</div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email input */}
          <div>
            <label className="block text-sm font-medium text-fg mb-2">
              {t.email}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 rounded-xl bg-card border border-border text-fg placeholder-muted text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {/* CPP slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-fg">
                {t.cppLabel}
              </label>
              <span className="text-sm font-bold text-amber-400">
                {thresholdCpp.toFixed(2)}¢
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="10"
              step="0.1"
              value={thresholdCpp}
              onChange={(e) => setThresholdCpp(parseFloat(e.target.value))}
              className="w-full h-2 bg-card rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <p className="text-xs text-muted/60 mt-2">
              {t.cppHint} {thresholdCpp.toFixed(2)}¢/mile
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-fg hover:bg-surface-2 transition-colors font-medium text-sm"
            >
              {t.close}
            </button>
            <button
              type="submit"
              disabled={loading || !email}
              className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t.submitting : t.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
