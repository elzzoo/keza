/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AdminOverviewSection } from "@/app/admin/components/AdminOverviewSection";
import type { AdminStats, BackupStatus } from "@/app/admin/data";

const stats: AdminStats = {
  activeAlerts: 12,
  activeRoutes: 2,
  pushSubscriptions: 3,
  dealsCached: true,
  dealsTtlSeconds: 3660,
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

describe("AdminOverviewSection", () => {
  it("renders overview and backup cards", () => {
    const backupStatus: BackupStatus = {
      lastAt: "2026-09-25T09:00:00.000Z",
      counts: null,
      meta: { exportedAt: "2026-09-25T09:00:00.000Z", emailed: true },
    };

    render(<AdminOverviewSection stats={stats} backupStatus={backupStatus} />);

    expect(screen.getByText("Alertes actives")).toBeInTheDocument();
    expect(screen.getByText("2 routes")).toBeInTheDocument();
    expect(screen.getByText("Push legacy")).toBeInTheDocument();
    expect(screen.getByText("Deals en cache")).toBeInTheDocument();
    expect(screen.getByText("Backup Redis")).toBeInTheDocument();
    expect(screen.getByText("Envoyé")).toBeInTheDocument();
  });

  it("renders inactive deal cache state", () => {
    render(
      <AdminOverviewSection
        stats={{ ...stats, dealsCached: false, dealsTtlSeconds: 0, lastCronAt: null }}
        backupStatus={null}
      />,
    );

    expect(screen.getByText("aucun cache")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Backup Redis")).not.toBeInTheDocument();
  });
});
