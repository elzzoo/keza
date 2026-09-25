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
import { EngineObservabilitySection } from "./components/EngineObservabilitySection";

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

            <EngineObservabilitySection engineStats={stats.engineStats} />

            <SystemDetailsSection stats={stats} backupStatus={backupStatus} />

            <AdminQuickLinks pushSubscriptions={stats.pushSubscriptions} />

            <B2BLeadsTable leads={leads} />
          </>
        )}
      </div>
    </div>
  );
}
