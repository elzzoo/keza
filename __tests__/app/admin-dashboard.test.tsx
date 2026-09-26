/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AdminDashboard } from "@/app/admin/components/AdminDashboard";
import type { DailyCronStatus } from "@/lib/cronStatus";
import type { AdminStats, PriceAlertsParityStatus } from "@/app/admin/data";

const stats: AdminStats = {
  activeAlerts: 12,
  activeRoutes: 2,
  pushSubscriptions: 3,
  dealsCached: true,
  dealsTtlSeconds: 3600,
  lastCronAt: "2026-09-25T10:00:00.000Z",
  fetchedAt: "2026-09-25T11:00:00.000Z",
  emailOpensByDay: [],
  totalEmailOpens: 0,
  totalConfirmationOpens: 1,
  totalPriceDropOpens: 2,
  totalDigestOpens: 3,
  estimatedRevenue: 72,
  estimatedBookings: 4,
  clicksToday: 5,
  clicksTotal: 120,
  engineStats: [
    {
      date: "2026-09-25",
      searches: 10,
      cacheHits: 8,
      cacheMisses: 2,
      duffelWins: 6,
      tpWins: 4,
    },
  ],
};

const cronStatus: DailyCronStatus = {
  health: "ok",
  lastRun: {
    runId: "run-123456789",
    status: "completed",
    startedAt: "2026-09-25T10:00:00.000Z",
    jobs: ["/api/cron/miles-prices"],
  },
  jobs: [{ path: "/api/cron/miles-prices", state: null }],
};

const priceAlertsParity: PriceAlertsParityStatus = {
  ok: true,
  postgresSyncEnabled: true,
  readSource: "postgres",
  data: {
    redis: { scanned: 18, valid: 18, active: 18 },
    postgres: { total: 18, active: 18 },
    missingInPostgres: [],
    extraInPostgres: [],
    activeMismatch: [],
    inSync: true,
  },
};

describe("AdminDashboard", () => {
  it("renders the full admin dashboard when stats are available", () => {
    render(
      <AdminDashboard
        stats={stats}
        leads={[]}
        cronStatus={cronStatus}
        backupStatus={null}
        priceAlertsParity={priceAlertsParity}
        error={null}
      />,
    );

    expect(screen.getByText("Dashboard Admin")).toBeInTheDocument();
    expect(screen.getByText("Migration alertes Redis/Postgres")).toBeInTheDocument();
    expect(screen.getByText("Crons Daily")).toBeInTheDocument();
    expect(screen.getByText("Moteur de recherche — 7 derniers jours")).toBeInTheDocument();
    expect(screen.getByText("Leads B2B Entreprises")).toBeInTheDocument();
  });

  it("renders header and error when stats failed to load", () => {
    render(
      <AdminDashboard
        stats={null}
        leads={[]}
        cronStatus={null}
        backupStatus={null}
        priceAlertsParity={null}
        error="Redis timeout"
      />,
    );

    expect(screen.getByText("Dashboard Admin")).toBeInTheDocument();
    expect(screen.getByText("Redis timeout")).toBeInTheDocument();
    expect(screen.queryByText("Leads B2B Entreprises")).not.toBeInTheDocument();
  });
});
