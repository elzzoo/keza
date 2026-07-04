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

// Currency formatter
const formatCurrency = (value: number) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
}).format(value);

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
  const [error, setError] = useState<string | null>(null);

  const fr = lang === "fr";

  // Validate email format
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPriceValid = price > 0 && price <= 50000;
  const isFormValid = isValidEmail && isPriceValid && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidEmail) {
      setError(fr ? "Email invalide" : "Invalid email");
      return;
    }

    if (!isPriceValid) {
      setError(fr ? "Le prix doit être entre $1 et $50,000" : "Price must be between $1 and $50,000");
      return;
    }

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
        setError(null);
      }, 2500);
    } catch (err) {
      setError(fr ? "Erreur lors de la création de l'alerte" : "Failed to create alert");
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {fr ? "Alerte de prix" : "Price Alert"}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted hover:text-fg transition-colors"
              >
                ✕
              </button>
            </div>

            {submitted ? (
              <div className="text-center py-8 animate-in fade-in duration-300">
                <div className="text-5xl mb-4 animate-bounce">✓</div>
                <p className="text-green-600 font-medium">
                  {fr
                    ? "Alerte créée! Vous recevrez un email quand le prix baisse."
                    : "Alert set! You'll get an email when prices drop."}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-300">
                {/* Current price info */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                  <p className="text-xs text-muted">
                    {fr ? "Prix actuel" : "Current price"}
                  </p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(currentPrice)}</p>
                </div>

                {/* Email input */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {fr ? "Email" : "Email"}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder="your@email.com"
                    className={`w-full bg-surface border rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors ${
                      error && !isValidEmail
                        ? "border-red-500 focus:border-red-600"
                        : "border-border focus:border-primary"
                    }`}
                  />
                </div>

                {/* Price input */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {fr ? "Alerte si prix ≤" : "Alert if price ≤"}
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted">$</span>
                    <input
                      type="number"
                      required
                      min="1"
                      max="50000"
                      value={price}
                      onChange={(e) => {
                        setPrice(Number(e.target.value));
                        setError(null);
                      }}
                      className={`flex-1 bg-surface border rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors ${
                        error && !isPriceValid
                          ? "border-red-500 focus:border-red-600"
                          : "border-border focus:border-primary"
                      }`}
                    />
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 animate-in slide-in-from-top-2">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Helper text */}
                <p className="text-xs text-muted">
                  {fr
                    ? "Nous vous alerterons par email quand les prix atteindront votre seuil."
                    : "We'll email you when prices hit your target price."}
                </p>

                {/* Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-4 py-2 bg-surface text-fg rounded-lg hover:bg-surface-2 transition-colors font-medium"
                  >
                    {fr ? "Fermer" : "Close"}
                  </button>
                  <button
                    type="submit"
                    disabled={!isFormValid}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="inline-block animate-spin">⏳</span>
                        {fr ? "Création..." : "Creating..."}
                      </>
                    ) : (
                      (fr ? "Créer" : "Create")
                    )}
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
