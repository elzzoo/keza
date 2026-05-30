"use client";

import { useState } from "react";

interface Props {
  lang: "fr" | "en";
  /** Visual variant — "inline" for homepage, "compact" for deals/other pages */
  variant?: "inline" | "compact";
}

export function NewsletterSignup({ lang, variant = "inline" }: Props) {
  const fr = lang === "fr";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "duplicate">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), lang }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
      } else if (data.alreadySubscribed) {
        setStatus("duplicate");
      } else {
        setStatus("success");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className={variant === "compact"
        ? "text-center py-3"
        : "bg-success/10 border border-success/20 rounded-2xl px-6 py-5 text-center"
      }>
        <p className="text-sm font-semibold text-success">
          ✅ {fr ? "Inscription confirmée !" : "Subscribed!"}
        </p>
        <p className="text-xs text-muted mt-1">
          {fr
            ? "Regarde ta boîte mail — les deals arrivent dès la semaine prochaine."
            : "Check your inbox — deals start arriving next week."}
        </p>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <form onSubmit={submit} className="flex items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={fr ? "ton@email.com" : "your@email.com"}
          required
          className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface-2 border border-border text-xs text-fg placeholder:text-muted focus:outline-none focus:border-primary/50 transition-colors"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-3 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {status === "loading"
            ? "…"
            : fr ? "Recevoir les deals" : "Get deals"}
        </button>
        {status === "error" && (
          <span className="text-xs text-red-400">
            {fr ? "Erreur" : "Error"}
          </span>
        )}
      </form>
    );
  }

  return (
    <div className="bg-gradient-to-br from-primary/8 to-surface rounded-2xl border border-primary/15 px-6 py-7 space-y-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">✉️</span>
        <div>
          <h3 className="text-sm font-black text-fg">
            {fr
              ? "Deals miles chaque semaine — gratuit"
              : "Weekly miles deals — free"}
          </h3>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            {fr
              ? "DSS, LOS, CMN ↔ Paris, Londres · Sweet spots business · Bonus transferts. Seulement quand ça vaut vraiment le coup."
              : "DSS, LOS, CMN ↔ Paris, London · Business sweet spots · Transfer bonuses. Only when miles genuinely win."}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={fr ? "ton@email.com" : "your@email.com"}
          required
          className="flex-1 px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-fg placeholder:text-muted focus:outline-none focus:border-primary/50 transition-colors"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50 whitespace-nowrap"
        >
          {status === "loading"
            ? "…"
            : fr ? "Recevoir les deals →" : "Get weekly deals →"}
        </button>
      </form>

      {status === "error" && (
        <p className="text-xs text-red-400">
          {fr ? "Une erreur est survenue, réessaie." : "Something went wrong, try again."}
        </p>
      )}
      {status === "duplicate" && (
        <p className="text-xs text-muted">
          {fr ? "✓ Tu es déjà inscrit·e !" : "✓ You're already subscribed!"}
        </p>
      )}

      <p className="text-[10px] text-muted/60">
        {fr
          ? "Pas de spam. Désinscription en 1 clic."
          : "No spam. Unsubscribe in one click."}
      </p>
    </div>
  );
}
