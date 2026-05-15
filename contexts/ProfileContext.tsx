"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  loadProfile,
  saveProfile,
  addRecentSearch,
  toggleFavoriteRoute,
  type UserProfile,
  type RecentSearch,
} from "@/lib/userProfile";

// ---- types ----

interface ProfileContextValue {
  profile:       UserProfile | null;
  isLoaded:      boolean;
  update:        (updates: Partial<UserProfile>) => void;
  setPrograms:   (programs: string[]) => void;
  setLang:       (lang: "fr" | "en") => void;
  setCurrency:   (currency: string) => void;
  setCabin:      (cabin: "economy" | "premium" | "business" | "first") => void;
  setBalances:   (balances: Record<string, number>) => void;
  setBankPoints: (bankPoints: Record<string, number>) => void;
  recordSearch:  (search: Omit<RecentSearch, "timestamp">) => void;
  toggleFavorite:(from: string, to: string) => boolean;
}

// ---- context ----

const ProfileContext = createContext<ProfileContextValue | null>(null);

// ---- provider ----

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  const update = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates, lastActiveAt: new Date().toISOString() };
      saveProfile(updated);
      return updated;
    });
  }, []);

  const setPrograms   = useCallback((programs: string[]) => { update({ programs }); }, [update]);
  const setLang       = useCallback((lang: "fr" | "en") => { update({ lang }); }, [update]);
  const setCurrency   = useCallback((currency: string) => { update({ currency }); }, [update]);
  const setCabin      = useCallback((cabin: "economy" | "premium" | "business" | "first") => { update({ cabin }); }, [update]);
  const setBalances   = useCallback((balances: Record<string, number>) => { update({ balances }); }, [update]);
  const setBankPoints = useCallback((bankPoints: Record<string, number>) => { update({ bankPoints }); }, [update]);

  const recordSearch = useCallback((search: Omit<RecentSearch, "timestamp">) => {
    addRecentSearch(search);
    setProfile(loadProfile());
  }, []);

  const toggleFavorite = useCallback((from: string, to: string) => {
    const added = toggleFavoriteRoute(from, to);
    setProfile(loadProfile());
    return added;
  }, []);

  return (
    <ProfileContext.Provider value={{
      profile, isLoaded: profile !== null,
      update, setPrograms, setLang, setCurrency, setCabin,
      setBalances, setBankPoints, recordSearch, toggleFavorite,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

// ---- hook ----

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within <ProfileProvider>");
  return ctx;
}
