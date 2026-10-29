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
  useProfile: jest.fn(() => ({
    profile: null,
    isLoaded: false,
    currency: "USD",
    exchangeRates: { EUR: 0.92, GBP: 0.79, JPY: 110 },
  })),
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
  it.each(["en", "fr"] as const)("does not display unverifiable seat counts in %s", (lang) => {
    render(<FlightCard flight={baseFlight} lang={lang} />);
    expect(screen.queryByText(lang === "fr" ? "Plan de cabine" : "Seat map")).not.toBeInTheDocument();
    expect(screen.queryByText(lang === "fr" ? /places/ : /seats/)).not.toBeInTheDocument();
  });

  it("renders airline name", () => {
    render(<FlightCard flight={baseFlight} lang="en" />);
    // Airline rendered in the chips area
    expect(screen.getByText("Air France")).toBeInTheDocument();
  });

  it("renders cash cost price", () => {
    render(<FlightCard flight={baseFlight} lang="en" />);
    // $800 cash cost should appear (may be formatted as $800.00)
    expect(screen.getByText(/\$800/)).toBeInTheDocument();
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

  it("marks a SYNTHETIC itinerary as unconfirmed even without isSupplemental", () => {
    const estimatedFlight: FlightResult = {
      ...baseFlight,
      source: "SYNTHETIC",
      isSupplemental: false,
    };
    render(<FlightCard flight={estimatedFlight} lang="en" />);
    expect(screen.getByText(/Estimated itinerary, flight unconfirmed/i)).toBeInTheDocument();
  });

  it.each([
    { lang: "en", routeLabel: "Airline listed for this route", cta: "Search flights", unverified: "Fare and savings unverified" },
    { lang: "fr", routeLabel: "Compagnie répertoriée sur cette liaison", cta: "Rechercher des vols", unverified: "Tarif et économies non vérifiés" },
  ] as const)("does not present a supplemental entry as a verified flight in $lang", ({ lang, routeLabel, cta, unverified }) => {
    render(<FlightCard flight={{
      ...baseFlight,
      source: "SYNTHETIC",
      priceConfidence: "ESTIMATED",
      isSupplemental: true,
      bestOption: { ...bestOption, chartSource: "ESTIMATE" },
      bookingLink: "https://www.aviasales.com/search/CDGJFK",
      verdictLabel: "MILES_WINS",
    }} lang={lang} />);

    expect(screen.getByText(routeLabel)).toBeInTheDocument();
    expect(screen.getByText(unverified)).toBeInTheDocument();
    expect(screen.getByText(lang === "fr" ? "Horaires à vérifier" : "Schedule unverified")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: cta })).toHaveAttribute("href", "https://www.aviasales.com/search/CDGJFK");
    expect(screen.queryByText(lang === "fr" ? "Direct" : "Nonstop")).not.toBeInTheDocument();
    expect(screen.queryByText(lang === "fr" ? /Tu économises/ : /You save/)).not.toBeInTheDocument();
    expect(screen.queryByText(lang === "fr" ? "Miles gagnent" : "Miles win")).not.toBeInTheDocument();
    expect(screen.queryByText(lang === "fr" ? "Prix confirmé" : "Confirmed price")).not.toBeInTheDocument();
    expect(screen.queryByText(lang === "fr" ? "Voir sur le site de la compagnie" : "Check airline website")).not.toBeInTheDocument();
  });

  it.each([
    { lang: "en", routeLabel: "Estimated itinerary, flight unconfirmed", cta: "Search flights", unverified: "Fare and savings unverified" },
    { lang: "fr", routeLabel: "Itinéraire estimé, vol non confirmé", cta: "Rechercher des vols", unverified: "Tarif et économies non vérifiés" },
  ] as const)("does not present a synthetic multi-leg estimate as a verified flight in $lang", ({ lang, routeLabel, cta, unverified }) => {
    render(<FlightCard flight={{
      ...baseFlight,
      source: "SYNTHETIC",
      priceConfidence: "ESTIMATED",
      stops: 1,
      duration: 720,
      bookingLink: "https://www.aviasales.com/search/CDGJFK",
      verdictLabel: "MILES_WINS",
    }} lang={lang} isGlobalBest />);

    expect(screen.getByText(routeLabel)).toBeInTheDocument();
    expect(screen.getByText(unverified)).toBeInTheDocument();
    expect(screen.getByText(lang === "fr" ? "Horaires à vérifier" : "Schedule unverified")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: cta })).toHaveAttribute("href", "https://www.aviasales.com/search/CDGJFK");
    expect(screen.queryByText(lang === "fr" ? /Tu économises/ : /You save/)).not.toBeInTheDocument();
    expect(screen.queryByText(lang === "fr" ? "Meilleure offre" : "Best deal")).not.toBeInTheDocument();
    expect(screen.queryByText(lang === "fr" ? "Miles gagnent" : "Miles win")).not.toBeInTheDocument();
    expect(screen.queryByText(lang === "fr" ? "Voir sur le site de la compagnie" : "Check airline website")).not.toBeInTheDocument();
    expect(screen.queryByText(lang === "fr" ? "1 escale" : "1 stop")).not.toBeInTheDocument();
  });

  it("uses a route-search label when an estimated itinerary has no booking link", () => {
    render(<FlightCard flight={{
      ...baseFlight,
      source: "SYNTHETIC",
      priceConfidence: "ESTIMATED",
      bestOption: null,
      recommendation: "USE_CASH",
      bookingLink: undefined,
    }} lang="en" />);

    expect(screen.getByRole("link", { name: /Search flights on Google Flights/i })).toBeInTheDocument();
    expect(screen.queryByText(/Search this flight on Google Flights/i)).not.toBeInTheDocument();
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
