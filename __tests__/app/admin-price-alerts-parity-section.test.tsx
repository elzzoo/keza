/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PriceAlertsParitySection } from "@/app/admin/components/PriceAlertsParitySection";
import type { PriceAlertsParityStatus } from "@/app/admin/data";

const syncedStatus: PriceAlertsParityStatus = {
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

describe("PriceAlertsParitySection", () => {
  it("renders synced parity status", () => {
    render(<PriceAlertsParitySection status={syncedStatus} />);

    expect(screen.getByText("Migration alertes Redis/Postgres")).toBeInTheDocument();
    expect(screen.getByText("Lecture active")).toBeInTheDocument();
    expect(screen.getByText("Postgres")).toBeInTheDocument();
    expect(screen.getByText("PRICE_ALERTS_POSTGRES_SYNC=1")).toBeInTheDocument();
    expect(screen.getByText("Parité")).toBeInTheDocument();
    expect(screen.getByText("Redis et Postgres alignés")).toBeInTheDocument();
    expect(screen.getByText("18/18 valides")).toBeInTheDocument();
  });

  it("renders Redis read source while the Postgres flag is disabled", () => {
    render(
      <PriceAlertsParitySection
        status={{
          ...syncedStatus,
          postgresSyncEnabled: false,
          readSource: "redis",
        }}
      />,
    );

    expect(screen.getByText("Redis")).toBeInTheDocument();
    expect(screen.getByText("flag Postgres désactivé")).toBeInTheDocument();
  });

  it("renders mismatch details", () => {
    render(
      <PriceAlertsParitySection
        status={{
          ok: true,
          postgresSyncEnabled: true,
          readSource: "postgres",
          data: {
            ...syncedStatus.data,
            missingInPostgres: ["alert-1"],
            extraInPostgres: ["alert-2"],
            activeMismatch: ["alert-3"],
            inSync: false,
          },
        }}
      />,
    );

    expect(screen.getByText("Écart")).toBeInTheDocument();
    expect(screen.getByText("Écarts de migration à corriger avant bascule de lecture.")).toBeInTheDocument();
    expect(screen.getByText("alert-1")).toBeInTheDocument();
    expect(screen.getByText("alert-2")).toBeInTheDocument();
    expect(screen.getByText("alert-3")).toBeInTheDocument();
  });

  it("renders unavailable status", () => {
    render(<PriceAlertsParitySection status={{ ok: false, error: "DB unavailable" }} />);

    expect(screen.getByText("Statut indisponible.")).toBeInTheDocument();
    expect(screen.getByText("DB unavailable")).toBeInTheDocument();
  });
});
