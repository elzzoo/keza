/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AdminHeader } from "@/app/admin/components/AdminHeader";

describe("AdminHeader", () => {
  it("renders dashboard title, fetched date, and logout action", () => {
    render(<AdminHeader fetchedAt="2026-09-25T11:21:12.706Z" />);

    expect(screen.getByRole("heading", { name: "Dashboard Admin" })).toBeInTheDocument();
    expect(screen.getByText(/Données en temps réel/)).toBeInTheDocument();
    expect(screen.getByText("Xalifly")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Déconnexion" })).toHaveAttribute("type", "submit");
  });

  it("renders a placeholder when stats are unavailable", () => {
    render(<AdminHeader fetchedAt={null} />);

    expect(screen.getByText("Données en temps réel · —")).toBeInTheDocument();
  });
});
