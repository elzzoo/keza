import "server-only";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/auth";
import { getDailyCronStatus } from "@/lib/cronStatus";
import {
  cronHealthColor,
  cronHealthLabel,
  formatDate,
  formatMismatchIds,
  formatTtl,
} from "./format";
import {
  fetchB2BLeads,
  fetchBackupStatus,
  fetchPriceAlertsParityStatus,
  fetchStats,
  type B2BLead,
  type PriceAlertsParityStatus,
} from "./data";
import { StatCard } from "./components/StatCard";
import { B2BLeadsTable } from "./components/B2BLeadsTable";
import { LoginForm } from "./components/LoginForm";
import { AdminHeader } from "./components/AdminHeader";
import { AdminQuickLinks } from "./components/AdminQuickLinks";

export const metadata: Metadata = { title: "Admin — Xalifly", robots: "noindex" };
export const dynamic = "force-dynamic";

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!verifyAdminSessionToken(sessionToken)) {
    const { error } = await searchParams;
    return <LoginForm hasError={error === "1"} />;
  }

  let stats: Awaited<ReturnType<typeof fetchStats>> | null = null;
  let cronStatus: Awaited<ReturnType<typeof getDailyCronStatus>> | null = null;
  let backupStatus: Awaited<ReturnType<typeof fetchBackupStatus>> | null = null;
  let priceAlertsParity: PriceAlertsParityStatus | null = null;
  let leads: B2BLead[] = [];
  let error: string | null = null;

  try {
    [stats, leads, cronStatus, backupStatus, priceAlertsParity] = await Promise.all([
      fetchStats(),
      fetchB2BLeads(),
      getDailyCronStatus(),
      fetchBackupStatus(),
      fetchPriceAlertsParityStatus(),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Erreur Redis inconnue";
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <AdminHeader fetchedAt={stats?.fetchedAt ?? null} />

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

            {backupStatus && (
              <div className="mt-4">
                <StatCard
                  label="Backup Redis"
                  value={backupStatus.lastAt ? (backupStatus.meta?.emailed ? "Envoyé" : "Snapshot") : "—"}
                  sub={
                    backupStatus.lastAt
                      ? `${formatDate(backupStatus.lastAt)}${backupStatus.meta?.warning ? " · email non configuré" : ""}`
                      : "aucun backup enregistré"
                  }
                  color={backupStatus.lastAt ? (backupStatus.meta?.emailed ? "green" : "amber") : "purple"}
                />
              </div>
            )}

            {/* Price alerts Postgres migration */}
            {priceAlertsParity && (
              <div className="mt-8">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-700">
                  Migration alertes Redis/Postgres
                </h2>
                {priceAlertsParity.ok ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <StatCard
                        label="Parité"
                        value={priceAlertsParity.data.inSync ? "OK" : "Écart"}
                        sub={
                          priceAlertsParity.data.inSync
                            ? "Redis et Postgres alignés"
                            : "vérifier les écarts ci-dessous"
                        }
                        color={priceAlertsParity.data.inSync ? "green" : "amber"}
                      />
                      <StatCard
                        label="Redis actives"
                        value={priceAlertsParity.data.redis.active}
                        sub={`${priceAlertsParity.data.redis.valid}/${priceAlertsParity.data.redis.scanned} valides`}
                        color="blue"
                      />
                      <StatCard
                        label="Postgres actives"
                        value={priceAlertsParity.data.postgres.active}
                        sub={`${priceAlertsParity.data.postgres.total} miroir(s)`}
                        color="purple"
                      />
                      <StatCard
                        label="Écarts"
                        value={
                          priceAlertsParity.data.missingInPostgres.length +
                          priceAlertsParity.data.extraInPostgres.length +
                          priceAlertsParity.data.activeMismatch.length
                        }
                        sub="missing + extra + active"
                        color={priceAlertsParity.data.inSync ? "green" : "amber"}
                      />
                    </div>
                    {!priceAlertsParity.data.inSync && (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        <p className="font-semibold">Écarts de migration à corriger avant bascule de lecture.</p>
                        <dl className="mt-3 grid gap-2">
                          <div>
                            <dt className="font-medium">Manquantes dans Postgres</dt>
                            <dd className="font-mono text-xs">{formatMismatchIds(priceAlertsParity.data.missingInPostgres)}</dd>
                          </div>
                          <div>
                            <dt className="font-medium">En trop dans Postgres</dt>
                            <dd className="font-mono text-xs">{formatMismatchIds(priceAlertsParity.data.extraInPostgres)}</dd>
                          </div>
                          <div>
                            <dt className="font-medium">État actif différent</dt>
                            <dd className="font-mono text-xs">{formatMismatchIds(priceAlertsParity.data.activeMismatch)}</dd>
                          </div>
                        </dl>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <p className="font-semibold">Statut indisponible.</p>
                    <p className="mt-1">
                      {priceAlertsParity.error}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Cron observability */}
            {cronStatus && (
              <div className="mt-8">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-700">
                  Crons Daily
                </h2>
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard
                    label="Santé"
                    value={cronHealthLabel(cronStatus.health)}
                    sub={cronStatus.lastRun?.runId ? `run ${cronStatus.lastRun.runId.slice(0, 8)}` : "aucun run enregistré"}
                    color={cronHealthColor(cronStatus.health)}
                  />
                  <StatCard
                    label="Dernier dispatch"
                    value={cronStatus.lastRun ? "✅" : "—"}
                    sub={formatDate(cronStatus.lastRun?.startedAt ?? null)}
                    color={cronStatus.lastRun ? "green" : "amber"}
                  />
                  <StatCard
                    label="Jobs suivis"
                    value={cronStatus.jobs.length}
                    sub={`${cronStatus.jobs.filter((job) => job.state?.status === "accepted").length} accepté(s)`}
                    color="blue"
                  />
                </div>
                <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-gray-100 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <span>Job</span>
                    <span>Status</span>
                    <span>Code</span>
                  </div>
                  {cronStatus.jobs.map((job) => (
                    <div
                      key={job.path}
                      className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-gray-100 px-4 py-2 text-sm last:border-b-0"
                    >
                      <span className="truncate text-gray-700">{job.path}</span>
                      <span className="font-medium text-gray-900">{job.state?.status ?? "pending"}</span>
                      <span className="text-gray-500">{job.state?.statusCode ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

            {/* Affiliate clicks + revenue */}
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                Clicks Affiliés &amp; Revenu
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard
                  label="Clicks aujourd'hui"
                  value={stats.clicksToday}
                  sub="bouton Réserver"
                  color="blue"
                />
                <StatCard
                  label="Clicks total"
                  value={stats.clicksTotal}
                  sub="depuis le lancement"
                  color="purple"
                />
                <StatCard
                  label="Réservations estimées"
                  value={stats.estimatedBookings}
                  sub="3% conversion × clicks"
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

            {/* Engine Observability — 7 days */}
            <div className="mt-8">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                Moteur de recherche — 7 derniers jours
              </h2>

              {/* Today's summary cards */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-4">
                <StatCard
                  label="Recherches aujourd'hui"
                  value={stats.engineStats[0]?.searches ?? 0}
                  sub="requêtes /api/search"
                  color="blue"
                />
                <StatCard
                  label="Cache hit rate"
                  value={(() => {
                    const s = stats.engineStats[0];
                    const total = (s?.cacheHits ?? 0) + (s?.cacheMisses ?? 0);
                    return total > 0 ? `${Math.round((s.cacheHits / total) * 100)}%` : "—";
                  })()}
                  sub="résultats depuis Redis"
                  color="green"
                />
                <StatCard
                  label="Duffel wins"
                  value={stats.engineStats[0]?.duffelWins ?? 0}
                  sub="résultats haute confiance"
                  color="purple"
                />
                <StatCard
                  label="TP wins"
                  value={stats.engineStats[0]?.tpWins ?? 0}
                  sub="résultats Travelpayouts"
                  color="amber"
                />
              </div>

              {/* 7-day table */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Recherches</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Cache %</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Duffel</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">TP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {stats.engineStats.map((row) => {
                      const total = row.cacheHits + row.cacheMisses;
                      const hitRate = total > 0 ? Math.round((row.cacheHits / total) * 100) : null;
                      return (
                        <tr key={row.date} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">{row.date}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">{row.searches || "—"}</td>
                          <td className="px-4 py-3 text-right">
                            {hitRate !== null ? (
                              <span className={`font-semibold ${hitRate >= 50 ? "text-green-600" : "text-amber-600"}`}>
                                {hitRate}%
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-purple-600">{row.duffelWins || "—"}</td>
                          <td className="px-4 py-3 text-right text-amber-600">{row.tpWins || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
                    {
                      label: "Dernier backup Redis",
                      value: backupStatus?.lastAt
                        ? `${formatDate(backupStatus.lastAt)} (${backupStatus.meta?.emailed ? "email envoyé" : backupStatus.meta?.warning ?? "snapshot créé"})`
                        : "Jamais exécuté",
                    },
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

            <AdminQuickLinks pushSubscriptions={stats.pushSubscriptions} />

            <B2BLeadsTable leads={leads} />
          </>
        )}
      </div>
    </div>
  );
}
