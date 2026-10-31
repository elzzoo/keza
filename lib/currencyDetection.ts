import { currencyForCountry } from "./currency";

/**
 * Get default currency for a country ISO2 code.
 * Falls back to USD if country not found.
 *
 * @param countryCode - ISO 2-letter country code (e.g., "FR", "US")
 * @returns Currency code (e.g., "EUR", "USD")
 */
export function getDefaultCurrencyForCountry(countryCode: string): string {
  return currencyForCountry(countryCode);
}
