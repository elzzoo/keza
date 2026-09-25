/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { StatCard } from "@/app/admin/components/StatCard";

describe("StatCard", () => {
  it("renders label, value, subtitle, and color classes", () => {
    render(<StatCard label="Alertes" value={12} sub="3 routes" color="green" />);

    expect(screen.getByText("Alertes")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("3 routes")).toBeInTheDocument();
    expect(screen.getByText("Alertes").closest("div")).toHaveClass("bg-green-50");
  });
});
