/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CronStatusSection } from "@/app/admin/components/CronStatusSection";
import type { DailyCronStatus } from "@/lib/cronStatus";

describe("CronStatusSection", () => {
  it("renders cron health, dispatch, and job rows", () => {
    const cronStatus: DailyCronStatus = {
      health: "ok",
      lastRun: {
        runId: "run-123456789",
        status: "completed",
        startedAt: "2026-09-25T10:00:00.000Z",
        jobs: ["/api/cron/miles-prices"],
      },
      jobs: [
        {
          path: "/api/cron/miles-prices",
          state: {
            runId: "run-123456789",
            path: "/api/cron/miles-prices",
            status: "accepted",
            startedAt: "2026-09-25T10:00:00.000Z",
            statusCode: 202,
          },
        },
      ],
    };

    render(<CronStatusSection cronStatus={cronStatus} />);

    expect(screen.getByText("Crons Daily")).toBeInTheDocument();
    expect(screen.getByText("OK")).toBeInTheDocument();
    expect(screen.getByText("run run-1234")).toBeInTheDocument();
    expect(screen.getByText("1 accepté(s)")).toBeInTheDocument();
    expect(screen.getByText("/api/cron/miles-prices")).toBeInTheDocument();
    expect(screen.getByText("accepted")).toBeInTheDocument();
    expect(screen.getByText("202")).toBeInTheDocument();
  });

  it("renders pending jobs without a run", () => {
    render(
      <CronStatusSection
        cronStatus={{
          health: "unknown",
          lastRun: null,
          jobs: [{ path: "/api/cron/prewarm", state: null }],
        }}
      />,
    );

    expect(screen.getByText("Inconnu")).toBeInTheDocument();
    expect(screen.getByText("aucun run enregistré")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
  });
});
