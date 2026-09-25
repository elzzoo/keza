import "server-only";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/auth";
import { getDailyCronStatus } from "@/lib/cronStatus";
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
import { AdminErrorBanner } from "./components/AdminErrorBanner";
import { EmailEngagementSection } from "./components/EmailEngagementSection";
import { AffiliateRevenueSection } from "./components/AffiliateRevenueSection";
import { SystemDetailsSection } from "./components/SystemDetailsSection";
import { AdminOverviewSection } from "./components/AdminOverviewSection";
import { PriceAlertsParitySection } from "./components/PriceAlertsParitySection";
import { CronStatusSection } from "./components/CronStatusSection";

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

        {error && <AdminErrorBanner message={error} />}

        {/* Stats grid */}
        {stats && (
          <>
            <AdminOverviewSection stats={stats} backupStatus={backupStatus} />

            {priceAlertsParity && <PriceAlertsParitySection status={priceAlertsParity} />}

            {cronStatus && <CronStatusSection cronStatus={cronStatus} />}

            <EmailEngagementSection
              confirmationOpens={stats.totalConfirmationOpens}
              priceDropOpens={stats.totalPriceDropOpens}
              digestOpens={stats.totalDigestOpens}
            />

            <AffiliateRevenueSection
              clicksToday={stats.clicksToday}
              clicksTotal={stats.clicksTotal}
              estimatedBookings={stats.estimatedBookings}
              estimatedRevenue={stats.estimatedRevenue}
            />

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

            <SystemDetailsSection stats={stats} backupStatus={backupStatus} />

            <AdminQuickLinks pushSubscriptions={stats.pushSubscriptions} />

            <B2BLeadsTable leads={leads} />
          </>
        )}
      </div>
    </div>
  );
}
