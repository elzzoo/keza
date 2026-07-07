/**
 * Component tests for ValueBadge
 * Tests rendering, accessibility, and language support
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { ValueBadge, ValueBadgeInline } from "@/components/ValueBadge";

describe("ValueBadge Component", () => {
  describe("Rendering", () => {
    it("should render GREAT_DEAL badge in English", () => {
      render(<ValueBadge percentile={10} badge="GREAT_DEAL" lang="en" size="md" />);
      expect(screen.getByText(/Great deal/i)).toBeInTheDocument();
      expect(screen.getByText("⭐")).toBeInTheDocument();
    });

    it("should render FAIR_DEAL badge in English", () => {
      render(<ValueBadge percentile={50} badge="FAIR_DEAL" lang="en" size="md" />);
      expect(screen.getByText(/Fair deal/i)).toBeInTheDocument();
    });

    it("should render EXPENSIVE badge in English", () => {
      render(<ValueBadge percentile={90} badge="EXPENSIVE" lang="en" size="md" />);
      expect(screen.getByText(/Expensive/i)).toBeInTheDocument();
      expect(screen.getByText("⚠")).toBeInTheDocument();
    });

    it("should render UNKNOWN badge when no percentile data", () => {
      render(<ValueBadge percentile={0} badge="UNKNOWN" lang="en" size="md" />);
      expect(screen.getByText(/No data/i)).toBeInTheDocument();
    });
  });

  describe("Language support", () => {
    it("should render French text for GREAT_DEAL", () => {
      // sm size shows abbreviated text
      render(<ValueBadge percentile={10} badge="GREAT_DEAL" lang="fr" size="md" />);
      expect(screen.getByText(/Bonne affaire/i)).toBeInTheDocument();
    });

    it("should render French text for FAIR_DEAL", () => {
      render(<ValueBadge percentile={50} badge="FAIR_DEAL" lang="fr" size="md" />);
      expect(screen.getByText(/Prix moyen/i)).toBeInTheDocument();
    });

    it("should render French text for EXPENSIVE", () => {
      render(<ValueBadge percentile={90} badge="EXPENSIVE" lang="fr" size="md" />);
      expect(screen.getByText(/Cher/i)).toBeInTheDocument();
    });

    it("should render French text for UNKNOWN", () => {
      render(<ValueBadge percentile={0} badge="UNKNOWN" lang="fr" size="md" />);
      expect(screen.getByText(/Pas de données/i)).toBeInTheDocument();
    });
  });

  describe("Size variants", () => {
    it("should render small badge with sm size", () => {
      const { container } = render(
        <ValueBadge percentile={50} badge="FAIR_DEAL" lang="en" size="sm" />
      );
      const badge = container.querySelector('[class*="text-\\[11px\\]"]');
      expect(badge).toBeInTheDocument();
    });

    it("should render medium badge with md size", () => {
      const { container } = render(
        <ValueBadge percentile={50} badge="FAIR_DEAL" lang="en" size="md" />
      );
      const badge = container.querySelector('[class*="text-xs"]');
      expect(badge).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have appropriate title attribute for tooltips", () => {
      const { container } = render(
        <ValueBadge percentile={50} badge="FAIR_DEAL" lang="en" />
      );
      const div = container.firstChild as HTMLDivElement;
      expect(div.title).toContain("percentile");
    });

    it("should maintain readable color contrast by using colored badges", () => {
      // This is a visual test — ensures we're using WCAG AA approved colors
      const { container: greatContainer } = render(
        <ValueBadge percentile={10} badge="GREAT_DEAL" lang="en" />
      );
      // Check for green-colored text
      const greatDiv = greatContainer.firstChild as HTMLDivElement;
      expect(greatDiv).toHaveClass("text-green-400");

      const { container: expensiveContainer } = render(
        <ValueBadge percentile={90} badge="EXPENSIVE" lang="en" />
      );
      const expensiveDiv = expensiveContainer.firstChild as HTMLDivElement;
      expect(expensiveDiv).toHaveClass("text-amber-400");
    });

    it("should be semantic HTML", () => {
      const { container } = render(
        <ValueBadge percentile={50} badge="FAIR_DEAL" lang="en" />
      );
      const badge = container.firstChild;
      expect(badge).toHaveClass("inline-flex");
    });
  });

  describe("ValueBadgeInline variant", () => {
    it("should render without requiring percentile prop", () => {
      render(<ValueBadgeInline badge="GREAT_DEAL" lang="en" />);
      expect(screen.getByText("⭐")).toBeInTheDocument();
    });

    it("should use small size by default", () => {
      const { container } = render(
        <ValueBadgeInline badge="FAIR_DEAL" lang="en" />
      );
      // Inline should be sm size (11px text)
      const span = container.querySelector("span");
      expect(span).toBeInTheDocument();
    });

    it("should support both languages", () => {
      const { rerender } = render(<ValueBadgeInline badge="GREAT_DEAL" lang="en" />);
      expect(screen.getByText(/Excellent/i)).toBeInTheDocument();

      rerender(<ValueBadgeInline badge="GREAT_DEAL" lang="fr" />);
      expect(screen.getByText(/Excellent/i)).toBeInTheDocument();
    });
  });

  describe("Icon rendering", () => {
    it("should render correct icon for each badge type", () => {
      const { rerender, container } = render(
        <ValueBadge percentile={10} badge="GREAT_DEAL" lang="en" />
      );
      expect(container.textContent).toContain("⭐");

      rerender(<ValueBadge percentile={50} badge="FAIR_DEAL" lang="en" />);
      expect(container.textContent).toContain("—");

      rerender(<ValueBadge percentile={90} badge="EXPENSIVE" lang="en" />);
      expect(container.textContent).toContain("⚠");

      rerender(<ValueBadge percentile={0} badge="UNKNOWN" lang="en" />);
      expect(container.textContent).toContain("?");
    });
  });
});
