"use client";

import { useState } from "react";
import { Button, Card, FieldMessage } from "@/components/ui";

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
      <Card padding={variant === "compact" ? "none" : "md"} className={variant === "compact"
        ? "text-center py-3"
        : "bg-success/10 border-success/20 px-6 py-5 text-center"
      }>
        <p className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-success">
          <CheckIcon />
          {fr ? "Inscription confirmée !" : "Subscribed!"}
        </p>
        <p className="text-xs text-muted mt-1">
          {fr
            ? "Regarde ta boîte mail — les deals arrivent dès la semaine prochaine."
            : "Check your inbox — deals start arriving next week."}
        </p>
      </Card>
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
        <Button
          type="submit"
          disabled={status === "loading"}
          loading={status === "loading"}
          size="sm"
          className="whitespace-nowrap"
        >
          {status === "loading"
            ? "…"
            : fr ? "Recevoir les deals" : "Get deals"}
        </Button>
        {status === "error" && (
          <FieldMessage tone="danger" className="px-2 py-1 text-xs">
            {fr ? "Erreur" : "Error"}
          </FieldMessage>
        )}
        {status === "duplicate" && (
          <FieldMessage tone="neutral" className="px-2 py-1 text-xs">
            {fr ? "Déjà inscrit·e" : "Already subscribed"}
          </FieldMessage>
        )}
      </form>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/8 to-surface border-primary/15 px-6 py-7 space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MailIcon />
        </span>
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
        <Button
          type="submit"
          disabled={status === "loading"}
          loading={status === "loading"}
          className="whitespace-nowrap"
        >
          {status === "loading"
            ? "…"
            : fr ? "Recevoir les deals →" : "Get weekly deals →"}
        </Button>
      </form>

      {status === "error" && (
        <FieldMessage tone="danger" className="px-3 py-2 text-xs">
          {fr ? "Une erreur est survenue, réessaie." : "Something went wrong, try again."}
        </FieldMessage>
      )}
      {status === "duplicate" && (
        <FieldMessage tone="neutral" className="px-3 py-2 text-xs">
          {fr ? "✓ Tu es déjà inscrit·e !" : "✓ You're already subscribed!"}
        </FieldMessage>
      )}

      <p className="text-[10px] text-muted/60">
        {fr
          ? "Pas de spam. Désinscription en 1 clic."
          : "No spam. Unsubscribe in one click."}
      </p>
    </Card>
  );
}

function MailIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path d="M4.5 7.5h15v10h-15v-10Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m5 8 7 5 7-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path d="m5 12.5 4.2 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
