import "server-only";
import { redis } from "@/lib/redis";
import { DEALS_KEY } from "@/lib/redisKeys";
import type { PriceAlert } from "@/lib/alerts";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — KEZA", robots: "noindex" };
export const dynamic = "force-dynamic";

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

  return {
    activeAlerts,
    activeRoutes: routes.length,
    pushSubscriptions: pushSubs ?? 0,
    dealsCached: dealsTtl > 0,
    dealsTtlSeconds: dealsTtl > 0 ? dealsTtl : 0,
    lastCronAt: lastCronRaw ?? null,
    fetchedAt: new Date().toISOString(),
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
        <form method="GET" className="mt-6 space-y-4">
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

interface Props {
  searchParams: Promise<{ secret?: string }>;
}

export default async function AdminPage({ searchParams }: Props) {
  const params = await searchParams;
  const cronSecret = process.env.CRON_SECRET;

  // Guard: no secret configured or wrong secret
  if (!cronSecret || params.secret !== cronSecret) {
    return <LoginForm />;
  }

  let stats: Awaited<ReturnType<typeof fetchStats>> | null = null;
  let error: string | null = null;

  try {
    stats = await fetchStats();
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
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            KEZA
          </span>
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
                label="Push abonnés"
                value={stats.pushSubscriptions}
                sub="navigateurs enregistrés"
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
              <a
                href={`/api/cron/deals?secret=${params.secret}`}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-600 hover:bg-gray-50"
              >
                ▶ Lancer cron deals
              </a>
              <a
                href={`/api/cron/alerts?secret=${params.secret}`}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-600 hover:bg-gray-50"
              >
                ▶ Lancer cron alertes
              </a>
              <a
                href={`/api/cron/miles-prices?secret=${params.secret}`}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-600 hover:bg-gray-50"
              >
                ▶ Recalibrer miles
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
