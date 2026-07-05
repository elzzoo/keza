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
import type { ExchangeRates } from "@/lib/exchange-rates";
import { getDefaultCurrencyForCountry } from "@/lib/currencyDetection";

// ---- types ----

interface ProfileContextValue {
  profile:       UserProfile | null;
  isLoaded:      boolean;
  isSyncing:     boolean;
  exchangeRates: ExchangeRates;
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
  const [profile, setProfile] = useState<UserProfile | null>(loadProfile);
  const [isLoadingFromServer, setIsLoadingFromServer] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({});

  // On mount, try to sync with server (if user is authenticated)
  // Server checks authentication; endpoint returns null if not authenticated
  // Also initialize currency from localStorage or geo-detection, and fetch exchange rates
  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncWithServer = async () => {
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

    // Initialize currency from localStorage, or detect from geo-country header
    const initializeCurrency = () => {
      const currentProfile = loadProfile();

      // If currency is already set in profile, use it
      if (currentProfile.currency) {
        return;
      }

      // Try to get geo country from Vercel header (set via HTML attribute by middleware)
      const geoCountry = document.documentElement.getAttribute("data-geo-country");
      if (geoCountry) {
        const detectedCurrency = getDefaultCurrencyForCountry(geoCountry);
        currentProfile.currency = detectedCurrency;
        saveProfile(currentProfile);
      }
    };

    // Fetch exchange rates
    const fetchRates = async () => {
      try {
        const res = await fetch("/api/exchange-rates");
        if (res.ok) {
          const data = await res.json();
          if (data.rates) {
            setExchangeRates(data.rates);
            // Cache in localStorage for offline fallback
            try {
              localStorage.setItem("keza:exchange-rates", JSON.stringify(data.rates));
            } catch {
              // Storage full — silently fail
            }
          }
        }
      } catch {
        // Fallback to localStorage if available
        try {
          const cached = localStorage.getItem("keza:exchange-rates");
          if (cached) {
            setExchangeRates(JSON.parse(cached));
          }
        } catch {
          // Fallback to empty object, convertPrice will use defaults
        }
      }
    };

    initializeCurrency();
    syncWithServer();
    fetchRates();
  }, []);

  const update = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates, lastActiveAt: new Date().toISOString() };

      // Save to localStorage (always)
      saveProfile(updated);

      // Try to save to server (if authenticated, server will accept; if not, server returns 401)
      if (typeof window !== "undefined") {
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
      profile, isLoaded: profile !== null, isSyncing: isLoadingFromServer, exchangeRates,
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
