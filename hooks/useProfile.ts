"use client";

import { useState, useEffect, useCallback } from "react";
import {
  loadProfile,
  saveProfile,
  addRecentSearch,
  toggleFavoriteRoute,
  type UserProfile,
  type RecentSearch,
} from "@/lib/userProfile";

/**
 * React hook for user profile management.
 * Loads from localStorage on mount, syncs changes back.
 */
export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Load on mount (client-side only)
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

  const setPrograms = useCallback((programs: string[]) => {
    update({ programs });
  }, [update]);

  const setLang = useCallback((lang: "fr" | "en") => {
    update({ lang });
  }, [update]);

  const setCurrency = useCallback((currency: "USD" | "EUR" | "GBP" | "XOF") => {
    update({ currency });
  }, [update]);

  const setCabin = useCallback((cabin: "economy" | "premium" | "business" | "first") => {
    update({ cabin });
  }, [update]);

  const recordSearch = useCallback((search: Omit<RecentSearch, "timestamp">) => {
    addRecentSearch(search);
    setProfile(loadProfile()); // refresh
  }, []);

  const toggleFavorite = useCallback((from: string, to: string) => {
    const added = toggleFavoriteRoute(from, to);
    setProfile(loadProfile()); // refresh
    return added;
  }, []);

  return {
    profile,
    isLoaded: profile !== null,
    update,
    setPrograms,
    setLang,
    setCurrency,
    setCabin,
    recordSearch,
    toggleFavorite,
  };
}
