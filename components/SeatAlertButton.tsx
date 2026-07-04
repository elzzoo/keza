"use client";

import { useState } from "react";
import { saveAlertAction } from "@/lib/actions/seatAlertActions";
import type { CabinType } from "@/lib/seatAlerts";

interface SeatAlertButtonProps {
  from: string;
  to: string;
  cabin: "economy" | "premium" | "business" | "first";
  currentPrice: number;
  lang: "fr" | "en";
}

const CABIN_MAP: Record<string, CabinType> = {
  economy: "ECONOMY",
  premium: "PREMIUM_ECONOMY",
  business: "BUSINESS",
  first: "FIRST",
};

export function SeatAlertButton({ from, to, cabin, currentPrice, lang }: SeatAlertButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [price, setPrice] = useState(currentPrice);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fr = lang === "fr";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || price <= 0) return;

    setLoading(true);
    try {
      const route = `${from}-${to}`;
      await saveAlertAction(
        email.trim().toLowerCase(),
        route,
        CABIN_MAP[cabin] || "ECONOMY",
        Math.round(price)
      );

      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setEmail("");
        setPrice(currentPrice);
      }, 2000);
    } catch (err) {
      console.error("Failed to set alert:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        title={fr ? "Définir une alerte de prix" : "Set price alert"}
      >
        <span>🔔</span>
        {fr ? "Alerte" : "Alert"}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h3 className="text-lg font-bold mb-4">
              {fr ? "Alerte de prix" : "Price Alert"}
            </h3>

            {submitted ? (
              <div className="text-center py-6">
                <p className="text-green-600 font-medium">
                  {fr
                    ? "✓ Alerte créée! Vous recevrez un email quand le prix baisse."
                    : "✓ Alert set! You'll get an email when prices drop."}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {fr ? "Email" : "Email"}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    {fr ? "Alerte si prix ≤" : "Alert if price ≤"}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <p className="text-xs text-muted">
                  {fr
                    ? "Nous vous alerterons par email quand les prix atteindront votre seuil."
                    : "We'll email you when prices hit your target price."}
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-4 py-2 bg-surface text-fg rounded-lg hover:bg-surface-2 transition-colors"
                  >
                    {fr ? "Fermer" : "Close"}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50"
                  >
                    {loading ? (fr ? "..." : "...") : fr ? "Créer" : "Create"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
