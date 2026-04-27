"use client";

import { useState, useEffect, useCallback } from "react";
import {
  type CurrencyCode,
  CURRENCIES,
  formatPrice as fmtPrice,
} from "@/lib/currency";

interface ForexResponse {
  rates: Record<string, number>;
  detected: { country: string | null; currency: CurrencyCode };
  usdToXof: number;
}

// ── Static fallback rates (used before live rates are fetched) ───────────────
// These are approximate values that ensure the currency toggle works immediately
// on first load, before the /api/forex response arrives.
// Live rates from the API override these once fetched.
const FALLBACK_RATES: Record<string, number> = {
  EUR: 0.92,  GBP: 0.79,  XOF: 608,   MAD: 10.1,  NGN: 1600,
  KES: 130,   CAD: 1.37,  AUD: 1.55,  JPY: 155,   CHF: 0.90,
  SEK: 10.5,  NOK: 10.8,  DKK: 6.9,   BRL: 5.0,   INR: 84,
  AED: 3.67,  SAR: 3.75,  ZAR: 18.5,  EGP: 49,    TRY: 33,
};

// Global cache — shared across all components
let cachedRates: Record<string, number> | null = null;
let cachedDetected: CurrencyCode | null = null;
let fetching = false;
let fetchPromise: Promise<void> | null = null;

const STORAGE_KEY = "keza_currency";

function loadSaved(): CurrencyCode | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in CURRENCIES) return saved as CurrencyCode;
  } catch {}
  return null;
}

function saveCurrency(code: CurrencyCode) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, code); } catch {}
}

/**
 * Multi-currency hook.
 * - Auto-detects currency from geo IP on first load
 * - Persists user's choice in localStorage
 * - Provides formatPrice() helper that converts from USD
 */
export function useCurrency() {
  const [currency, setCurrencyState] = useState<CurrencyCode>(loadSaved() ?? "USD");
  const [rates, setRates] = useState<Record<string, number>>(cachedRates ?? FALLBACK_RATES);
  const [ready, setReady] = useState(cachedRates !== null);

  useEffect(() => {
    // If already fetched, use cache
    if (cachedRates) {
      setRates(cachedRates);
      if (!loadSaved() && cachedDetected) {
        setCurrencyState(cachedDetected);
      }
      setReady(true);
      return;
    }

    // Fetch rates (deduplicated)
    if (!fetching) {
      fetching = true;
      fetchPromise = fetch("/api/forex")
        .then((r) => r.json())
        .then((data: ForexResponse) => {
          if (data.rates && Object.keys(data.rates).length > 5) {
            cachedRates = data.rates;
          }
          if (data.detected?.currency) {
            cachedDetected = data.detected.currency;
          }
        })
        .catch(() => {})
        .finally(() => { fetching = false; }) as Promise<void>;
    }

    fetchPromise?.then(() => {
      if (cachedRates) setRates(cachedRates);
      // Only auto-detect if user hasn't saved a preference
      if (!loadSaved() && cachedDetected) {
        setCurrencyState(cachedDetected);
      }
      setReady(true);
    });
  }, []);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    saveCurrency(code);
  }, []);

  /** Format a USD amount into the active currency */
  const formatPrice = useCallback(
    (usdAmount: number): string => {
      return fmtPrice(usdAmount, currency, rates);
    },
    [currency, rates]
  );

  /** Get the currency config */
  const config = CURRENCIES[currency] ?? CURRENCIES.USD;

  return {
    currency,
    setCurrency,
    formatPrice,
    rates,
    ready,
    config,
  };
}
