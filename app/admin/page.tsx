import "server-only";
import { redis } from "@/lib/redis";
import { DEALS_KEY } from "@/lib/redisKeys";
import type { PriceAlert } from "@/lib/alerts";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/auth";

// ─── B2B Lead type ───────────────────────────────────────────────────────────

interface B2BLead {
  name: string;
  company: string;
  email: string;
  teamSize: string;
  message?: string;
  receivedAt: string;
}

export const metadata: Metadata = { title: "Admin — KEZA", robots: "noindex" };
export const dynamic = "force-dynamic";

// ─── B2B leads fetching ──────────────────────────────────────────────────────

async function fetchB2BLeads(): Promise<B2BLead[]> {
  const raw = await redis.lrange("keza:b2b:leads", 0, 49);
  return raw
    .map((item) => {
      try {
        return typeof item === "string" ? JSON.parse(item) : item;
      } catch {
        return null;
      }
    })
    .filter((x): x is B2BLead => x !== null);
}

// ─── Redis key helpers ───────────────────────────────────────────────────────

const ALL_ROUTES_KEY = "keza:alerts:routes";
const PUSH_SUBS_KEY = "keza:push:subscriptions";
const LAST_CRON_KEY = "keza:admin:last_cron_at";
const ALERT_KEY = (id: string) => `keza:alert:${id}`;
const ALERTS_BY_ROUTE = (route: string) => {
  const [from, to] = route.split(":");
  return `keza:alerts:route:${from}:${to}`;
};

// ─── Data fetching ───────────────────────────────────────────────────────────

async function fetchStats() {
  const [routes, pushSubs, lastCronRaw, dealsTtl] = await Promise.all([
    redis.smembers(ALL_ROUTES_KEY),
    redis.scard(PUSH_SUBS_KEY),
    redis.get<string>(LAST_CRON_KEY),
    redis.ttl(DEALS_KEY),
  ]);

  // Count total active alerts across all routes
  let activeAlerts = 0;
  for (const route of routes) {
    const ids = await redis.get<string[]>(ALERTS_BY_ROUTE(route)) ?? [];
    for (const id of ids) {
      const alert = await redis.get<PriceAlert>(ALERT_KEY(id));
      if (alert?.active) activeAlerts++;
    }
  }

  // Email opens — last 7 days
  const today = new Date();
  const emailOpensByDay: Array<{ date: string; confirmation: number; priceDrop: number; digest: number }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayData = await redis.hgetall(`keza:email:opens:${dateStr}`) as Record<string, string> | null;
    emailOpensByDay.push({
      date: dateStr,
      confirmation: parseInt(dayData?.confirmation ?? "0"),
      priceDrop: parseInt(dayData?.["price-drop"] ?? "0"),
      digest: parseInt(dayData?.digest ?? "0"),
    });
  }
  const totalEmailOpens = emailOpensByDay.reduce((s, d) => s + d.confirmation + d.priceDrop + d.digest, 0);

  // Estimated revenue: affiliate bookings × avg commission
  // We can't track actual bookings without server-side affiliate API
  // Estimate: total Book Click events × 3% conversion × $18 avg commission
  // Store in Redis when we have better data — for now use a placeholder
  const estimatedBookings = Math.round(activeAlerts * 0.1); // 10% of alerts convert to booking
  const estimatedRevenue = estimatedBookings * 18; // $18 avg affiliate commission

  return {
    activeAlerts,
    activeRoutes: routes.length,
    pushSubscriptions: pushSubs ?? 0,
    dealsCached: dealsTtl > 0,
    dealsTtlSeconds: dealsTtl > 0 ? dealsTtl : 0,
    lastCronAt: lastCronRaw ?? null,
    fetchedAt: new Date().toISOString(),
    emailOpensByDay,
    totalEmailOpens,
    totalConfirmationOpens: emailOpensByDay.reduce((s, d) => s + d.confirmation, 0),
    totalPriceDropOpens: emailOpensByDay.reduce((s, d) => s + d.priceDrop, 0),
    totalDigestOpens: emailOpensByDay.reduce((s, d) => s + d.digest, 0),
    estimatedRevenue,
    estimatedBookings,
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color = "blue",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: "blue" | "green" | "amber" | "purple";
}) {
  const colors = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-green-50 border-green-200 text-green-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs opacity-60">{sub}</p>}
    </div>
  );
}

