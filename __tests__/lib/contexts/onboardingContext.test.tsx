// __tests__/lib/contexts/onboardingContext.test.ts
import { renderHook, act } from "@testing-library/react";
import { useOnboarding, OnboardingProvider } from "@/lib/contexts/onboardingContext";
import { clearOnboardingData } from "@/lib/storage";

describe("onboardingContext", () => {
  beforeEach(() => {
    clearOnboardingData();
  });

  it("provides default onboarding state", () => {
    const wrapper = ({ children }: any) => <OnboardingProvider>{children}</OnboardingProvider>;
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    expect(result.current.state.selectedPrograms).toEqual([]);
    expect(result.current.state.programBalances).toEqual({});
    expect(result.current.state.favoriteRoutes).toEqual([]);
  });

  it("allows adding programs", () => {
    const wrapper = ({ children }: any) => <OnboardingProvider>{children}</OnboardingProvider>;
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    act(() => {
      result.current.addProgram("Flying Blue");
      result.current.addProgram("Singapore KrisFlyer");
    });

    expect(result.current.state.selectedPrograms).toContain("Flying Blue");
    expect(result.current.state.selectedPrograms).toContain("Singapore KrisFlyer");
  });

  it("allows removing programs", () => {
    const wrapper = ({ children }: any) => <OnboardingProvider>{children}</OnboardingProvider>;
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    act(() => {
      result.current.addProgram("Flying Blue");
      result.current.removeProgram("Flying Blue");
    });

    expect(result.current.state.selectedPrograms).not.toContain("Flying Blue");
  });

  it("allows setting balance for a program", () => {
    const wrapper = ({ children }: any) => <OnboardingProvider>{children}</OnboardingProvider>;
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    act(() => {
      result.current.setBalance("Flying Blue", 150000);
    });

    expect(result.current.state.programBalances["Flying Blue"]).toBe(150000);
  });

  it("allows adding favorite routes", () => {
    const wrapper = ({ children }: any) => <OnboardingProvider>{children}</OnboardingProvider>;
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    act(() => {
      result.current.addRoute("SIN", "LAX");
      result.current.addRoute("CDG", "JFK");
    });

    expect(result.current.state.favoriteRoutes).toEqual([["SIN", "LAX"], ["CDG", "JFK"]]);
  });

  it("prevents adding more than 5 routes", () => {
    const wrapper = ({ children }: any) => <OnboardingProvider>{children}</OnboardingProvider>;
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    act(() => {
      for (let i = 0; i < 6; i++) {
        result.current.addRoute("SIN", `XXX${i}`);
      }
    });

    expect(result.current.state.favoriteRoutes.length).toBe(5);
  });

  it("removes routes with case-insensitive comparison", () => {
    const wrapper = ({ children }: any) => <OnboardingProvider>{children}</OnboardingProvider>;
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    act(() => {
      result.current.addRoute("SIN", "LAX");
      result.current.addRoute("CDG", "JFK");
    });

    expect(result.current.state.favoriteRoutes.length).toBe(2);

    // Remove with lowercase - should still work
    act(() => {
      result.current.removeRoute("sin", "lax");
    });

    expect(result.current.state.favoriteRoutes).toEqual([["CDG", "JFK"]]);
  });

  it("persists state to localStorage", () => {
    const wrapper = ({ children }: any) => <OnboardingProvider>{children}</OnboardingProvider>;
    const { result } = renderHook(() => useOnboarding(), { wrapper });

    act(() => {
      result.current.addProgram("Flying Blue");
      result.current.setBalance("Flying Blue", 100000);
    });

    // Simulate page reload
    const { result: result2 } = renderHook(() => useOnboarding(), { wrapper });
    expect(result2.current.state.selectedPrograms).toContain("Flying Blue");
    expect(result2.current.state.programBalances["Flying Blue"]).toBe(100000);
  });
});
