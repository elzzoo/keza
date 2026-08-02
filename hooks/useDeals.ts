"use client";

import { useEffect, useState } from "react";
import type { LiveDeal } from "@/lib/dealsEngine";

interface DealsResponse {
  deals: LiveDeal[];
}

// Module-level cache — DealSpotlight, CheapestRouteBanner, and DealsStrip all
// mount at the same time on the homepage and each used to independently call
// fetch("/api/deals"), tripling the request for identical data. Sharing one
// in-flight promise (and its resolved result) across all three collapses that
// back down to a single network call.
let cachedDeals: LiveDeal[] | null = null;
let fetchPromise: Promise<LiveDeal[]> | null = null;

/** Test-only: clear the shared cache so each test gets a fresh fetch. */
export function __resetDealsCacheForTests() {
  cachedDeals = null;
  fetchPromise = null;
}

function loadDeals(): Promise<LiveDeal[]> {
  if (cachedDeals) return Promise.resolve(cachedDeals);
  if (!fetchPromise) {
    fetchPromise = fetch("/api/deals")
      .then((r) => r.json())
      .then((data: DealsResponse) => {
        cachedDeals = data.deals ?? [];
        return cachedDeals;
      })
      .catch((err) => {
        fetchPromise = null; // allow a retry on the next mount
        throw err;
      });
  }
  return fetchPromise;
}

export function useDeals() {
  const [deals, setDeals] = useState<LiveDeal[]>(cachedDeals ?? []);
  const [loading, setLoading] = useState(cachedDeals === null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    if (cachedDeals) {
      setDeals(cachedDeals);
      setLoading(false);
      return;
    }
    loadDeals()
      .then((d) => {
        if (!cancelled) {
          setDeals(d);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  return { deals, loading, error };
}
