"use client";

import { useState } from "react";

interface Props {
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
}

type Step = "idle" | "loading" | "done" | "error";

export function RouteAlertCta({ from, to, fromCity, toCity }: Props) {
  const [email,       setEmail]       = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [step,        setStep]        = useState<Step>("idle");
  const [errorMsg,    setErrorMsg]    = useState("");

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
        setErrorMsg("Une alerte existe déjà pour ce vol.");
        setStep("error");
      } else {
        const body = await res.json().catch(() => ({}));
        setErrorMsg((body as { error?: string }).error ?? "Erreur — réessaie plus tard.");
        setStep("error");
      }
    } catch {
      setErrorMsg("Erreur réseau — réessaie plus tard.");
      setStep("error");
    }
  }

  if (step === "done") {
    return (
      <div className="bg-success/8 rounded-2xl border border-success/20 p-6 text-center space-y-2">
        <div className="text-3xl">✅</div>
        <p className="font-bold text-fg text-sm">Alerte créée !</p>
        <p className="text-xs text-muted">
          Tu recevras un email dès que le prix {fromCity}→{toCity} descend sous ta cible.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">🔔</span>
        <div>
          <h2 className="text-sm font-black text-fg">
            Alerte prix — {fromCity} → {toCity}
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Reçois un email dès que le prix passe sous ton budget.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="email"
            required
            placeholder="ton@email.com"
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
              placeholder="Prix cible"
              value={targetPrice}
              onChange={e => setTargetPrice(e.target.value)}
              className="w-full pl-7 pr-3 py-2 rounded-lg bg-bg border border-border text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-primary/60 transition-colors"
            />
          </div>
        </div>

        {step === "error" && errorMsg && (
          <p className="text-xs text-red-400">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={step === "loading"}
          className="w-full sm:w-auto px-5 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {step === "loading" ? "Création…" : "Créer l'alerte — gratuit"}
        </button>
      </form>
    </div>
  );
}
