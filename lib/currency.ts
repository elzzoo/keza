/**
 * Multi-currency support — maps countries to currencies,
 * formats prices, and provides conversion helpers.
 */

export type CurrencyCode = "USD" | "EUR" | "GBP" | "XOF" | "MAD" | "NGN" | "KES" | "CAD" | "AUD" | "JPY" | "CHF" | "SEK" | "NOK" | "DKK" | "BRL" | "INR" | "AED" | "SAR" | "ZAR" | "EGP" | "TRY";

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  /** Symbol position: "before" ($100) or "after" (100€) */
  position: "before" | "after";
  /** Decimal places to show */
  decimals: number;
  /** Thousands separator */
  thousandsSep: string;
  /** Decimal separator */
  decimalSep: string;
  /** Display name */
  name: string;
  /** Flag emoji */
  flag: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: { code: "USD", symbol: "$",    position: "before", decimals: 0, thousandsSep: ",",  decimalSep: ".", name: "US Dollar",           flag: "🇺🇸" },
  EUR: { code: "EUR", symbol: "€",    position: "after",  decimals: 0, thousandsSep: " ",  decimalSep: ",", name: "Euro",                flag: "🇪🇺" },
  GBP: { code: "GBP", symbol: "£",    position: "before", decimals: 0, thousandsSep: ",",  decimalSep: ".", name: "British Pound",       flag: "🇬🇧" },
  XOF: { code: "XOF", symbol: "FCFA", position: "after",  decimals: 0, thousandsSep: " ",  decimalSep: ",", name: "Franc CFA",           flag: "🇸🇳" },
  MAD: { code: "MAD", symbol: "MAD",  position: "after",  decimals: 0, thousandsSep: " ",  decimalSep: ",", name: "Dirham marocain",     flag: "🇲🇦" },
  NGN: { code: "NGN", symbol: "₦",    position: "before", decimals: 0, thousandsSep: ",",  decimalSep: ".", name: "Nigerian Naira",      flag: "🇳🇬" },
  KES: { code: "KES", symbol: "KSh",  position: "before", decimals: 0, thousandsSep: ",",  decimalSep: ".", name: "Kenyan Shilling",     flag: "🇰🇪" },
  CAD: { code: "CAD", symbol: "C$",   position: "before", decimals: 0, thousandsSep: ",",  decimalSep: ".", name: "Canadian Dollar",     flag: "🇨🇦" },
  AUD: { code: "AUD", symbol: "A$",   position: "before", decimals: 0, thousandsSep: ",",  decimalSep: ".", name: "Australian Dollar",   flag: "🇦🇺" },
  JPY: { code: "JPY", symbol: "¥",    position: "before", decimals: 0, thousandsSep: ",",  decimalSep: ".", name: "Japanese Yen",        flag: "🇯🇵" },
  CHF: { code: "CHF", symbol: "CHF",  position: "after",  decimals: 0, thousandsSep: "'",  decimalSep: ".", name: "Swiss Franc",         flag: "🇨🇭" },
  SEK: { code: "SEK", symbol: "kr",   position: "after",  decimals: 0, thousandsSep: " ",  decimalSep: ",", name: "Swedish Krona",       flag: "🇸🇪" },
  NOK: { code: "NOK", symbol: "kr",   position: "after",  decimals: 0, thousandsSep: " ",  decimalSep: ",", name: "Norwegian Krone",     flag: "🇳🇴" },
  DKK: { code: "DKK", symbol: "kr",   position: "after",  decimals: 0, thousandsSep: ".",  decimalSep: ",", name: "Danish Krone",        flag: "🇩🇰" },
  BRL: { code: "BRL", symbol: "R$",   position: "before", decimals: 0, thousandsSep: ".",  decimalSep: ",", name: "Brazilian Real",      flag: "🇧🇷" },
  INR: { code: "INR", symbol: "₹",    position: "before", decimals: 0, thousandsSep: ",",  decimalSep: ".", name: "Indian Rupee",        flag: "🇮🇳" },
  AED: { code: "AED", symbol: "AED",  position: "before", decimals: 0, thousandsSep: ",",  decimalSep: ".", name: "UAE Dirham",          flag: "🇦🇪" },
  SAR: { code: "SAR", symbol: "SAR",  position: "before", decimals: 0, thousandsSep: ",",  decimalSep: ".", name: "Saudi Riyal",         flag: "🇸🇦" },
  ZAR: { code: "ZAR", symbol: "R",    position: "before", decimals: 0, thousandsSep: " ",  decimalSep: ",", name: "South African Rand",  flag: "🇿🇦" },
  EGP: { code: "EGP", symbol: "E£",   position: "before", decimals: 0, thousandsSep: ",",  decimalSep: ".", name: "Egyptian Pound",      flag: "🇪🇬" },
  TRY: { code: "TRY", symbol: "₺",    position: "before", decimals: 0, thousandsSep: ".",  decimalSep: ",", name: "Turkish Lira",        flag: "🇹🇷" },
};

