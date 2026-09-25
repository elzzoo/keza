/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AdminQuickLinks } from "@/app/admin/components/AdminQuickLinks";

describe("AdminQuickLinks", () => {
  it("renders backup, backfill, and status actions", () => {
    render(<AdminQuickLinks pushSubscriptions={0} />);

    expect(screen.getByText("Backup JSON Redis")).toHaveAttribute("href", "/api/admin/export/redis");
    expect(screen.getByRole("button", { name: "Dry-run backfill alertes" })).toHaveAttribute("type", "submit");
    expect(screen.getByText("Statut Redis/Postgres alertes")).toHaveAttribute("href", "/api/admin/backfill/price-alerts");
    expect(screen.queryByText(/Pour envoyer un push test/)).not.toBeInTheDocument();
  });

  it("renders push test guidance when push subscriptions exist", () => {
    render(<AdminQuickLinks pushSubscriptions={3} />);

    expect(screen.getByText(/Pour envoyer un push test/)).toBeInTheDocument();
    expect(screen.getByText("/api/push/test")).toBeInTheDocument();
  });
});
