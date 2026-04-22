"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import type { PriceAlert } from "@/lib/alerts";

// ─── Cabin labels ─────────────────────────────────────────────────────────────

const CABIN_LABELS_FR: Record<string, string> = {
  economy: "Économique",
  premium: "Premium Éco",
  business: "Business",
  first: "Première",
};

const CABIN_LABELS_EN: Record<string, string> = {
  economy: "Economy",
  premium: "Premium Eco",
  business: "Business",
  first: "First",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string, lang: "fr" | "en"): string {
  return new Date(iso).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AlertesClient() {
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [email, setEmail] = useState("");
  const [alerts, setAlerts] = useState<PriceAlert[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fr = lang === "fr";

  const cabinLabels = fr ? CABIN_LABELS_FR : CABIN_LABELS_EN;

  async function handleFetch(e: React.FormEvent) {
    e.preventDefault();
    if (!email || loading) return;
    setLoading(true);
    setFetchError(false);
    setAlerts(null);
    try {
      const res = await fetch(`/api/alerts?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      setAlerts((data.alerts as PriceAlert[]).filter((a) => a.active));
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setAlerts((prev) => prev?.filter((a) => a.id !== id) ?? null);
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header lang={lang} onLangChange={setLang} />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pb-12">
        {/* Hero */}
        <div className="pt-8 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🔔</span>
            <h1 className="text-2xl font-black text-fg">
              {fr ? "Mes alertes prix" : "My price alerts"}
            </h1>
          </div>
          <p className="text-sm text-muted">
            {fr
              ? "Entre ton email pour voir et gérer tes alertes actives."
              : "Enter your email to view and manage your active alerts."}
          </p>
        </div>

        {/* Email form */}
        <form onSubmit={handleFetch} className="flex gap-2 mb-8">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={fr ? "ton@email.com" : "your@email.com"}
            className="flex-1 bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-primary/50 transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-primary hover:bg-primary/90 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {loading
              ? fr ? "Chargement…" : "Loading…"
              : fr ? "Voir mes alertes →" : "View my alerts →"}
          </button>
        </form>

        {/* Error */}
        {fetchError && (
          <p className="text-sm text-red-400 mb-4">
            {fr ? "Erreur de chargement, réessaie." : "Loading error, please retry."}
          </p>
        )}

        {/* Results */}
        {alerts !== null && (
          alerts.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-muted text-sm">
                {fr
                  ? `Aucune alerte active pour ${email}.`
                  : `No active alerts for ${email}.`}
              </p>
              <Link
                href="/"
                className="inline-block text-sm text-primary hover:underline"
              >
                {fr ? "Rechercher un vol →" : "Search a flight →"}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted mb-2">
                {alerts.length} {fr ? "alerte(s) active(s)" : "active alert(s)"}
              </p>
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-surface border border-border rounded-2xl p-4 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-fg text-sm">
                        {alert.from} → {alert.to}
                      </span>
                      <span className="text-[11px] text-muted bg-surface-2 px-2 py-0.5 rounded-lg">
                        {cabinLabels[alert.cabin] ?? alert.cabin}
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      {fr ? "Alerte si prix <" : "Alert if price <"}{" "}
                      <span className="text-success font-bold">
                        ${alert.targetPrice}
                      </span>
                    </p>
                    <p className="text-[11px] text-subtle">
                      {fr ? "Créée le" : "Created"}{" "}
                      {formatDate(alert.createdAt, lang)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    disabled={deletingId === alert.id}
                    aria-label={fr ? "Supprimer l'alerte" : "Delete alert"}
                    className="flex-shrink-0 text-muted hover:text-red-400 transition-colors text-lg disabled:opacity-40 pt-0.5"
                  >
                    {deletingId === alert.id ? "…" : "✕"}
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </main>

      <Footer lang={lang} />
    </div>
  );
}