function LoginForm() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Admin KEZA</h1>
        <p className="mt-1 text-sm text-gray-500">
          Accès restreint. Entrez le secret admin.
        </p>
        <form method="POST" action="/api/admin/session" className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Secret</span>
            <input
              type="password"
              name="secret"
              autoComplete="off"
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Accéder →
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!verifyAdminSessionToken(sessionToken)) {
    return <LoginForm />;
  }

  let stats: Awaited<ReturnType<typeof fetchStats>> | null = null;
  let leads: B2BLead[] = [];
  let error: string | null = null;

  try {
    [stats, leads] = await Promise.all([fetchStats(), fetchB2BLeads()]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Erreur Redis inconnue";
  }

  function formatTtl(seconds: number): string {
    if (seconds <= 0) return "expiré";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `expire dans ${h}h ${m}m`;
    return `expire dans ${m}m`;
  }

  function formatDate(iso: string | null): string {
    if (!iso) return "jamais";
    const d = new Date(iso);
    return d.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "medium" });
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Données en temps réel ·{" "}
              {stats ? formatDate(stats.fetchedAt) : "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              KEZA
            </span>
            <form method="POST" action="/api/admin/session?_method=DELETE">
              <button
                type="submit"
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <strong>Erreur Redis :</strong> {error}
          </div>
        )}

        {/* Stats grid */}
        {stats && (
          <>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard
                label="Alertes actives"
                value={stats.activeAlerts}
                sub={`${stats.activeRoutes} route${stats.activeRoutes !== 1 ? "s" : ""}`}
                color="blue"
              />
              <StatCard
                label="Push legacy"
                value={stats.pushSubscriptions}
                sub="clé globale dépréciée"
                color="purple"
              />
              <StatCard
                label="Deals en cache"
                value={stats.dealsCached ? "✅" : "❌"}
                sub={stats.dealsCached ? formatTtl(stats.dealsTtlSeconds) : "aucun cache"}
                color={stats.dealsCached ? "green" : "amber"}
              />
              <StatCard
                label="Dernier cron"
                value={stats.lastCronAt ? "✅" : "—"}
                sub={formatDate(stats.lastCronAt)}
                color={stats.lastCronAt ? "green" : "amber"}
              />
            </div>

            {/* Email engagement */}
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                Email Engagement — 7 derniers jours
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <StatCard
                  label="Confirmations ouvertes"
                  value={stats.totalConfirmationOpens}
                  sub="emails de création d'alerte"
                  color="blue"
                />
                <StatCard
                  label="Alertes prix ouvertes"
                  value={stats.totalPriceDropOpens}
                  sub="notifications de baisse"
                  color="green"
                />
                <StatCard
                  label="Digests ouverts"
                  value={stats.totalDigestOpens}
                  sub="récaps hebdos"
                  color="purple"
                />
              </div>
            </div>

            {/* Revenue estimate */}
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                Revenu Estimé (Affiliation)
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  label="Réservations estimées"
                  value={stats.estimatedBookings}
                  sub="10% des alertes actives"
                  color="amber"
                />
                <StatCard
                  label="Revenu estimé"
                  value={`$${stats.estimatedRevenue}`}
                  sub="à $18 de commission moy."
                  color="green"
                />
              </div>
            </div>

            {/* Details table */}
            <div className="mt-8 rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <h2 className="text-sm font-semibold text-gray-700">Détails système</h2>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-50">
                  {[
                    { label: "Alertes actives", value: stats.activeAlerts },
                    { label: "Routes surveillées", value: stats.activeRoutes },
                    { label: "Abonnements push", value: stats.pushSubscriptions },
                    { label: "Cache deals", value: stats.dealsCached ? `Actif (TTL ${stats.dealsTtlSeconds}s)` : "Vide" },
                    { label: "Dernier cron deals", value: stats.lastCronAt ?? "Jamais exécuté" },
                    { label: "Données récupérées le", value: formatDate(stats.fetchedAt) },
                  ].map(({ label, value }) => (
                    <tr key={label}>
                      <td className="px-6 py-3 font-medium text-gray-500">{label}</td>
                      <td className="px-6 py-3 text-gray-900">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quick links */}
            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-700">
                Actions cron désactivées depuis le navigateur: utiliser Authorization: Bearer CRON_SECRET.
              </span>
            </div>
            {/* VAPID status note */}
            {stats.pushSubscriptions > 0 && (
              <p className="mt-3 text-xs text-gray-400">
                Pour envoyer un push test, POST sur{" "}
                <code className="font-mono bg-gray-100 px-1 rounded">
                  /api/push/test
                </code>{" "}
                avec le header Authorization: Bearer CRON_SECRET.
              </p>
            )}

            {/* B2B Leads */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Leads B2B Entreprises
                </h2>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  {leads.length} lead{leads.length !== 1 ? "s" : ""}
                </span>
              </div>
              {leads.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
                  Aucun lead pour l&apos;instant. Les soumissions du formulaire{" "}
                  <code className="font-mono bg-gray-100 px-1 rounded">/entreprises</code>{" "}
                  apparaîtront ici.
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reçu</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nom</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Entreprise</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Équipe</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Message</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {leads.map((lead, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                              {formatDate(lead.receivedAt)}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                              {lead.name}
                            </td>
                            <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                              {lead.company}
                            </td>
                            <td className="px-4 py-3 text-blue-600 whitespace-nowrap">
                              <a href={`mailto:${lead.email}`} className="hover:underline">
                                {lead.email}
                              </a>
                            </td>
                            <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                              {lead.teamSize}
                            </td>
                            <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                              {lead.message || <span className="italic opacity-40">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
