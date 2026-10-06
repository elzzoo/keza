"use client";

import { useState } from "react";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Button, Card, FieldMessage } from "@/components/ui";

interface Props {
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  lang: "fr" | "en";
}

type Step = "idle" | "loading" | "done" | "error";

type RouteAlertIconName = "bell" | "check";

function RouteAlertIcon({ name, className = "h-4 w-4" }: { name: RouteAlertIconName; className?: string }) {
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
  return (
    <svg {...common}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function RouteAlertCta({ from, to, fromCity, toCity, lang }: Props) {
  const fr = lang === "fr";
  const [email,       setEmail]       = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [step,        setStep]        = useState<Step>("idle");
  const [errorMsg,    setErrorMsg]    = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(targetPrice);
    if (!email.includes("@") || price <= 0 || price > 50000) return;

    setStep("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          from,
          to,
          currentPrice: price,
          cabin: "economy",
          notifFrequency: "instant",
          ref: "vol-page",
        }),
      });

      if (res.ok || res.status === 201) {
        setStep("done");
      } else if (res.status === 409) {
        setErrorMsg(fr ? "Une alerte existe déjà pour ce vol." : "An alert already exists for this flight.");
        setStep("error");
      } else if (res.status === 429) {
        const body = await res.json().catch(() => ({})) as { code?: string };
        if (body.code === "FREE_LIMIT_REACHED") {
          setShowUpgrade(true);
        } else {
          setErrorMsg(fr ? "Trop de requêtes — réessaie dans quelques secondes." : "Too many requests — try again in a few seconds.");
          setStep("error");
        }
      } else {
        const body = await res.json().catch(() => ({}));
        setErrorMsg((body as { error?: string }).error ?? (fr ? "Erreur — réessaie plus tard." : "Error — try again later."));
        setStep("error");
      }
    } catch {
      setErrorMsg(fr ? "Erreur réseau — réessaie plus tard." : "Network error — try again later.");
      setStep("error");
    }
  }

  if (step === "done") {
    return (
      <Card padding="lg" className="text-center space-y-2 border-success/20 bg-success/10">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-success/25 bg-success/10 text-success">
          <RouteAlertIcon name="check" className="h-5 w-5" />
        </div>
        <p className="font-bold text-fg text-sm">{fr ? "Alerte créée !" : "Alert created!"}</p>
        <p className="text-xs text-muted">
          {fr
            ? `Tu recevras un email dès que le prix ${fromCity}→${toCity} descend sous ta cible.`
            : `You'll get an email as soon as ${fromCity}→${toCity} drops below your target.`}
        </p>
      </Card>
    );
  }

  return (
    <>
    <Card className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">
          <RouteAlertIcon name="bell" className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-black text-fg">
            {fr ? "Alerte prix" : "Price alert"} — {fromCity} → {toCity}
          </h2>
          <p className="text-xs text-muted mt-0.5">
            {fr
              ? "Reçois un email dès que le prix passe sous ton budget."
              : "Get an email as soon as the price drops below your budget."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="email"
            required
            placeholder={fr ? "ton@email.com" : "your@email.com"}
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-primary/60 transition-colors"
          />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm font-semibold">$</span>
            <input
              type="number"
              required
              min={1}
              max={50000}
              placeholder={fr ? "Prix cible" : "Target price"}
              value={targetPrice}
              onChange={e => setTargetPrice(e.target.value)}
              className="w-full pl-7 pr-3 py-2 rounded-lg bg-bg border border-border text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-primary/60 transition-colors"
            />
          </div>
        </div>

        {step === "error" && errorMsg && (
          <FieldMessage role="alert" tone="danger" className="py-2 text-xs">
            {errorMsg}
          </FieldMessage>
        )}

        <Button
          type="submit"
          loading={step === "loading"}
          size="sm"
          className="w-full sm:w-auto"
        >
          {step === "loading"
            ? fr ? "Création…" : "Creating…"
            : fr ? "Créer l'alerte — gratuit" : "Create alert — free"}
        </Button>
      </form>
    </Card>

    {showUpgrade && (
      <UpgradeModal lang={lang} onClose={() => setShowUpgrade(false)} prefillEmail={email} />
    )}
    </>
  );
}
