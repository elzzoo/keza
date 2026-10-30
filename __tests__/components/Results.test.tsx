/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getFlightResultKey, Results } from "@/components/Results";
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
  FlightFilters: ({
    onStopFilter,
    onSortBy,
  }: {
    onStopFilter: (value: "all" | "direct" | "stops") => void;
    onSortBy: (value: "value" | "price") => void;
  }) => (
    <div data-testid="flight-filters">
      <button type="button" onClick={() => onStopFilter("direct")}>Direct</button>
      <button type="button" onClick={() => onStopFilter("stops")}>With stops</button>
      <button type="button" onClick={() => onSortBy("price")}>Price</button>
    </div>
  ),
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
  it("builds distinct stable keys for same-route flight results", () => {
    const base = makeFlight({
      from: "CDG",
      to: "JFK",
      searchId: "same-search",
      source: "TP",
      airlines: ["Air France"],
      stops: 0,
      duration: 480,
      totalPrice: 800,
    });
    const sameRouteDifferentCarrier = makeFlight({
      ...base,
      source: "DUFFEL",
      airlines: ["Delta Air Lines"],
      totalPrice: 820,
    });

    expect(getFlightResultKey(base)).not.toBe(getFlightResultKey(sameRouteDifferentCarrier));
    expect(getFlightResultKey(base)).toBe(getFlightResultKey({ ...base }));
  });

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

  it("shows fares before recommendations, portfolio and alert actions", () => {
    render(<Results
      results={[makeFlight({ source: "DUFFEL", priceConfidence: "HIGH" })]}
      loading={false}
      lang="en"
      onBack={noop}
      searchMeta={{ from: "CDG", to: "JFK", cabin: "economy" }}
    />);

    const card = screen.getByTestId("flight-card");
    for (const id of ["card-recommendation", "portfolio-check", "price-alert-form"]) {
      expect(card.compareDocumentPosition(screen.getByTestId(id)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
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

  it("explains how visible results are sorted", () => {
    const flights = [
      makeFlight({ searchId: "s1", totalPrice: 900 }),
      makeFlight({ searchId: "s2", totalPrice: 700 }),
    ];
    render(
      <Results results={flights} loading={false} lang="en" onBack={noop} />
    );

    expect(screen.getByText(/2 of 2 results shown · sorted by best value/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Price"));

    expect(screen.getByText(/2 of 2 results shown · sorted by lowest price/i)).toBeInTheDocument();
  });

  it("shows a contextual empty state when filters hide existing results", () => {
    const flights = [
      makeFlight({ searchId: "s1", stops: 1 }),
      makeFlight({ searchId: "s2", stops: 2 }),
    ];
    render(
      <Results results={flights} loading={false} lang="en" onBack={noop} />
    );

    fireEvent.click(screen.getByText("Direct"));

    expect(screen.getByText(/No nonstop flights in these results/i)).toBeInTheDocument();
    expect(screen.getByText(/No nonstop schedule was confirmed/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Reset filters/i));

    expect(screen.getAllByTestId("flight-card")).toHaveLength(2);
  });

  it("excludes unverified supplemental entries from the direct filter", () => {
    render(<Results results={[
      makeFlight({ searchId: "real", source: "DUFFEL", stops: 0 }),
      makeFlight({ searchId: "supplemental", source: "SYNTHETIC", stops: 0, isSupplemental: true }),
    ]} loading={false} lang="en" onBack={noop} />);

    expect(screen.getAllByTestId("flight-card")).toHaveLength(2);
    fireEvent.click(screen.getByText("Direct"));
    expect(screen.getAllByTestId("flight-card")).toHaveLength(1);
  });

  it("keeps synthetic estimates out of fare and savings summaries", () => {
    render(<Results results={[
      makeFlight({ searchId: "real", source: "DUFFEL", totalPrice: 800, savings: 200 }),
      makeFlight({ searchId: "synthetic", from: "LHR", to: "LAX", source: "SYNTHETIC", isSupplemental: true, totalPrice: 100, savings: 700 }),
    ]} loading={false} lang="en" onBack={noop} formatPrice={(usd) => `$${usd}`} />);

    expect(screen.getByText("1 fare found · 1 indicative itinerary")).toBeInTheDocument();
    expect(screen.getByText("Best price").parentElement).toHaveTextContent("$800");
    expect(screen.getByText("Max savings").parentElement).toHaveTextContent("$200");
    expect(screen.queryByText("$100")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("flight-card")[0]).toHaveTextContent("CDG → JFK");
    fireEvent.click(screen.getByText("Price"));
    expect(screen.getAllByTestId("flight-card")[0]).toHaveTextContent("CDG → JFK");
  });

  it("does not offer a price alert or a recommendation from synthetic results alone", () => {
    render(<Results
      results={[makeFlight({ source: "SYNTHETIC", isSupplemental: true, totalPrice: 100, savings: 700 })]}
      loading={false}
      lang="en"
      onBack={noop}
      searchMeta={{ from: "CDG", to: "JFK", cabin: "economy" }}
      formatPrice={(usd) => `$${usd}`}
    />);

    expect(screen.getByText("0 fares found · 1 indicative itinerary")).toBeInTheDocument();
    expect(screen.getByText("Best price").parentElement).toHaveTextContent("—");
    expect(screen.getByText("Max savings").parentElement).toHaveTextContent("—");
    expect(screen.queryByTestId("price-alert-form")).not.toBeInTheDocument();
    expect(screen.queryByTestId("card-recommendation")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Direct"));
    expect(screen.queryByTestId("flight-card")).not.toBeInTheDocument();
  });

  it("keeps synthetic multi-leg estimates out of sourced summaries and stop filters", () => {
    render(<Results results={[
      makeFlight({ searchId: "real", source: "DUFFEL", stops: 0, totalPrice: 800, savings: 200 }),
      makeFlight({ searchId: "multi-leg", from: "LHR", to: "LAX", source: "SYNTHETIC", priceConfidence: "ESTIMATED", stops: 1, totalPrice: 100, savings: 700 }),
    ]} loading={false} lang="en" onBack={noop} formatPrice={(usd) => `$${usd}`} />);

    expect(screen.getByText("1 fare found · 1 indicative itinerary")).toBeInTheDocument();
    expect(screen.getByText("Best price").parentElement).toHaveTextContent("$800");
    expect(screen.getByText("Max savings").parentElement).toHaveTextContent("$200");
    expect(screen.getAllByTestId("flight-card")[0]).toHaveTextContent("CDG → JFK");
    fireEvent.click(screen.getByText("Price"));
    expect(screen.getAllByTestId("flight-card")[0]).toHaveTextContent("CDG → JFK");
    fireEvent.click(screen.getByText("With stops"));
    expect(screen.queryByTestId("flight-card")).not.toBeInTheDocument();
  });

  it("does not create price alerts or recommendations from a synthetic multi-leg result alone", () => {
    render(<Results
      results={[makeFlight({ source: "SYNTHETIC", priceConfidence: "ESTIMATED", stops: 1, totalPrice: 100, savings: 700 })]}
      loading={false}
      lang="en"
      onBack={noop}
      searchMeta={{ from: "CDG", to: "JFK", cabin: "economy" }}
      formatPrice={(usd) => `$${usd}`}
    />);

    expect(screen.getByText("0 fares found · 1 indicative itinerary")).toBeInTheDocument();
    expect(screen.getByText("Best price").parentElement).toHaveTextContent("—");
    expect(screen.getByText("Max savings").parentElement).toHaveTextContent("—");
    expect(screen.queryByTestId("price-alert-form")).not.toBeInTheDocument();
    expect(screen.queryByTestId("card-recommendation")).not.toBeInTheDocument();
    expect(screen.queryByTestId("portfolio-check")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Use miles/ }));
    expect(screen.queryByTestId("flight-card")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /All/ }));
    fireEvent.click(screen.getByText("With stops"));
    expect(screen.queryByTestId("flight-card")).not.toBeInTheDocument();
  });

  it("distinguishes indicative itineraries from supplier fares in French", () => {
    render(<Results
      results={[makeFlight({ source: "SYNTHETIC", priceConfidence: "ESTIMATED", stops: 1 })]}
      loading={false}
      lang="fr"
      onBack={noop}
    />);

    expect(screen.getByText("0 tarifs trouvés · 1 itinéraire indicatif")).toBeInTheDocument();
    expect(screen.getByText("tarifs trouvés")).toBeInTheDocument();
    expect(screen.getByText("Meilleur prix").parentElement).toHaveTextContent("—");
  });

  it("summarizes price confidence by source", () => {
    const flights = [
      makeFlight({ searchId: "s1", source: "DUFFEL", priceConfidence: "HIGH" }),
      makeFlight({ searchId: "s2", source: "TP", priceConfidence: "LOW" }),
      makeFlight({
        searchId: "s3",
        source: "SYNTHETIC",
        priceConfidence: "ESTIMATED",
        isSupplemental: true,
      }),
    ];
    render(
      <Results results={flights} loading={false} lang="en" onBack={noop} />
    );

    expect(screen.getByText("Price confidence")).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getByText("Cache")).toBeInTheDocument();
    expect(screen.getByText("Estimated")).toBeInTheDocument();
    expect(screen.getByText(/Live prices are available for part/i)).toBeInTheDocument();
    expect(screen.queryByText("(indicative)")).not.toBeInTheDocument();
  });

  it("does not claim a live fare when the source is missing or unverified", () => {
    render(
      <Results
        results={[makeFlight({ priceConfidence: "HIGH" })]}
        loading={false}
        lang="en"
        onBack={noop}
      />
    );

    expect(screen.getByText("Unverified")).toBeInTheDocument();
    expect(screen.getByText(/Price source is unverified/i)).toBeInTheDocument();
    expect(screen.queryByText("Live")).not.toBeInTheDocument();
    expect(screen.getByText("(indicative)")).toBeInTheDocument();
  });

  it("keeps estimated cabin prices out of the live category", () => {
    render(
      <Results
        results={[makeFlight({ source: "DUFFEL", priceConfidence: "HIGH", cabinPriceEstimated: true })]}
        loading={false}
        lang="fr"
        onBack={noop}
      />
    );

    expect(screen.getByText("Estimé")).toBeInTheDocument();
    expect(screen.getByText(/Prix indicatifs/i)).toBeInTheDocument();
    expect(screen.queryByText("Live")).not.toBeInTheDocument();
    expect(screen.getByText("(indicatif)")).toBeInTheDocument();
  });

  it("does not relabel provider-cache prices as live when confidence conflicts", () => {
    render(
      <Results
        results={[makeFlight({ source: "TP", priceConfidence: "HIGH" })]}
        loading={false}
        lang="en"
        onBack={noop}
      />
    );

    expect(screen.getByText("Cache")).toBeInTheDocument();
    expect(screen.getByText(/Prices come from provider cache/i)).toBeInTheDocument();
    expect(screen.queryByText("Live")).not.toBeInTheDocument();
  });

  it("distinguishes mixed live and unverified results", () => {
    render(
      <Results
        results={[
          makeFlight({ searchId: "live", source: "AMADEUS", priceConfidence: "HIGH" }),
          makeFlight({ searchId: "unknown", source: "DUFFEL", priceConfidence: "LOW" }),
        ]}
        loading={false}
        lang="en"
        onBack={noop}
      />
    );

    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getByText("Unverified")).toBeInTheDocument();
    expect(screen.getByText(/Live prices are available for part/i)).toBeInTheDocument();
  });

  it("shows loading text in French when lang=fr", () => {
    render(
      <Results results={[]} loading={true} lang="fr" onBack={noop} />
    );
    expect(screen.getByText(/Connexion aux sources de prix/i)).toBeInTheDocument();
  });
});
