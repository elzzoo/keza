/**
 * Currency Conversion Engine
 *
 * High-performance currency conversion with support for multiple currency pairs.
 * All conversions are from USD as the base currency.
 * Performance target: <1ms per conversion
 */

/** Exchange rates: currency code → conversion rate from USD */
export type ExchangeRates = Record<string, number>;

/**
 * Convert an amount from one currency to another
 *
 * @param amountUSD - The amount in USD (base currency)
 * @param fromCurrency - Source currency code (e.g., "USD", "EUR")
 * @param toCurrency - Target currency code (e.g., "EUR", "GBP")
 * @param rates - Exchange rates map (currency → rate from USD)
 * @returns Converted amount rounded to 2 decimal places
 *
 * @example
 * const rates = { EUR: 0.92, GBP: 0.79 };
 * convertPrice(100, "USD", "EUR", rates); // 92
 * convertPrice(100, "EUR", "USD", rates); // ~108.7 (100 / 0.92)
 */
export function convertPrice(
  amountUSD: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRates
): number {
  // If currencies match, return amount unchanged
  if (fromCurrency === toCurrency) {
    return amountUSD;
  }

  // If target is USD, return amount unchanged
  if (toCurrency === "USD") {
    return amountUSD;
  }

  // If fromCurrency is not USD, first convert to USD
  let baseAmount = amountUSD;
  if (fromCurrency !== "USD") {
    const fromRate = rates[fromCurrency];
    if (!fromRate) {
      // Fallback: no rate available, return original amount
      return amountUSD;
    }
    // Convert from source currency to USD: amount / rate
    baseAmount = amountUSD / fromRate;
  }

  // Convert from USD to target currency
  const toRate = rates[toCurrency];
  if (!toRate) {
    // Fallback: no rate available, return original amount
    return amountUSD;
  }

  // Perform conversion: amount * rate, rounded to 2 decimals
  const converted = baseAmount * toRate;
  return Math.round(converted * 100) / 100;
}

/**
 * Format a currency amount with locale-aware formatting
 *
 * @param amount - The amount to format
 * @param currency - Currency code (e.g., "USD", "EUR")
 * @param locale - BCP 47 language tag (e.g., "en-US", "fr-FR")
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234.56, "USD", "en-US"); // "$1,234.56"
 * formatCurrency(1234.56, "EUR", "fr-FR"); // "1 234,56 €"
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale: string = "en-US"
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for invalid currency or locale
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Get the currency symbol for a given currency code
 *
 * @param currency - Currency code (e.g., "USD", "EUR", "GBP")
 * @returns Currency symbol (e.g., "$", "€", "£") or currency code if not found
 *
 * @example
 * getCurrencySymbol("USD"); // "$"
 * getCurrencySymbol("EUR"); // "€"
 * getCurrencySymbol("XXX"); // "XXX" (fallback)
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    CHF: "CHF",
    CAD: "C$",
    AUD: "A$",
    NZD: "NZ$",
    CNY: "¥",
    INR: "₹",
    KRW: "₩",
    SGD: "S$",
    HKD: "HK$",
    NOK: "kr",
    SEK: "kr",
    DKK: "kr",
    BRL: "R$",
    MXN: "$",
    ZAR: "R",
    AED: "د.إ",
    SAR: "﷼",
    THB: "฿",
    MYR: "RM",
    PHP: "₱",
    IDR: "Rp",
    VND: "₫",
    TRY: "₺",
    NGN: "₦",
    KES: "KSh",
    GHS: "GH₵",
    EGP: "E£",
    MAD: "د.م.",
    XOF: "FCFA",
  };

  return symbols[currency] || currency;
}
