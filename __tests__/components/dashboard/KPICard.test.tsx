/**
 * Component tests for KPICard
 * Tests rendering, formatting, and trend indicators
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { KPICard } from "@/components/dashboard/KPICard";

describe("KPICard Component", () => {
  describe("Rendering", () => {
    it("should render title and value", () => {
      render(
        <KPICard
          title="Total Searches"
          value={1500}
          icon="📊"
        />
      );
      expect(screen.getByText("Total Searches")).toBeInTheDocument();
      expect(screen.getByText("1,500")).toBeInTheDocument();
      expect(screen.getByText("📊")).toBeInTheDocument();
    });

    it("should render without icon when not provided", () => {
      render(
        <KPICard
          title="Total Searches"
          value={1500}
        />
      );
      expect(screen.getByText("Total Searches")).toBeInTheDocument();
      expect(screen.getByText("1,500")).toBeInTheDocument();
    });
  });

  describe("Number formatting", () => {
    it("should format large numbers with commas", () => {
      render(
        <KPICard
          title="Total Visits"
          value={1234567}
          format="number"
        />
      );
      expect(screen.getByText("1,234,567")).toBeInTheDocument();
    });

    it("should format currency correctly", () => {
      render(
        <KPICard
          title="Total Revenue"
          value={15000}
          format="currency"
          unit="USD"
        />
      );
      const text = screen.getByText(/\$15,000/);
      expect(text).toBeInTheDocument();
    });

    it("should format percentage correctly", () => {
      render(
        <KPICard
          title="Conversion Rate"
          value={45.5}
          format="percentage"
        />
      );
      expect(screen.getByText("45.5%")).toBeInTheDocument();
    });

    it("should use default number format when not specified", () => {
      render(
        <KPICard
          title="Total Searches"
          value={1500}
        />
      );
      expect(screen.getByText("1,500")).toBeInTheDocument();
    });
  });

  describe("Trend indicators", () => {
    it("should show positive trend with up arrow", () => {
      render(
        <KPICard
          title="Growth"
          value={1000}
          trend={15}
        />
      );
      expect(screen.getByText(/↑ 15%/)).toBeInTheDocument();
    });

    it("should show negative trend with down arrow", () => {
      render(
        <KPICard
          title="Decline"
          value={1000}
          trend={-20}
        />
      );
      expect(screen.getByText(/↓ 20%/)).toBeInTheDocument();
    });

    it("should not show trend indicator when not provided", () => {
      const { container } = render(
        <KPICard
          title="Metric"
          value={1000}
        />
      );
      expect(container.textContent).not.toMatch(/↑|↓|%/);
    });

    it("should apply green color class to positive trend", () => {
      const { container } = render(
        <KPICard
          title="Growth"
          value={1000}
          trend={15}
        />
      );
      const trendElement = screen.getByText(/↑ 15%/);
      expect(trendElement).toHaveClass("text-green-600");
    });

    it("should apply red color class to negative trend", () => {
      const { container } = render(
        <KPICard
          title="Decline"
          value={1000}
          trend={-20}
        />
      );
      const trendElement = screen.getByText(/↓ 20%/);
      expect(trendElement).toHaveClass("text-red-600");
    });
  });

  describe("Styling", () => {
    it("should have card container with appropriate classes", () => {
      const { container } = render(
        <KPICard
          title="Total Searches"
          value={1500}
        />
      );
      const card = container.firstChild as HTMLDivElement;
      expect(card).toHaveClass("rounded-lg");
      expect(card).toHaveClass("shadow");
      expect(card).toHaveClass("p-6");
    });

    it("should support dark mode", () => {
      const { container } = render(
        <KPICard
          title="Total Searches"
          value={1500}
        />
      );
      const card = container.firstChild as HTMLDivElement;
      expect(card).toHaveClass("bg-white");
      expect(card).toHaveClass("dark:bg-slate-900");
    });
  });

  describe("Unit display", () => {
    it("should display unit with currency format", () => {
      render(
        <KPICard
          title="Revenue"
          value={5000}
          format="currency"
          unit="USD"
        />
      );
      const text = screen.getByText(/\$5,000/);
      expect(text).toBeInTheDocument();
    });

    it("should work with custom unit", () => {
      render(
        <KPICard
          title="Distance"
          value={100}
          format="number"
          unit="km"
        />
      );
      expect(screen.getByText("100")).toBeInTheDocument();
      expect(screen.getByText("km")).toBeInTheDocument();
    });
  });
});
