/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { B2BLeadsTable } from "@/app/admin/components/B2BLeadsTable";

describe("B2BLeadsTable", () => {
  it("renders an empty state", () => {
    render(<B2BLeadsTable leads={[]} />);

    expect(screen.getByText("Leads B2B Entreprises")).toBeInTheDocument();
    expect(screen.getByText("0 leads")).toBeInTheDocument();
    expect(screen.getByText(/Aucun lead/i)).toBeInTheDocument();
  });

  it("renders leads and export action", () => {
    render(
      <B2BLeadsTable
        leads={[
          {
            name: "Ada",
            company: "Acme",
            email: "ada@example.com",
            teamSize: "10",
            message: "Need team travel visibility",
            receivedAt: "2026-09-25T08:00:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getByText("1 lead")).toBeInTheDocument();
    expect(screen.getByText("Exporter CSV")).toHaveAttribute("href", "/api/admin/export/leads");
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toHaveAttribute("href", "mailto:ada@example.com");
    expect(screen.getByText("Need team travel visibility")).toBeInTheDocument();
  });
});
