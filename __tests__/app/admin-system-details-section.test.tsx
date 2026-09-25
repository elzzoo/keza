/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SystemDetailsSection } from "@/app/admin/components/SystemDetailsSection";
import type { AdminStats, BackupStatus } from "@/app/admin/data";

const stats: AdminStats = {
  activeAlerts: 12,
  activeRoutes: 4,
  pushSubscriptions: 3,
  dealsCached: true,
  dealsTtlSeconds: 3600,
  lastCronAt: "2026-09-25T10:00:00.000Z",
  fetchedAt: "2026-09-25T11:00:00.000Z",
  emailOpensByDay: [],
  totalEmailOpens: 0,
  totalConfirmationOpens: 0,
  totalPriceDropOpens: 0,
  totalDigestOpens: 0,
  estimatedRevenue: 72,
  estimatedBookings: 4,
  clicksToday: 5,
  clicksTotal: 120,
  engineStats: [],
};

describe("SystemDetailsSection", () => {
  it("renders system details with backup status", () => {
    const backupStatus: BackupStatus = {
      lastAt: "2026-09-25T09:00:00.000Z",
      counts: { keys: 42 },
      meta: { exportedAt: "2026-09-25T09:00:00.000Z", emailed: true },
    };

    render(<SystemDetailsSection stats={stats} backupStatus={backupStatus} />);

    expect(screen.getByText("Détails système")).toBeInTheDocument();
    expect(screen.getByText("Alertes actives")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Actif (TTL 3600s)")).toBeInTheDocument();
    expect(screen.getByText(/email envoyé/)).toBeInTheDocument();
  });

  it("renders empty backup and cron states", () => {
    render(
      <SystemDetailsSection
        stats={{ ...stats, dealsCached: false, dealsTtlSeconds: 0, lastCronAt: null }}
        backupStatus={null}
      />,
    );

    expect(screen.getAllByText("Jamais exécuté")).toHaveLength(2);
    expect(screen.getByText("Vide")).toBeInTheDocument();
  });
});
