/**
 * Tests for FlightCard seat map integration
 * Coverage: Seat map fetching, UI rendering, error states
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { FlightCard } from "@/components/FlightCard";
import { querySeatAvailability } from "@/lib/seatMapsIntegration";
import type { FlightResult } from "@/lib/engine";

jest.mock("@/lib/redis", () => ({
  safeGet: jest.fn(),
  safeSet: jest.fn(),
}));
jest.mock("@/lib/seatMapsIntegration");
jest.mock("@/components/PortfolioCheck", () => {
  return function MockPortfolioCheck() {
    return <div data-testid="portfolio-check">Portfolio Check</div>;
  };
});

const mockQuerySeatAvailability = querySeatAvailability as jest.MockedFunction<
  typeof querySeatAvailability
>;

const mockFlightResult: FlightResult = {
  from: "LAX",
  to: "JFK",
  price: 450,
  airlines: ["United"],
  stops: 0,
  duration: 300,
  tripType: "oneway",
  cabin: "economy",
  passengers: 1,
  cashCost: 450,
  milesCost: 35000,
  savings: 100,
  recommendation: "USE_MILES",
  bestOption: {
    program: "United MileagePlus",
    type: "DIRECT",
    operatingAirline: "United",
    milesRequired: 35000,
    taxes: 50,
    valuePerMile: 1.4,
    milesCost: 490,
    totalMilesCost: 540,
    savings: -90,
    confidence: "HIGH",
    explanation: "Direct redemption via United MileagePlus",
    chartSource: "REAL",
    isBestDeal: true,
  },
  milesOptions: [],
  explanation: "Miles option saves money",
  displayMessage: "Use miles",
  disclaimer: "Award space is limited",
  cabinPriceEstimated: false,
  searchId: "test-search-id",
  optimization: { type: "DIRECT", program: "United MileagePlus" },
  verdictLabel: "MILES_WINS",
};

describe("FlightCard with seat maps", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render seat map when data is available", async () => {
    mockQuerySeatAvailability.mockResolvedValue({
      aircraft: "B787",
      airline: "UA",
      route: { from: "LAX", to: "JFK" },
      cabin: "economy",
      available: 150,
      occupied: 80,
      blocked: 12,
      total: 242,
      percentAvailable: 62,
      status: "good",
      mapUrl: "https://www.seatguru.com/seat-map",
      updatedAt: Date.now(),
    });

    render(
      <FlightCard flight={mockFlightResult} lang="en" formatPrice={(p) => `$${p}`} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Seat map")).toBeInTheDocument();
    }, { timeout: 10000 });

    // Check seat availability bar
    expect(screen.getByText(/62%/)).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText(/available/)).toBeInTheDocument();
    expect(screen.getByText("80")).toBeInTheDocument();
  });

  it("should render in French when lang is fr", async () => {
    mockQuerySeatAvailability.mockResolvedValue({
      aircraft: "B787",
      airline: "UA",
      route: { from: "LAX", to: "JFK" },
      cabin: "economy",
      available: 150,
      occupied: 80,
      blocked: 12,
      total: 242,
      percentAvailable: 62,
      status: "good",
      mapUrl: "https://www.seatguru.com/seat-map",
      updatedAt: Date.now(),
    });

    render(
      <FlightCard flight={mockFlightResult} lang="fr" formatPrice={(p) => `$${p}`} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Plan de cabine")).toBeInTheDocument();
    });

    expect(screen.getByText(/libres/)).toBeInTheDocument();
    expect(screen.getByText(/occupés/)).toBeInTheDocument();
  });

  it("should handle seat map fetch errors gracefully", async () => {
    mockQuerySeatAvailability.mockRejectedValueOnce(new Error("Fetch error"));

    const { container } = render(
      <FlightCard flight={mockFlightResult} lang="en" formatPrice={(p) => `$${p}`} />,
    );

    // Card should still render without seat map
    expect(container.querySelector(".rounded-2xl")).toBeInTheDocument();

    // No seat map should appear
    expect(screen.queryByText("Seat map")).not.toBeInTheDocument();
  });

  it("should color the availability bar based on status", async () => {
    mockQuerySeatAvailability.mockResolvedValue({
      aircraft: "B787",
      airline: "UA",
      route: { from: "LAX", to: "JFK" },
      cabin: "economy",
      available: 8,
      occupied: 12,
      blocked: 0,
      total: 20,
      percentAvailable: 40,
      status: "warning",
      mapUrl: "https://www.seatguru.com/seat-map",
      updatedAt: Date.now(),
    });

    const { container } = render(
      <FlightCard flight={mockFlightResult} lang="en" formatPrice={(p) => `$${p}`} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Seat map")).toBeInTheDocument();
    }, { timeout: 10000 });

    // Check for warning status styling
    const statusBar = container.querySelector(".bg-warning");
    expect(statusBar).toBeInTheDocument();
  });

  it("should show fallback indicator when data is estimated", async () => {
    mockQuerySeatAvailability.mockResolvedValue({
      aircraft: "B787",
      airline: "UA",
      route: { from: "LAX", to: "JFK" },
      cabin: "economy",
      available: 150,
      occupied: 80,
      blocked: 12,
      total: 242,
      percentAvailable: 62,
      status: "good",
      mapUrl: "https://www.seatguru.com/seat-map",
      updatedAt: Date.now(),
      isFallback: true,
    });

    render(
      <FlightCard flight={mockFlightResult} lang="en" formatPrice={(p) => `$${p}`} />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Estimated data based on averages/)).toBeInTheDocument();
    });
  });

  it("should render seat map link correctly", async () => {
    const mapUrl = "https://www.seatguru.com/seat-map";
    mockQuerySeatAvailability.mockResolvedValue({
      aircraft: "B787",
      airline: "UA",
      route: { from: "LAX", to: "JFK" },
      cabin: "economy",
      available: 150,
      occupied: 80,
      blocked: 12,
      total: 242,
      percentAvailable: 62,
      status: "good",
      mapUrl,
      updatedAt: Date.now(),
    });

    render(
      <FlightCard flight={mockFlightResult} lang="en" formatPrice={(p) => `$${p}`} />,
    );

    await waitFor(() => {
      const link = screen.getByText(/View all seats/);
      expect(link).toHaveAttribute("href", mapUrl);
      expect(link).toHaveAttribute("target", "_blank");
    });
  });

  it("should display blocked seats when present", async () => {
    mockQuerySeatAvailability.mockResolvedValue({
      aircraft: "B787",
      airline: "UA",
      route: { from: "LAX", to: "JFK" },
      cabin: "economy",
      available: 150,
      occupied: 80,
      blocked: 12,
      total: 242,
      percentAvailable: 62,
      status: "good",
      mapUrl: "https://www.seatguru.com/seat-map",
      updatedAt: Date.now(),
    });

    render(
      <FlightCard flight={mockFlightResult} lang="en" formatPrice={(p) => `$${p}`} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Seat map")).toBeInTheDocument();
    }, { timeout: 10000 });

    expect(screen.getByText(/blocked/)).toBeInTheDocument();
  });

  it("should not display blocked seats row when zero", async () => {
    mockQuerySeatAvailability.mockResolvedValue({
      aircraft: "B787",
      airline: "UA",
      route: { from: "LAX", to: "JFK" },
      cabin: "economy",
      available: 150,
      occupied: 92,
      blocked: 0,
      total: 242,
      percentAvailable: 62,
      status: "good",
      mapUrl: "https://www.seatguru.com/seat-map",
      updatedAt: Date.now(),
    });

    render(
      <FlightCard flight={mockFlightResult} lang="en" formatPrice={(p) => `$${p}`} />,
    );

    await waitFor(() => {
      expect(screen.queryByText(/blocked/)).not.toBeInTheDocument();
    });
  });

  it("should handle null seat map gracefully", async () => {
    mockQuerySeatAvailability.mockResolvedValue(null);

    const { container } = render(
      <FlightCard flight={mockFlightResult} lang="en" formatPrice={(p) => `$${p}`} />,
    );

    await waitFor(() => {
      // Card should still render without seat map
      expect(container.querySelector(".rounded-2xl")).toBeInTheDocument();
    });

    // No seat map section should be rendered
    expect(screen.queryByText("Seat map")).not.toBeInTheDocument();
  });

  it("should handle missing airlines gracefully", async () => {
    const flightWithoutAirlines = {
      ...mockFlightResult,
      airlines: [],
    };

    mockQuerySeatAvailability.mockResolvedValue(null);

    const { container } = render(
      <FlightCard flight={flightWithoutAirlines} lang="en" formatPrice={(p) => `$${p}`} />,
    );

    // Should not crash and render card normally
    // Card should have the main container
    expect(container.querySelector(".rounded-2xl")).toBeInTheDocument();
  });

  it("should render seat map thumbnail when available", async () => {
    const thumbnailUrl = "https://www.seatguru.com/thumb.png";
    mockQuerySeatAvailability.mockResolvedValue({
      aircraft: "B787",
      airline: "UA",
      route: { from: "LAX", to: "JFK" },
      cabin: "economy",
      available: 150,
      occupied: 80,
      blocked: 12,
      total: 242,
      percentAvailable: 62,
      status: "good",
      mapUrl: "https://www.seatguru.com/seat-map",
      thumbnailUrl,
      updatedAt: Date.now(),
    });

    render(
      <FlightCard flight={mockFlightResult} lang="en" formatPrice={(p) => `$${p}`} />,
    );

    await waitFor(() => {
      const img = screen.getByAltText(/seat map/);
      expect(img).toHaveAttribute("src", thumbnailUrl);
    });
  });

  it("should handle different cabin types", async () => {
    const businessFlight = {
      ...mockFlightResult,
      cabin: "business" as const,
    };

    mockQuerySeatAvailability.mockResolvedValue({
      aircraft: "B787",
      airline: "UA",
      route: { from: "LAX", to: "JFK" },
      cabin: "business",
      available: 8,
      occupied: 12,
      blocked: 0,
      total: 20,
      percentAvailable: 40,
      status: "warning",
      mapUrl: "https://www.seatguru.com/seat-map",
      updatedAt: Date.now(),
    });

    render(
      <FlightCard flight={businessFlight} lang="en" formatPrice={(p) => `$${p}`} />,
    );

    await waitFor(() => {
      expect(mockQuerySeatAvailability).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        "LAX",
        "JFK",
        "business",
      );
    });
  });

  it("should render critical status correctly", async () => {
    mockQuerySeatAvailability.mockResolvedValue({
      aircraft: "B787",
      airline: "UA",
      route: { from: "LAX", to: "JFK" },
      cabin: "economy",
      available: 10,
      occupied: 220,
      blocked: 12,
      total: 242,
      percentAvailable: 4,
      status: "critical",
      mapUrl: "https://www.seatguru.com/seat-map",
      updatedAt: Date.now(),
    });

    const { container } = render(
      <FlightCard flight={mockFlightResult} lang="en" formatPrice={(p) => `$${p}`} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Seat map")).toBeInTheDocument();
    }, { timeout: 10000 });

    // Check for critical status styling (error color)
    const statusBar = container.querySelector(".bg-error");
    expect(statusBar).toBeInTheDocument();
  });
});
