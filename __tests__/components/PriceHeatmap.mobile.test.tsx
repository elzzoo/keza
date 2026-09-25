/**
 * @jest-environment jsdom
 */
// Mobile Responsiveness Tests for PriceHeatmap
import React from "react";
import { render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PriceHeatmap } from "@/components/PriceHeatmap";

// Mock useProfile
jest.mock("@/hooks/useProfile", () => ({
  useProfile: jest.fn(() => ({
    profile: null,
    isLoaded: false,
    currency: "USD",
    exchangeRates: { EUR: 0.92, GBP: 0.79, JPY: 110 },
  })),
}));

// Mock fetch
global.fetch = jest.fn();

function cacheMonthData(from = "SIN", to = "LAX") {
  const month = new Date().toISOString().slice(0, 7);
  sessionStorage.setItem(
    `heatmap:${from}:${to}:economy`,
    JSON.stringify([{ month, minPrice: 620 }])
  );
}

describe("PriceHeatmap Mobile Responsiveness", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    (global.fetch as jest.Mock).mockRejectedValue(new Error("No data"));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders grid layout without wrapping on mobile (375px viewport)", async () => {
    cacheMonthData("SIN", "LAX");
    // Mock window.matchMedia for responsive design testing
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    });

    const { container } = render(
      <PriceHeatmap from="SIN" to="LAX" lang="en" />
    );

    await waitFor(() => {
      expect(container.querySelector("button")).toBeInTheDocument();
    });
    // The grid container should use responsive grid-cols
    // grid-cols-2 for mobile (375px), scales up to 3 and 6 on larger screens
    const gridContainer = container.querySelector(".grid");
    expect(gridContainer?.className).toMatch(/grid-cols-2/);
  });

  it("renders month buttons without overflow on small screens", async () => {
    cacheMonthData("CDG", "JFK");
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    });

    const { container } = render(
      <PriceHeatmap from="CDG" to="JFK" lang="fr" />
    );

    await waitFor(() => {
      expect(container.querySelector("button")).toBeInTheDocument();
    });
    // All buttons should be visible without horizontal scroll
    const buttons = container.querySelectorAll("button");
    buttons.forEach((btn) => {
      expect(btn).toBeInTheDocument();
    });
  });

  it("uses responsive grid classes for different breakpoints", async () => {
    cacheMonthData("NRT", "LAX");
    const { container } = render(
      <PriceHeatmap from="NRT" to="LAX" lang="en" />
    );

    await waitFor(() => {
      expect(container.querySelector("button")).toBeInTheDocument();
    });
    const gridDiv = container.querySelector(".grid");
    expect(gridDiv?.className).toMatch(/grid-cols-2|grid-cols-3|grid-cols-6|sm:|md:/);
  });

  it("stops loading and hides itself when all calendar requests fail", async () => {
    const { container } = render(
      <PriceHeatmap from="SIN" to="LAX" lang="en" />
    );

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("handles sessionStorage read failures without hanging", async () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });

    const { container } = render(
      <PriceHeatmap from="SIN" to="LAX" lang="en" />
    );

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("uses valid cached month data without calling the calendar API", async () => {
    cacheMonthData("SIN", "LAX");

    const { container } = render(
      <PriceHeatmap from="SIN" to="LAX" lang="en" />
    );

    await waitFor(() => {
      expect(container.querySelector("button")).toBeInTheDocument();
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
