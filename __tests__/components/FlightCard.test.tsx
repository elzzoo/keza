/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { FlightCard } from "@/components/FlightCard";
import type { FlightResult } from "@/lib/engine";

// Mock external dependencies
jest.mock("@/hooks/useProfile", () => ({
  useProfile: jest.fn(() => ({ profile: null, isLoaded: false })),
}));

jest.mock("@/lib/analytics", () => ({
  trackBookClick: jest.fn(),
}));

jest.mock("@/lib/abtest", () => ({
  getOrAssignVariant: jest.fn(() => "A"),
  CTA_COPY: {
    A: { fr: "Voir les vols", en: "View flights" },
    B: { fr: "Réserver", en: "Book now" },
  },
}));

jest.mock("@/lib/businessMode", () => ({
  isBusinessMode: jest.fn(() => false),
  buildBusinessChips: jest.fn(() => []),
}));

// Shared mock data factory
const bestOption = {
  type: "DIRECT" as const,
  program: "Flying Blue",
  operatingAirline: "Air France",
  milesRequired: 30000,
  taxes: 150,
  valuePerMile: 1.5,
  milesCost: 450,
  totalMilesCost: 600,
  savings: 400,
  confidence: "HIGH" as const,
  explanation: "Flying Blue direct · 30 000 miles + $150 taxes",
  isBestDeal: true,
  chartSource: "REAL" as const,
};

const baseFlight: FlightResult = {
  from: "CDG",
  to: "JFK",
  price: 800,
  airlines: ["Air France"],
  stops: 0,
  duration: 480,
  tripType: "oneway",
  cabin: "economy",
  passengers: 1,
  cashCost: 800,
  milesCost: 600,
  savings: 200,
  recommendation: "USE_MILES",
  bestOption,
  milesOptions: [bestOption],
  explanation: "Miles cheaper",
  displayMessage: "Use miles",
  disclaimer: "",
  cabinPriceEstimated: false,
  searchId: "test-search-id-001",
  optimization: { type: "DIRECT", program: "Flying Blue" },
  totalPrice: 800,
  priceConfidence: "HIGH",
};

describe("FlightCard", () => {
  it("renders airline name", () => {
    render(<FlightCard flight={baseFlight} lang="en" />);
    // Airline rendered in the chips area
    expect(screen.getByText("Air France")).toBeInTheDocument();
  });

  it("renders cash cost price", () => {
    render(<FlightCard flight={baseFlight} lang="en" />);
    // $800 cash cost should appear
    expect(screen.getByText("$800")).toBeInTheDocument();
  });

  it("renders USE_MILES recommendation — shows savings message", () => {
    render(<FlightCard flight={baseFlight} lang="en" />);
    // The banner should mention savings with miles
    expect(screen.getByText(/You save/i)).toBeInTheDocument();
  });

  it("renders USE_CASH recommendation banner", () => {
    // savings < 0 means cash is cheaper (cashCost - milesCost < 0 → cash costs less)
    const cashFlight: FlightResult = {
      ...baseFlight,
      recommendation: "USE_CASH",
      savings: -200, // cash saves $200 over miles — correctly represents USE_CASH
    };
    render(<FlightCard flight={cashFlight} lang="en" />);
    expect(screen.getByText(/Pay cash/i)).toBeInTheDocument();
  });

  it("shows estimated price notice when source is SYNTHETIC", () => {
    const estimatedFlight: FlightResult = {
      ...baseFlight,
      source: "SYNTHETIC",
      isSupplemental: false,
    };
    render(<FlightCard flight={estimatedFlight} lang="en" />);
    expect(screen.getByText(/Estimated price/i)).toBeInTheDocument();
  });

  it("renders economy cabin label (Cash label)", () => {
    render(<FlightCard flight={baseFlight} lang="en" />);
    // The cash column label
    expect(screen.getByText("Cash")).toBeInTheDocument();
  });

  it("renders Miles column label", () => {
    render(<FlightCard flight={baseFlight} lang="en" />);
    expect(screen.getByText("Miles")).toBeInTheDocument();
  });

  it("renders program name from bestOption", () => {
    render(<FlightCard flight={baseFlight} lang="en" />);
    expect(screen.getByText("Flying Blue")).toBeInTheDocument();
  });

  it("renders in French when lang=fr", () => {
    render(<FlightCard flight={baseFlight} lang="fr" />);
    expect(screen.getByText(/Tu économises/i)).toBeInTheDocument();
  });

  it("displays 'Estimate' badge when bestOption.confidence is LOW", () => {
    const lowConfidenceFlight: FlightResult = {
      ...baseFlight,
      bestOption: {
        ...bestOption,
        confidence: "LOW",
      },
    };
    render(<FlightCard flight={lowConfidenceFlight} lang="en" />);
    expect(screen.getByText("Estimate")).toBeInTheDocument();
  });

  it("displays 'Estimation' badge when bestOption.confidence is LOW (French)", () => {
    const lowConfidenceFlight: FlightResult = {
      ...baseFlight,
      bestOption: {
        ...bestOption,
        confidence: "LOW",
      },
    };
    render(<FlightCard flight={lowConfidenceFlight} lang="fr" />);
    expect(screen.getByText("Estimation")).toBeInTheDocument();
  });

  it("displays 'Award availability not verified' disclaimer when recommendation is USE_MILES", () => {
    const useAwardsFlight: FlightResult = {
      ...baseFlight,
      recommendation: "USE_MILES",
    };
    render(<FlightCard flight={useAwardsFlight} lang="en" />);
    expect(screen.getByText(/Award availability not verified in real-time/i)).toBeInTheDocument();
  });

  it("displays 'Disponibilité awards non vérifiée' disclaimer when recommendation is USE_MILES (French)", () => {
    const useAwardsFlight: FlightResult = {
      ...baseFlight,
      recommendation: "USE_MILES",
    };
    render(<FlightCard flight={useAwardsFlight} lang="fr" />);
    expect(screen.getByText(/Disponibilité awards non vérifiée/i)).toBeInTheDocument();
  });
});
