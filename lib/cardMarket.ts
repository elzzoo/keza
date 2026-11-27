// Where the traveller's credit cards were issued.
// Our bank-points data describes United States programs only: the same brand
// (e.g. Amex) has different partners and ratios elsewhere. Until another market
// is verified, outside the US we only keep currencies available worldwide.

export type CardMarket = "US" | "OTHER";

const AVAILABLE_OUTSIDE_US = new Set(["Marriott Bonvoy"]);

/** `bank` is a bank-points currency name, short ("Chase UR") or long form. */
export function isBankAvailable(bank: string, market: CardMarket = "US"): boolean {
  return market === "US" || AVAILABLE_OUTSIDE_US.has(bank);
}

export function parseCardMarket(value: unknown): CardMarket | undefined {
  return value === "US" || value === "OTHER" ? value : undefined;
}

/** Explicit choice wins, then the visitor's country; unknown keeps the US default. */
export function resolveCardMarket(choice: unknown, country: string | null): CardMarket {
  return parseCardMarket(choice) ?? (country && country.toUpperCase() !== "US" ? "OTHER" : "US");
}
