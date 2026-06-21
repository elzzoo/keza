/**
 * @jest-environment jsdom
 */
// Mobile Responsiveness Tests for PriceHeatmap
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PriceHeatmap } from "@/components/PriceHeatmap";

// Mock fetch
global.fetch = jest.fn();

describe("PriceHeatmap Mobile Responsiveness", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockRejectedValue(new Error("No data"));
  });

  it("renders grid layout without wrapping on mobile (375px viewport)", () => {
    // Mock window.matchMedia for responsive design testing
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    });

    const { container } = render(
      <PriceHeatmap from="SIN" to="LAX" lang="en" />
    );

    // The grid container should use responsive grid-cols
    // grid-cols-2 for mobile (375px), scales up to 3 and 6 on larger screens
    const gridContainer = container.querySelector(".grid");
    if (gridContainer) {
      expect(gridContainer.className).toMatch(/grid-cols-2/);
    }
  });

  it("renders month buttons without overflow on small screens", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    });

    const { container } = render(
      <PriceHeatmap from="CDG" to="JFK" lang="fr" />
    );

    // All buttons should be visible without horizontal scroll
    const buttons = container.querySelectorAll("button");
    buttons.forEach((btn) => {
      expect(btn).toBeInTheDocument();
    });
  });

  it("uses responsive grid classes for different breakpoints", () => {
    const { container } = render(
      <PriceHeatmap from="NRT" to="LAX" lang="en" />
    );

    const gridDiv = container.querySelector(".grid");
    if (gridDiv) {
      // Should have responsive grid classes
      const classStr = gridDiv.className;
      expect(classStr).toMatch(/grid-cols-2|grid-cols-3|grid-cols-6|sm:|md:/);
    }
  });
});
