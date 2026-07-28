"use client";

import { useCallback } from "react";
import {
  type CurrencyCode,
  CURRENCIES,
  formatPrice as fmtPrice,
} from "@/lib/currency";
import { useProfile } from "@/hooks/useProfile";

/**
 * Multi-currency hook.
 *
 * Thin wrapper around ProfileContext — that's the single source of truth for
 * the user's currency (set via the header CurrencyPicker) and exchange rates.
 * This used to maintain its own separate `keza_currency` localStorage state
 * and its own /api/forex fetch, entirely disconnected from ProfileContext:
 * switching currency in the header updated profile.currency, but every
 * formatPrice() built from this hook kept using its own stale, unrelated
 * state — so search results, CheapestRouteBanner, etc. silently stayed in
 * USD after the user picked a different currency. Delegating to
 * ProfileContext fixes that by construction — one state, everywhere.
 */
export function useCurrency() {
  const { currency: rawCurrency, setCurrency: setProfileCurrency, exchangeRates, isLoaded } = useProfile();

  const currency: CurrencyCode = (rawCurrency in CURRENCIES ? rawCurrency : "USD") as CurrencyCode;

  const setCurrency = useCallback((code: CurrencyCode) => {
    setProfileCurrency(code);
  }, [setProfileCurrency]);

  /** Format a USD amount into the active currency */
  const formatPrice = useCallback(
    (usdAmount: number): string => {
      return fmtPrice(usdAmount, currency, exchangeRates);
    },
    [currency, exchangeRates]
  );

  /** Get the currency config */
  const config = CURRENCIES[currency] ?? CURRENCIES.USD;

  return {
    currency,
    setCurrency,
    formatPrice,
    rates: exchangeRates,
    ready: isLoaded,
    config,
  };
}
