"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import type { PriceAlert } from "@/lib/alerts";
import { trackAlertDeleted } from "@/lib/analytics";
import { PushAlertButton } from "@/components/PushAlertButton";
import { ReferralCard } from "@/components/ReferralCard";
import { MilesValueScore } from "@/components/MilesValueScore";
import { useProfile } from "@/hooks/useProfile";

// ─── Email localStorage key ───────────────────────────────────────────────────

const EMAIL_STORAGE_KEY = "keza:alertes:email";
const TOKEN_STORAGE_KEY = "keza:alertes:token";

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

function progressPct(alert: PriceAlert): number {
  const current = alert.lastPrice ?? alert.basePrice;
  const range = alert.basePrice - alert.targetPrice;
  if (range <= 0) return 100;
  const drop = alert.basePrice - current;
  return Math.min(100, Math.max(0, Math.round((drop / range) * 100)));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AlertesClient() {
  const { profile } = useProfile();
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [email, setEmail] = useState("");
  const [alerts, setAlerts] = useState<PriceAlert[] | null>(null);
  const [manageToken, setManageToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const fr = lang === "fr";

  const cabinLabels = fr ? CABIN_LABELS_FR : CABIN_LABELS_EN;

  const fetchAlerts = useCallback(async (emailArg: string, tokenArg: string) => {
    const normalizedEmail = emailArg.trim().toLowerCase();
    if (!normalizedEmail || !tokenArg) return;
    setLoading(true);
    setFetchError(false);
    setNotice(null);
    setAlerts(null);
    try {
      const res = await fetch(
        `/api/alerts?email=${encodeURIComponent(normalizedEmail)}&token=${encodeURIComponent(tokenArg)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { alerts: PriceAlert[] } = await res.json();
      if (!Array.isArray(data.alerts)) throw new Error("Unexpected payload");
      setAlerts(data.alerts.filter((a) => a.active));
      localStorage.setItem(EMAIL_STORAGE_KEY, normalizedEmail);
      localStorage.setItem(TOKEN_STORAGE_KEY, tokenArg);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []); // setters from useState are stable — no deps needed

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const urlEmail = params.get("email");
    const urlToken = params.get("token");
    if (urlEmail && urlToken) {
      const normalizedEmail = urlEmail.trim().toLowerCase();
      setEmail(normalizedEmail);
      setManageToken(urlToken);
      fetchAlerts(normalizedEmail, urlToken);
      return;
    }

    const saved = localStorage.getItem(EMAIL_STORAGE_KEY);
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (saved && savedToken) {
      setEmail(saved);
      setManageToken(savedToken);
      fetchAlerts(saved, savedToken);
    }
  }, [fetchAlerts]);

  async function handleFetch(e: React.FormEvent) {
    e.preventDefault();
    if (!email || loading) return;
    const normalizedEmail = email.trim().toLowerCase();
    setLoading(true);
    setFetchError(false);
    setNotice(null);
    try {
      const res = await fetch("/api/alerts/manage-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAlerts(null);
      setNotice(fr
        ? "Si des alertes existent pour cet email, un lien de gestion vient d'être envoyé."
        : "If alerts exist for this email, a management link has been sent.");
      localStorage.setItem(EMAIL_STORAGE_KEY, normalizedEmail);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    const alertToDelete = alerts?.find((a) => a.id === id);
    setDeletingId(id);
    try {
      setDeleteError(null);
      const normalizedEmail = email.trim().toLowerCase();
      const res = await fetch(
        `/api/alerts?id=${encodeURIComponent(id)}&email=${encodeURIComponent(normalizedEmail)}&token=${encodeURIComponent(manageToken)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        if (alertToDelete) {
          trackAlertDeleted({ from: alertToDelete.from, to: alertToDelete.to, cabin: alertToDelete.cabin });
        }
        setAlerts((prev) => {
          const next = prev?.filter((a) => a.id !== id) ?? null;
          if (next !== null && next.length === 0) {
            localStorage.removeItem(EMAIL_STORAGE_KEY);
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            setManageToken("");
          }
          return next;
        });
      } else {
        setDeleteError(fr ? "Erreur lors de la suppression." : "Deletion failed.");
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
              ? "Entre ton email pour recevoir un lien sécurisé de gestion."
              : "Enter your email to receive a secure management link."}
          </p>
        </div>

        {/* Push notifications opt-in */}
        <PushAlertButton lang={lang} email={email} token={manageToken} />

        {/* Email form */}
        <form onSubmit={handleFetch} className="flex gap-2 mt-4 mb-8">
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
            disabled={loading || !email.trim()}
            className="bg-primary hover:bg-primary/90 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {loading
              ? fr ? "Chargement…" : "Loading…"
              : fr ? "Recevoir le lien →" : "Send link →"}
          </button>
        </form>

        {notice && (
          <p className="text-sm text-success mb-4">{notice}</p>
        )}

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
                  ? `Aucune alerte active pour ${email.trim().toLowerCase()}.`
                  : `No active alerts for ${email.trim().toLowerCase()}.`}
              </p>
              <Link
                href="/"
                className="inline-block text-sm text-primary hover:underline"
              >
                {fr ? "Rechercher un vol →" : "Search a flight →"}
              </Link>
              <Link href="/deals" className="inline-block text-sm text-muted hover:text-primary hover:underline">
                {fr ? "Voir les deals du moment →" : "Browse current deals →"}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted mb-2">
                {alerts.length} {fr ? "alerte(s) active(s)" : "active alert(s)"}
              </p>
              {deleteError && (
                <p className="text-xs text-red-400 mb-2">{deleteError}</p>
              )}
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-surface border border-border rounded-2xl p-4 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1 flex-1">
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
                    {/* Progress towards target */}
                    <div className="mt-2">
                      {alert.lastPrice !== undefined && (
                        <p className="text-xs text-subtle mb-1">
                          {fr ? "Prix actuel :" : "Current price:"}{" "}
                          <span className={`font-bold ${alert.lastPrice <= alert.targetPrice ? "text-success" : "text-fg"}`}>
                            ${alert.lastPrice}
                          </span>
                          {alert.lastPrice <= alert.targetPrice && (
                            <span className="ml-1 text-success text-[10px]">{fr ? "🎉 Seuil atteint" : "🎉 Target reached"}</span>
                          )}
                        </p>
                      )}
                      <div className="w-full bg-[#0a0a0f] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{
                            width: `${progressPct(alert)}%`,
                            background: progressPct(alert) >= 80 ? "#10b981" : progressPct(alert) >= 50 ? "#f59e0b" : "#3b82f6",
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-subtle mt-0.5">
                        {progressPct(alert)}% {fr ? "vers l'objectif" : "to target"} · ref. ${alert.basePrice}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    disabled={deletingId === alert.id}
                    aria-label={fr
                      ? `Supprimer l'alerte ${alert.from} → ${alert.to}`
                      : `Delete alert ${alert.from} → ${alert.to}`}
                    className="flex-shrink-0 text-muted hover:text-red-400 transition-colors text-lg disabled:opacity-40 pt-0.5"
                  >
                    {deletingId === alert.id ? "…" : "✕"}
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {/* Miles value score + Referral card — shown when alerts are loaded */}
        {alerts !== null && email && manageToken && (
          <div className="mt-6 space-y-4">
            <MilesValueScore savedPrograms={profile?.programs} lang={lang} />
            <ReferralCard email={email} token={manageToken} lang={lang} />
          </div>
        )}
      </main>

      <Footer lang={lang} />
    </div>
  );
}
