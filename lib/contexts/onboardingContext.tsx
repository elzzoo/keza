// lib/contexts/onboardingContext.ts
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getOnboardingState, setOnboardingState, type OnboardingState } from "@/lib/storage";

interface OnboardingContextValue {
  state: OnboardingState;
  addProgram: (program: string) => void;
  removeProgram: (program: string) => void;
  setPrograms: (programs: string[]) => void;
  setBalance: (program: string, balance: number) => void;
  addRoute: (from: string, to: string) => void;
  removeRoute: (from: string, to: string) => void;
  setRoutes: (routes: Array<[string, string]>) => void;
  reset: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>({
    selectedPrograms: [],
    programBalances: {},
    favoriteRoutes: [],
  });

  // Load from localStorage on mount
  useEffect(() => {
    const stored = getOnboardingState();
    setState(stored);
  }, []);

  // Sync to localStorage on state change
  useEffect(() => {
    setOnboardingState(state);
  }, [state]);

  const addProgram = (program: string) => {
    setState((prev) => ({
      ...prev,
      selectedPrograms: prev.selectedPrograms.includes(program)
        ? prev.selectedPrograms
        : [...prev.selectedPrograms, program],
    }));
  };

  const removeProgram = (program: string) => {
    setState((prev) => ({
      ...prev,
      selectedPrograms: prev.selectedPrograms.filter((p) => p !== program),
      programBalances: (() => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [program]: _, ...rest } = prev.programBalances;
        return rest;
      })(),
    }));
  };

  const setPrograms = (programs: string[]) => {
    setState((prev) => ({
      ...prev,
      selectedPrograms: programs,
    }));
  };

  const setBalance = (program: string, balance: number) => {
    setState((prev) => ({
      ...prev,
      programBalances: {
        ...prev.programBalances,
        [program]: balance,
      },
    }));
  };

  const addRoute = (from: string, to: string) => {
    setState((prev) => {
      const route: [string, string] = [from.toUpperCase(), to.toUpperCase()];
      const isDuplicate = prev.favoriteRoutes.some((r) => r[0] === route[0] && r[1] === route[1]);
      if (isDuplicate || prev.favoriteRoutes.length >= 5) {
        return prev;
      }
      return {
        ...prev,
        favoriteRoutes: [...prev.favoriteRoutes, route],
      };
    });
  };

  const removeRoute = (from: string, to: string) => {
    const normalized: [string, string] = [from.toUpperCase(), to.toUpperCase()];
    setState((prev) => ({
      ...prev,
      favoriteRoutes: prev.favoriteRoutes.filter((r) => !(r[0] === normalized[0] && r[1] === normalized[1])),
    }));
  };

  const setRoutes = (routes: Array<[string, string]>) => {
    setState((prev) => ({
      ...prev,
      favoriteRoutes: routes.slice(0, 5), // Max 5 routes
    }));
  };

  const reset = () => {
    setState({
      selectedPrograms: [],
      programBalances: {},
      favoriteRoutes: [],
    });
  };

  return (
    <OnboardingContext.Provider value={{ state, addProgram, removeProgram, setPrograms, setBalance, addRoute, removeRoute, setRoutes, reset }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return ctx;
}
