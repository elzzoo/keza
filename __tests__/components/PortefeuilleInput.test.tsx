import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PortefeuilleClient } from "@/app/portefeuille/PortefeuilleClient";
import { ProfileProvider } from "@/contexts/ProfileContext";
import * as userProfileLib from "@/lib/userProfile";

// Mock components that aren't essential to test
jest.mock("@/components/Header", () => ({
  Header: ({ onLangChange }: { onLangChange?: (lang: string) => void }) => (
    <header>
      <button onClick={() => onLangChange?.("fr")}>Header</button>
    </header>
  ),
}));

jest.mock("@/components/Footer", () => ({
  Footer: () => <footer>Footer</footer>,
}));

jest.mock("@/lib/globalPrograms", () => ({
  GLOBAL_PROGRAMS: [
    { name: "Flying Blue", marketValueCents: 0.8 },
    { name: "ANA Mileage Club", marketValueCents: 1.2 },
    { name: "Chase Ultimate Rewards", marketValueCents: 0.7 },
    { name: "Singapore KrisFlyer", marketValueCents: 1.0 },
    { name: "Emirates Skywards", marketValueCents: 0.9 },
    { name: "British Airways Avios", marketValueCents: 1.1 },
    { name: "United MileagePlus", marketValueCents: 0.85 },
    { name: "Delta SkyMiles", marketValueCents: 0.75 },
    { name: "Air Canada Aeroplan", marketValueCents: 0.95 },
    { name: "Iberia Avios Plus", marketValueCents: 1.05 },
    { name: "Lufthansa Miles & More", marketValueCents: 0.88 },
  ],
}));

jest.mock("@/lib/userProfile", () => ({
  ...jest.requireActual("@/lib/userProfile"),
  loadProfile: jest.fn(),
  saveProfile: jest.fn(),
}));

const mockLoadProfile = userProfileLib.loadProfile as jest.Mock;
const mockSaveProfile = userProfileLib.saveProfile as jest.Mock;

describe("Portfolio Input Focus Issue (B9) - Input Value Persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();

    mockLoadProfile.mockReturnValue({
      programs: [],
      currency: "USD",
      lang: "fr",
      cabin: "economy",
      recentSearches: [],
      favoriteRoutes: [],
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      balances: {},
      bankPoints: {},
    });
  });

  test("input value renders correctly when balance is 0", () => {
    render(
      <ProfileProvider>
        <PortefeuilleClient />
      </ProfileProvider>
    );

    // Find Flying Blue input
    const spinbuttons = screen.getAllByRole("spinbutton");
    const flyingBlueInput = spinbuttons[0] as HTMLInputElement;

    // When value is 0, input should show placeholder
    expect(flyingBlueInput.value).toBe("");
  });

  test("entering 50000 in Flying Blue field preserves value", () => {
    render(
      <ProfileProvider>
        <PortefeuilleClient />
      </ProfileProvider>
    );

    const spinbuttons = screen.getAllByRole("spinbutton");
    const flyingBlueInput = spinbuttons[0] as HTMLInputElement;

    // Simulate user entering 50000
    fireEvent.change(flyingBlueInput, { target: { value: "50000" } });

    // Value should be set in the input
    expect(flyingBlueInput.value).toBe("50000");

    // Handler should have been called with correct value
    expect(mockSaveProfile).toHaveBeenCalled();
    const savedProfile = mockSaveProfile.mock.calls[mockSaveProfile.mock.calls.length - 1][0];
    expect(savedProfile.balances["Flying Blue"]).toBe(50000);
  });

  test("entering values in both Flying Blue (50K) and ANA (30K) preserves both", () => {
    let lastSavedBalances: Record<string, number> = {};
    const allSaves: Array<Record<string, number>> = [];

    // Track saved balances
    mockSaveProfile.mockImplementation((profile: Record<string, unknown>) => {
      const balances = profile.balances as Record<string, number>;
      lastSavedBalances = { ...balances };
      allSaves.push({ ...balances });
    });

    // Update mock to simulate database returning saved values
    mockLoadProfile.mockImplementation(() => ({
      programs: [],
      currency: "USD",
      lang: "fr",
      cabin: "economy",
      recentSearches: [],
      favoriteRoutes: [],
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      balances: lastSavedBalances,
      bankPoints: {},
    }));

    render(
      <ProfileProvider>
        <PortefeuilleClient />
      </ProfileProvider>
    );

    const spinbuttons = screen.getAllByRole("spinbutton");
    const flyingBlueInput = spinbuttons[0] as HTMLInputElement; // Flying Blue is first
    const anaInput = spinbuttons[2] as HTMLInputElement; // ANA Mileage Club is third (after Chase UR)

    // Enter 50000 in Flying Blue
    fireEvent.change(flyingBlueInput, { target: { value: "50000" } });
    expect(flyingBlueInput.value).toBe("50000");

    // Enter 30000 in ANA
    fireEvent.change(anaInput, { target: { value: "30000" } });
    expect(anaInput.value).toBe("30000");

    // Both values should be saved
    expect(lastSavedBalances["Flying Blue"]).toBe(50000);
    expect(lastSavedBalances["ANA Mileage Club"]).toBe(30000);
  });

  test("clearing and re-entering value works correctly", () => {
    render(
      <ProfileProvider>
        <PortefeuilleClient />
      </ProfileProvider>
    );

    const spinbuttons = screen.getAllByRole("spinbutton");
    const flyingBlueInput = spinbuttons[0] as HTMLInputElement;

    // Enter value
    fireEvent.change(flyingBlueInput, { target: { value: "50000" } });
    expect(flyingBlueInput.value).toBe("50000");

    // Clear it
    fireEvent.change(flyingBlueInput, { target: { value: "" } });
    expect(flyingBlueInput.value).toBe("");

    // Re-enter different value
    fireEvent.change(flyingBlueInput, { target: { value: "75000" } });
    expect(flyingBlueInput.value).toBe("75000");

    const savedProfile = mockSaveProfile.mock.calls[mockSaveProfile.mock.calls.length - 1][0];
    expect(savedProfile.balances["Flying Blue"]).toBe(75000);
  });

  test("negative values are clamped to 0", () => {
    render(
      <ProfileProvider>
        <PortefeuilleClient />
      </ProfileProvider>
    );

    const spinbuttons = screen.getAllByRole("spinbutton");
    const flyingBlueInput = spinbuttons[0] as HTMLInputElement;

    // Try to enter negative value
    fireEvent.change(flyingBlueInput, { target: { value: "-5000" } });

    // Should be clamped to 0
    const savedProfile = mockSaveProfile.mock.calls[mockSaveProfile.mock.calls.length - 1][0];
    expect(savedProfile.balances["Flying Blue"]).toBe(0);
  });

  test("bank points input also works correctly", () => {
    render(
      <ProfileProvider>
        <PortefeuilleClient />
      </ProfileProvider>
    );

    const spinbuttons = screen.getAllByRole("spinbutton");
    // Bank points inputs come after the 10 programs
    const amexInput = spinbuttons[10] as HTMLInputElement;

    // Enter value in Amex MR
    fireEvent.change(amexInput, { target: { value: "25000" } });
    expect(amexInput.value).toBe("25000");

    const savedProfile = mockSaveProfile.mock.calls[mockSaveProfile.mock.calls.length - 1][0];
    expect(savedProfile.bankPoints["Amex MR"]).toBe(25000);
  });
});
