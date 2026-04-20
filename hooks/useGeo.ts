"use client";

import { useState, useEffect } from "react";

// Global cache — fetched once, shared across all components
let cachedCountry: string | null = null;
let fetching = false;
let fetchPromise: Promise<void> | null = null;

/**
 * Detect user's country code via the forex API response
 * (which already reads x-vercel-ip-country).
 * Returns ISO2 country code or null if not detected yet.
 */
export function useGeo(): string | null {
  const [country, setCountry] = useState<string | null>(cachedCountry);

  useEffect(() => {
    if (cachedCountry) {
      setCountry(cachedCountry);
      return;
    }

    if (!fetching) {
      fetching = true;
      fetchPromise = fetch("/api/forex")
        .then((r) => r.json())
        .then((data: { detected?: { country?: string } }) => {
          if (data.detected?.country) {
            cachedCountry = data.detected.country;
          }
        })
        .catch(() => {})
        .finally(() => { fetching = false; }) as Promise<void>;
    }

    fetchPromise?.then(() => {
      if (cachedCountry) setCountry(cachedCountry);
    });
  }, []);

  return country;
}
