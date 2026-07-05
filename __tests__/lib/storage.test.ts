// __tests__/lib/storage.test.ts
import {
  getOnboardingState,
  setOnboardingState,
  getVisitedFlag,
  setVisitedFlag,
  clearOnboardingData,
  type OnboardingState
} from "@/lib/storage";

describe("onboarding storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns default onboarding state when no data stored", () => {
    const state = getOnboardingState();
    expect(state.selectedPrograms).toEqual([]);
    expect(state.programBalances).toEqual({});
    expect(state.favoriteRoutes).toEqual([]);
  });

  it("persists and retrieves onboarding state", () => {
    const state: OnboardingState = {
      selectedPrograms: ["Flying Blue", "Singapore KrisFlyer"],
      programBalances: { "Flying Blue": 150000, "Singapore KrisFlyer": 250000 },
      favoriteRoutes: [["SIN", "LAX"], ["CDG", "JFK"]],
    };
    setOnboardingState(state);
    const retrieved = getOnboardingState();
    expect(retrieved).toEqual(state);
  });

  it("marks user as visited", () => {
    expect(getVisitedFlag()).toBe(false);
    setVisitedFlag(true);
    expect(getVisitedFlag()).toBe(true);
  });

  it("returns empty balances for new programs not in state", () => {
    const state: OnboardingState = {
      selectedPrograms: ["Flying Blue"],
      programBalances: { "Flying Blue": 100000 },
      favoriteRoutes: [],
    };
    setOnboardingState(state);
    const retrieved = getOnboardingState();
    expect(retrieved.programBalances["Singapore KrisFlyer"]).toBeUndefined();
  });

  it("clears all onboarding data", () => {
    const state: OnboardingState = {
      selectedPrograms: ["Flying Blue"],
      programBalances: { "Flying Blue": 100000 },
      favoriteRoutes: [["SIN", "LAX"]],
    };
    setOnboardingState(state);
    setVisitedFlag(true);

    // Verify data is stored
    expect(getOnboardingState().selectedPrograms).toEqual(["Flying Blue"]);
    expect(getVisitedFlag()).toBe(true);

    // Clear all data
    clearOnboardingData();

    // Verify all keys are empty
    expect(getOnboardingState()).toEqual({
      selectedPrograms: [],
      programBalances: {},
      favoriteRoutes: [],
    });
    expect(getVisitedFlag()).toBe(false);
  });

  it("handles corrupt JSON in localStorage gracefully", () => {
    // Simulate corrupt JSON data
    localStorage.setItem("keza:onboarding:programs", "{invalid json");

    // Should log warning and return empty state
    const warnSpy = jest.spyOn(console, "warn").mockImplementation();
    const state = getOnboardingState();

    expect(state).toEqual({
      selectedPrograms: [],
      programBalances: {},
      favoriteRoutes: [],
    });
    expect(warnSpy).toHaveBeenCalledWith(
      "Failed to retrieve onboarding state from localStorage",
      expect.any(Error)
    );

    warnSpy.mockRestore();
  });

  it("handles quota exceeded error gracefully", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation();

    // Mock localStorage.setItem to throw QuotaExceededError
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = jest.fn().mockImplementation(() => {
      const error = new Error("QuotaExceededError");
      error.name = "QuotaExceededError";
      throw error;
    });

    const state: OnboardingState = {
      selectedPrograms: ["Flying Blue"],
      programBalances: { "Flying Blue": 100000 },
      favoriteRoutes: [],
    };

    setOnboardingState(state);

    expect(warnSpy).toHaveBeenCalledWith(
      "Failed to save onboarding state to localStorage"
    );

    // Restore original setItem
    localStorage.setItem = originalSetItem;
    warnSpy.mockRestore();
  });
});
