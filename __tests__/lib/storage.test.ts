// __tests__/lib/storage.test.ts
import {
  getOnboardingState,
  setOnboardingState,
  getVisitedFlag,
  setVisitedFlag,
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
});
