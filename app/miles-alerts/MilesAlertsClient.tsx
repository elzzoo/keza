"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import type { MilesAlert } from "@/lib/miles-alerts";

const L = {
  fr: {
    title: "Alertes Miles",
    subtitle: "Définissez des alertes pour les bonnes affaires miles. Nous vous enverrons un email quand votre prix cible est atteint.",
    emailRequired: "Entrez votre email",
    noneOnDevice: "Nous t'avons envoyé un lien de gestion si des alertes existent pour cet email.",
    linkSent: "Lien de gestion envoyé si des alertes existent pour cet email.",
    errorSendingLink: "Impossible d'envoyer le lien de gestion",
    errorLoading: "Erreur lors du chargement des alertes",
    confirmDelete: "Supprimer cette alerte ?",
    missingToken: "Jeton de gestion manquant pour cette alerte",
    errorDeleting: "Erreur lors de la suppression",
    deleted: "Alerte supprimée",
    loading: "Chargement…",
    search: "Rechercher",
    noneFound: "Aucune alerte trouvée pour cet email.",
    yourAlerts: (n: number) => `Vos alertes (${n})`,
    alertWhen: (cpp: string) => `Alerte si CPP ≤ ${cpp}¢`,
    created: (date: string) => `Créée le ${date}`,
    delete: "Supprimer",
  },
  en: {
    title: "Miles Alerts",
    subtitle: "Set alerts for great miles deals. We'll email you when your target price is reached.",
    emailRequired: "Enter your email",
    noneOnDevice: "We sent a manage link if alerts exist for that email.",
    linkSent: "Manage link sent if alerts exist for that email.",
    errorSendingLink: "Unable to send manage link",
    errorLoading: "Error loading alerts",
    confirmDelete: "Delete this alert?",
    missingToken: "Missing manage token for this alert",
    errorDeleting: "Error deleting alert",
    deleted: "Alert deleted",
    loading: "Loading…",
    search: "Search",
    noneFound: "No alerts found for this email.",
    yourAlerts: (n: number) => `Your alerts (${n})`,
    alertWhen: (cpp: string) => `Alert when CPP ≤ ${cpp}¢`,
    created: (date: string) => `Created ${date}`,
    delete: "Delete",
  },
};

export function MilesAlertsClient() {
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const t = L[lang];
  const [email, setEmail] = useState("");
  const [alerts, setAlerts] = useState<MilesAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const getStoredToken = (forEmail: string) =>
    typeof window !== "undefined"
      ? localStorage.getItem(`keza:miles-alerts:token:${forEmail.toLowerCase().trim()}`)
      : null;

  const storeToken = (forEmail: string, token: string) => {
    localStorage.setItem(`keza:miles-alerts:token:${forEmail.toLowerCase().trim()}`, token);
  };

  const loadAlerts = async (forEmail: string, token: string) => {
    const normalizedEmail = forEmail.toLowerCase().trim();
    const res = await fetch(`/api/miles-alerts?email=${encodeURIComponent(normalizedEmail)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    setAlerts(data.alerts || []);
    setSearched(true);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    const tokenParam = params.get("token");
    if (!emailParam || !tokenParam) return;

    const normalizedEmail = emailParam.toLowerCase().trim();
    setEmail(normalizedEmail);
    storeToken(normalizedEmail, tokenParam);
    setLoading(true);
    loadAlerts(normalizedEmail, tokenParam)
      .catch(() => toast.error(t.errorLoading))
      .finally(() => setLoading(false));

    params.delete("token");
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
    window.history.replaceState(null, "", nextUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestManageLink = async (forEmail: string) => {
    const normalizedEmail = forEmail.toLowerCase().trim();
    const res = await fetch("/api/miles-alerts/manage-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail }),
    });
    if (!res.ok) throw new Error("Failed to send manage link");
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error(t.emailRequired);
      return;
    }

    const token = getStoredToken(email);
    if (!token) {
      setLoading(true);
      try {
        await requestManageLink(email);
        toast.success(t.noneOnDevice);
        setAlerts([]);
        setSearched(true);
      } catch {
        toast.error(t.errorSendingLink);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      await loadAlerts(email, token);
    } catch {
      toast.error(t.errorLoading);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (email: string, route: string, program: string) => {
    if (!confirm(t.confirmDelete)) return;

    const token = getStoredToken(email);
    if (!token) {
      toast.error(t.missingToken);
      return;
    }

    try {
      // Construct the Redis key format: keza:miles-alert:email:route:program
      const alertKey = `keza:miles-alert:${email}:${route}:${program}`;
      const res = await fetch("/api/miles-alerts", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ alertId: alertKey }),
      });

      if (!res.ok) throw new Error("Failed to delete");
      setAlerts(alerts.filter((a) => !(a.email === email && a.route === route && a.program === program)));
      toast.success(t.deleted);
    } catch {
      toast.error(t.errorDeleting);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header lang={lang} onLangChange={setLang} />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black leading-tight">
            <span className="bg-gradient-to-br from-blue-300 via-primary to-blue-500 bg-clip-text text-transparent">
              {t.title}
            </span>
          </h1>
          <p className="text-sm text-muted mt-2">{t.subtitle}</p>
        </div>

        <div className="space-y-6">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="bg-surface border border-border rounded-2xl p-5">
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 px-4 py-2 bg-bg border border-border rounded-xl text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading ? t.loading : t.search}
              </button>
            </div>
          </form>

          {/* Results */}
          {searched && alerts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted">{t.noneFound}</p>
            </div>
          )}

          {alerts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-fg">{t.yourAlerts(alerts.length)}</h2>
              {alerts.map((alert) => (
                <div
                  key={`${alert.email}:${alert.route}:${alert.program}`}
                  className="bg-surface border border-border rounded-xl p-4 flex items-start justify-between"
                >
                  <div>
                    <p className="font-semibold text-fg">{alert.route}</p>
                    <p className="text-sm text-muted">{alert.program}</p>
                    <p className="text-sm text-primary mt-2">
                      {t.alertWhen(alert.thresholdCpp.toFixed(2))}
                    </p>
                    <p className="text-xs text-muted/60 mt-1">
                      {t.created(new Date(alert.createdAt * 1000).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US"))}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(alert.email, alert.route, alert.program)}
                    className="px-3 py-1 text-sm text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
                  >
                    {t.delete}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer lang={lang} />
    </div>
  );
}
