"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { trackAlertCreated } from "@/lib/analytics";

interface Props {
  from: string;
  to: string;
  cabin: string;
  currentPrice: number;
  lang: "fr" | "en";
  formatPrice?: (usd: number) => string;
}

const L = {
  fr: {
    title: "Alerte prix",
    desc: "Recevez un email quand le prix baisse de 10%+",
    email: "Votre email",
    btn: "Créer l'alerte",
    sending: "Création…",
    success: "Alerte créée ! Vous recevrez un email quand le prix baisse.",
    duplicate: "Alerte déjà active pour cette route.",
    maxed: "Limite d'alertes atteinte.",
    error: "Erreur, réessayez.",
    route: "Route",
    target: "Alerte si prix <",
  },
  en: {
    title: "Price alert",
    desc: "Get notified when price drops 10%+",
    email: "Your email",
    btn: "Create alert",
    sending: "Creating…",
    success: "Alert created! We'll email you when the price drops.",
    duplicate: "Alert already active for this route.",
    maxed: "Maximum alerts reached.",
    error: "Error, please retry.",
    route: "Route",
    target: "Alert if price <",
  },
};

export function PriceAlertForm({ from, to, cabin, currentPrice, lang, formatPrice }: Props) {
  const t = L[lang];
  const fmt = formatPrice ?? ((usd: number) => `$${Math.round(usd)}`);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "duplicate" | "maxed" | "limitReached">("idle");
  const [frequency, setFrequency] = useState<"instant" | "daily" | "weekly">("instant");

  const targetPrice = Math.round(currentPrice * 0.9);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || status === "loading") return;

    setStatus("loading");
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email, from, to, cabin, currentPrice,
          ref: sessionStorage.getItem("keza_ref") ?? undefined,
          notifFrequency: frequency,
        }),
      });

      if (res.status === 201) {
        setStatus("success");
        toast.success(t.success);
        trackAlertCreated({ from, to, cabin, currentPrice });
        // Remember email so /alertes can pre-fill it
        try {
          localStorage.setItem("keza:alertes:email", email.trim().toLowerCase());
        } catch { /* localStorage unavailable (SSR/private browsing) */ }
      } else if (res.status === 409) {
        setStatus("duplicate");
        toast.warning(t.duplicate);
      } else if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        if (data.code === "FREE_LIMIT_REACHED") {
          setStatus("limitReached");
          toast.warning(t.maxed);
        } else {
          setStatus("maxed");
          toast.warning(t.maxed);
        }
      } else {
        setStatus("error");
        toast.error(t.error);
      }
    } catch {
      setStatus("error");
      toast.error(t.error);
    }
  }

  if (status === "success") {
    return (
      <div className="bg-success/10 border border-success/30 rounded-2xl p-4 flex items-start gap-3">
        <span className="text-xl">🔔</span>
        <div>
          <p className="text-sm font-bold text-success">{t.success}</p>
          <p className="text-xs text-muted mt-1">
            {from} → {to} · {t.target} {fmt(targetPrice)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gradient-to-br from-primary/5 to-blue-500/5 border border-primary/20 rounded-2xl p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">🔔</span>
        <div>
          <p className="text-sm font-bold text-fg">{t.title}</p>
          <p className="text-[11px] text-muted">{t.desc}</p>
        </div>
      </div>

      {/* Route + target info */}
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="bg-surface-2 px-2 py-1 rounded-lg font-mono font-bold">
          {from} → {to}
        </span>
        <span>
          {t.target} <span className="text-success font-bold">{fmt(targetPrice)}</span>
        </span>
      </div>

      {/* Frequency */}
      <div>
        <label className="block text-xs text-muted mb-1.5">
          {lang === "fr" ? "Fréquence de notification" : "Notification frequency"}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(["instant", "daily", "weekly"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFrequency(f)}
              className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                frequency === f
                  ? "bg-accent border-accent text-white"
                  : "bg-surface border-border text-muted hover:border-accent/50"
              }`}
            >
              {f === "instant"
                ? lang === "fr" ? "Immédiat" : "Instant"
                : f === "daily"
                ? lang === "fr" ? "Quotidien" : "Daily"
                : lang === "fr" ? "Hebdo" : "Weekly"}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted mt-1">
          {frequency === "instant"
            ? lang === "fr" ? "Dès qu'une baisse est détectée" : "As soon as a drop is detected"
            : frequency === "daily"
            ? lang === "fr" ? "Un récap quotidien si prix bas" : "Daily recap when prices are low"
            : lang === "fr" ? "Un récap chaque lundi" : "A recap every Monday"}
        </p>
      </div>

      {/* Email input + submit */}
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.email}
          className="flex-1 bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-primary/50 transition-colors"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="bg-primary hover:bg-primary/90 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 whitespace-nowrap"
        >
          {status === "loading" ? t.sending : t.btn}
        </button>
      </div>

      {/* Error states */}
      {status === "duplicate" && (
        <p className="text-xs text-warning">{t.duplicate}</p>
      )}
      {status === "maxed" && (
        <p className="text-xs text-warning">{t.maxed}</p>
      )}
      {status === "error" && (
        <p className="text-xs text-red-400">{t.error}</p>
      )}
      {status === "limitReached" && (
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold text-amber-400">
            🔒 Limite gratuite atteinte — 3 alertes max
          </p>
          <p className="text-xs text-muted mt-1">
            {lang === "fr"
              ? "Rejoignez la liste d'attente Pro pour des alertes illimitées, notifications multi-devices et historique de prix."
              : "Join the Pro waitlist for unlimited alerts, multi-device notifications and price history."}
          </p>
          <Link href="/pro" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors">
            Rejoindre la liste d&apos;attente Pro →
          </Link>
        </div>
      )}
    </form>
  );
}
