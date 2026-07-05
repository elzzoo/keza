"use client";

import React, { createContext, useContext } from "react";
import { useOnboarding } from "./onboardingContext";

interface ProfileContextValue {
  selectedPrograms: string[];
  programBalances: Record<string, number>;
  favoriteRoutes: Array<[string, string]>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { state } = useOnboarding();

  return (
    <ProfileContext.Provider
      value={{
        selectedPrograms: state.selectedPrograms,
        programBalances: state.programBalances,
        favoriteRoutes: state.favoriteRoutes,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile must be used within ProfileProvider");
  }
  return ctx;
}