// ─── Country → Currency mapping ────────────────────────────────────────────

const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  // Eurozone
  FR: "EUR", DE: "EUR", IT: "EUR", ES: "EUR", PT: "EUR", NL: "EUR", BE: "EUR",
  AT: "EUR", IE: "EUR", FI: "EUR", GR: "EUR", LU: "EUR", SK: "EUR", SI: "EUR",
  EE: "EUR", LV: "EUR", LT: "EUR", CY: "EUR", MT: "EUR", HR: "EUR",
  // CFA Zone (West Africa)
  SN: "XOF", CI: "XOF", ML: "XOF", BF: "XOF", NE: "XOF", TG: "XOF", BJ: "XOF", GW: "XOF",
  // CFA Zone (Central Africa) — same XOF display
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
  US: "USD", PR: "USD",
  CA: "CAD",
  BR: "BRL", MX: "USD",
  // Asia-Pacific
  JP: "JPY",
  AU: "AUD", NZ: "AUD",
  IN: "INR",
  // Middle East
  AE: "AED", SA: "SAR",
  // Turkey
  TR: "TRY",
  // Scandinavia
  SE: "SEK", NO: "NOK", DK: "DKK",
  // Switzerland
  CH: "CHF",
};

/** Get default currency for a country ISO2 code */
export function currencyForCountry(countryCode: string): CurrencyCode {
  return COUNTRY_TO_CURRENCY[countryCode.toUpperCase()] ?? "USD";
}

// ─── Price formatting ──────────────────────────────────────────────────────

function formatNumber(n: number, config: CurrencyConfig): string {
  const rounded = Math.round(n);
  const parts = rounded.toString().split(".");
  const intPart = parts[0];

  // Add thousands separators
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, config.thousandsSep);
  return formatted;
}

/** Format a USD amount into a target currency */
export function formatPrice(
  usdAmount: number,
  currency: CurrencyCode,
  rates: Record<string, number>
): string {
  const config = CURRENCIES[currency];
  if (!config) return `$${Math.round(usdAmount)}`;

  const rate = currency === "USD" ? 1 : (rates[currency] ?? 1);
  const converted = usdAmount * rate;
  const formatted = formatNumber(converted, config);

  if (config.position === "before") {
    return `${config.symbol}${formatted}`;
  }
  return `${formatted} ${config.symbol}`;
}

/** Convert USD to target currency (raw number) */
export function convertUSD(usdAmount: number, currency: CurrencyCode, rates: Record<string, number>): number {
  if (currency === "USD") return usdAmount;
  const rate = rates[currency] ?? 1;
  return Math.round(usdAmount * rate);
}

// ─── Quick picker currencies (shown in currency selector) ──────────────────

export const QUICK_CURRENCIES: CurrencyCode[] = [
  "USD", "EUR", "GBP", "XOF", "MAD", "NGN", "KES", "CAD",
  "AUD", "JPY", "CHF", "BRL", "INR", "AED", "ZAR", "TRY",
];
