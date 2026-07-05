/**
 * Currency detection helper — maps country codes to currencies.
 * Provides getDefaultCurrencyForCountry() for geo-based detection.
 */

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  // Eurozone
  FR: "EUR", DE: "EUR", IT: "EUR", ES: "EUR", PT: "EUR", NL: "EUR", BE: "EUR",
  AT: "EUR", IE: "EUR", FI: "EUR", GR: "EUR", LU: "EUR", SK: "EUR", SI: "EUR",
  EE: "EUR", LV: "EUR", LT: "EUR", CY: "EUR", MT: "EUR", HR: "EUR",
  // CFA Zone (West Africa)
  SN: "XOF", CI: "XOF", ML: "XOF", BF: "XOF", NE: "XOF", TG: "XOF", BJ: "XOF", GW: "XOF",
  // CFA Zone (Central Africa)
  CM: "XOF", GA: "XOF", TD: "XOF", CG: "XOF", CF: "XOF", GQ: "XOF",
  // Maghreb
  MA: "MAD", TN: "EUR", DZ: "EUR",
  // Nigeria
  NG: "NGN",
  // East Africa
  KE: "KES", TZ: "KES", UG: "KES",
  // Southern Africa
  ZA: "ZAR",
  // Egypt
  EG: "EGP",
  // UK
  GB: "GBP",
  // Americas
  US: "USD", PR: "USD", CA: "CAD", BR: "BRL", MX: "USD",
  // Asia-Pacific
  JP: "JPY", AU: "AUD", NZ: "AUD", IN: "INR",
  // Middle East
  AE: "AED", SA: "SAR",
  // Turkey
  TR: "TRY",
  // Scandinavia
  SE: "SEK", NO: "NOK", DK: "DKK",
  // Switzerland
  CH: "CHF",
};

/**
 * Get default currency for a country ISO2 code.
 * Falls back to USD if country not found.
 *
 * @param countryCode - ISO 2-letter country code (e.g., "FR", "US")
 * @returns Currency code (e.g., "EUR", "USD")
 */
export function getDefaultCurrencyForCountry(countryCode: string): string {
  return COUNTRY_TO_CURRENCY[countryCode.toUpperCase()] ?? "USD";
}
