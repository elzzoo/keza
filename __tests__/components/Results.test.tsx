/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Results } from "@/components/Results";
import type { FlightResult } from "@/lib/engine";

// Mock useProfile
jest.mock("@/hooks/useProfile", () => ({
  useProfile: jest.fn(() => ({
    profile: null,
    isLoaded: false,
    currency: "USD",
    exchangeRates: { EUR: 0.92, GBP: 0.79, JPY: 110 },
  })),
}));

// Mock heavy sub-components to keep tests focused
jest.mock("@/components/FlightCard", () => ({
  FlightCard: ({ flight }: { flight: { from: string; to: string } }) => (
    <div data-testid="flight-card">{flight.from} → {flight.to}</div>
  ),
}));

jest.mock("@/components/CardRecommendation", () => ({
  CardRecommendation: () => <div data-testid="card-recommendation" />,
}));

jest.mock("@/components/FlightFilters", () => ({
  FlightFilters: () => <div data-testid="flight-filters" />,
}));

jest.mock("@/components/PriceAlertForm", () => ({
  PriceAlertForm: () => <div data-testid="price-alert-form" />,
}));

jest.mock("@/components/PortfolioCheck", () => ({
  __esModule: true,
  default: () => <div data-testid="portfolio-check" />,
}));

jest.mock("@/lib/businessMode", () => ({
  isBusinessMode: jest.fn(() => false),
}));

// Minimal valid FlightResult factory
const makeFlight = (overrides: Partial<FlightResult> = {}): FlightResult => ({
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
  bestOption: null,
  milesOptions: [],
  explanation: "Miles cheaper",
  displayMessage: "Use miles",
  disclaimer: "",
  cabinPriceEstimated: false,
  searchId: "search-001",
  optimization: { type: "CASH" },
  totalPrice: 800,
  ...overrides,
});

const noop = () => {};

describe("Results", () => {
  it("shows loading spinner when loading=true", () => {
    render(
      <Results results={[]} loading={true} lang="en" onBack={noop} />
    );
    // Animated loader shows first step message
    expect(screen.getByText(/Connecting to live pricing sources/i)).toBeInTheDocument();
  });

  it("shows skeleton cards when loading=true", () => {
    const { container } = render(
      <Results results={[]} loading={true} lang="en" onBack={noop} />
    );
    // Skeleton divs have class 'skeleton'
    const skeletons = container.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows empty state message when results is empty and not loading", () => {
    render(
      <Results results={[]} loading={false} lang="en" onBack={noop} />
    );
    expect(screen.getByText(/Data unavailable/i)).toBeInTheDocument();
  });

  it("renders correct number of FlightCard items", () => {
    const flights = [
      makeFlight({ from: "CDG", to: "JFK", searchId: "s1" }),
      makeFlight({ from: "LHR", to: "LAX", searchId: "s2" }),
      makeFlight({ from: "DXB", to: "NRT", searchId: "s3", recommendation: "USE_CASH" }),
    ];
    render(
      <Results results={flights} loading={false} lang="en" onBack={noop} />
    );
    const cards = screen.getAllByTestId("flight-card");
    expect(cards).toHaveLength(3);
  });

  it("shows back button", () => {
    render(
      <Results results={[]} loading={false} lang="en" onBack={noop} />
    );
    expect(screen.getByText(/New search/i)).toBeInTheDocument();
  });

  it("calls onBack when back button is clicked", () => {
    const onBack = jest.fn();
    render(
      <Results results={[]} loading={false} lang="en" onBack={onBack} />
    );
    fireEvent.click(screen.getByText(/New search/i));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("tab switching filters to USE_MILES only", () => {
    const flights = [
      makeFlight({ from: "CDG", to: "JFK", searchId: "s1", recommendation: "USE_MILES" }),
      makeFlight({ from: "LHR", to: "LAX", searchId: "s2", recommendation: "USE_CASH" }),
    ];
    render(
      <Results results={flights} loading={false} lang="en" onBack={noop} />
    );
    // Click "Use miles" tab
    fireEvent.click(screen.getByRole("tab", { name: /Use miles/i }));
    const cards = screen.getAllByTestId("flight-card");
    // Only the USE_MILES flight should show
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent("CDG → JFK");
  });

  it("shows flights found count", () => {
    const flights = [makeFlight(), makeFlight({ searchId: "s2" })];
    render(
      <Results results={flights} loading={false} lang="en" onBack={noop} />
    );
    expect(screen.getByText(/2 flights found/i)).toBeInTheDocument();
  });

  it("shows loading text in French when lang=fr", () => {
    render(
      <Results results={[]} loading={true} lang="fr" onBack={noop} />
    );
    expect(screen.getByText(/Connexion aux sources de prix/i)).toBeInTheDocument();
  });
});
