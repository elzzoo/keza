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
import { LoginForm } from "./components/LoginForm";
import { AdminDashboard } from "./components/AdminDashboard";

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
    <AdminDashboard
      stats={stats}
      leads={leads}
      cronStatus={cronStatus}
      backupStatus={backupStatus}
      priceAlertsParity={priceAlertsParity}
      error={error}
    />
  );
}
