import type { DailyCronStatus } from "@/lib/cronStatus";
import type {
  AdminStats,
  B2BLead,
  BackupStatus,
  PriceAlertsParityStatus,
} from "../data";
import { AdminErrorBanner } from "./AdminErrorBanner";
import { AdminHeader } from "./AdminHeader";
import { AdminOverviewSection } from "./AdminOverviewSection";
import { AffiliateRevenueSection } from "./AffiliateRevenueSection";
import { B2BLeadsTable } from "./B2BLeadsTable";
import { CronStatusSection } from "./CronStatusSection";
import { EmailEngagementSection } from "./EmailEngagementSection";
import { EngineObservabilitySection } from "./EngineObservabilitySection";
import { PriceAlertsParitySection } from "./PriceAlertsParitySection";
import { SystemDetailsSection } from "./SystemDetailsSection";
import { AdminQuickLinks } from "./AdminQuickLinks";

export function AdminDashboard({
  stats,
  leads,
  cronStatus,
  backupStatus,
  priceAlertsParity,
  error,
}: {
  stats: AdminStats | null;
  leads: B2BLead[];
  cronStatus: DailyCronStatus | null;
  backupStatus: BackupStatus | null;
  priceAlertsParity: PriceAlertsParityStatus | null;
  error: string | null;
}) {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <AdminHeader fetchedAt={stats?.fetchedAt ?? null} />

        {error && <AdminErrorBanner message={error} />}

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
