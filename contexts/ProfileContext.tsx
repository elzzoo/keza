"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
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
  isSyncing:     boolean;
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
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(loadProfile);
  const [isLoadingFromServer, setIsLoadingFromServer] = useState(false);

  // Load profile from server if authenticated (but start with localStorage)
  useEffect(() => {
    // Only fetch on the client side
    if (typeof window === "undefined" || !session?.user?.email) {
      return;
    }

    // Authenticated: fetch from Redis via server
    const loadFromServer = async () => {
      setIsLoadingFromServer(true);
      try {
        const res = await fetch("/api/portfolio");
        if (res.ok) {
          const data = await res.json();
          if (data.portfolio) {
            setProfile(data.portfolio);
          }
        }
      } catch {
        // Silently fail — localStorage is the fallback
      } finally {
        setIsLoadingFromServer(false);
      }
    };

    loadFromServer();
  }, [session?.user?.email]);

  const update = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates, lastActiveAt: new Date().toISOString() };

      // Save to localStorage (always)
      saveProfile(updated);

      // Save to server if authenticated and in browser
      if (typeof window !== "undefined" && session?.user?.email) {
        fetch("/api/portfolio", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        }).catch(() => {
          // Silently fail — localStorage is the fallback
        });
      }

      return updated;
    });
  }, [session?.user?.email]);

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
      profile, isLoaded: profile !== null, isSyncing: isLoadingFromServer,
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
