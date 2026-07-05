import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { SearchForm } from "@/components/SearchForm";
import { OnboardingProvider } from "@/lib/contexts/onboardingContext";
import { setVisitedFlag } from "@/lib/storage";

// Mock the analytics and sonner modules
jest.mock("@/lib/analytics", () => ({
  trackSearch: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

// Mock the AirportPicker component to simplify testing
jest.mock("@/components/AirportPicker", () => ({
  AirportPicker: ({ value, onChange, label }: any) => (
    <input
      data-testid={`airport-${label}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={label}
    />
  ),
}));

// Mock the PriceCalendar component
jest.mock("@/components/PriceCalendar", () => ({
  PriceCalendar: () => <div data-testid="price-calendar">Calendar</div>,
}));

describe("Onboarding Integration Tests", () => {
  const mockOnResults = jest.fn();
  const mockOnLoading = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should render SearchForm with onboarding context", async () => {
    setVisitedFlag(true);

    render(
      <OnboardingProvider>
        <SearchForm
          onResults={mockOnResults}
          onLoading={mockOnLoading}
          lang="en"
        />
      </OnboardingProvider>
    );

    // SearchForm should render
    await waitFor(() => {
      expect(screen.getByText("Round trip")).toBeInTheDocument();
    });
  });

  it("should have programs input field available", async () => {
    setVisitedFlag(true);

    render(
      <OnboardingProvider>
        <SearchForm
          onResults={mockOnResults}
          onLoading={mockOnLoading}
          lang="en"
        />
      </OnboardingProvider>
    );

    // Verify the programs input field exists
    const programsInput = screen.getByPlaceholderText(
      "Flying Blue, Chase UR, Amex MR…"
    );
    expect(programsInput).toBeInTheDocument();
  });

  it("should render airport pickers for route selection", async () => {
    setVisitedFlag(true);

    render(
      <OnboardingProvider>
        <SearchForm
          onResults={mockOnResults}
          onLoading={mockOnLoading}
          lang="en"
        />
      </OnboardingProvider>
    );

    // Verify that the form is rendered
    await waitFor(() => {
      expect(screen.getByText("Round trip")).toBeInTheDocument();
    });

    // The airport picker inputs should exist
    const fromInputs = screen.getAllByPlaceholderText("From");
    expect(fromInputs.length).toBeGreaterThan(0);
  });

  it("should render cabin selection buttons", async () => {
    setVisitedFlag(true);

    render(
      <OnboardingProvider>
        <SearchForm
          onResults={mockOnResults}
          onLoading={mockOnLoading}
          lang="en"
        />
      </OnboardingProvider>
    );

    // Verify cabin options are rendered
    await waitFor(() => {
      expect(screen.getByText("Eco")).toBeInTheDocument();
      expect(screen.getByText("Prem")).toBeInTheDocument();
      expect(screen.getByText("Bus.")).toBeInTheDocument();
      expect(screen.getByText("1st")).toBeInTheDocument();
    });
  });

  it("should render passenger controls", async () => {
    setVisitedFlag(true);

    render(
      <OnboardingProvider>
        <SearchForm
          onResults={mockOnResults}
          onLoading={mockOnLoading}
          lang="en"
        />
      </OnboardingProvider>
    );

    // Verify passenger controls are rendered
    await waitFor(() => {
      expect(screen.getByText("1 pax")).toBeInTheDocument();
    });
  });

  it("should render search button", async () => {
    setVisitedFlag(true);

    render(
      <OnboardingProvider>
        <SearchForm
          onResults={mockOnResults}
          onLoading={mockOnLoading}
          lang="en"
        />
      </OnboardingProvider>
    );

    // Verify search button exists
    await waitFor(() => {
      expect(screen.getByText(/Optimize my flight/)).toBeInTheDocument();
    });
  });

  it("should handle onboarding state context without errors", async () => {
    setVisitedFlag(true);

    // Should render without throwing errors
    expect(() => {
      render(
        <OnboardingProvider>
          <SearchForm
            onResults={mockOnResults}
            onLoading={mockOnLoading}
            lang="en"
          />
        </OnboardingProvider>
      );
    }).not.toThrow();
  });
});
