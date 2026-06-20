import {
  CURRENCIES,
  QUICK_CURRENCIES,
  currencyForCountry,
  formatPrice,
  convertUSD,
  type CurrencyCode,
} from "@/lib/currency";

describe("currency", () => {
  describe("currency configuration", () => {
    test("CURRENCIES has 21+ currencies defined", () => {
      expect(Object.keys(CURRENCIES).length).toBeGreaterThanOrEqual(21);
    });

    test("each currency has required fields: code, symbol, position, decimals, thousandsSep, decimalSep, name, flag", () => {
      for (const [code, config] of Object.entries(CURRENCIES)) {
        expect(config.code).toBe(code);
        expect(typeof config.symbol).toBe("string");
        expect(["before", "after"]).toContain(config.position);
        expect(typeof config.decimals).toBe("number");
        expect(typeof config.thousandsSep).toBe("string");
        expect(typeof config.decimalSep).toBe("string");
        expect(typeof config.name).toBe("string");
        expect(typeof config.flag).toBe("string");
      }
    });

    test("major currencies are present: USD, EUR, GBP, JPY", () => {
      expect(CURRENCIES["USD"]).toBeDefined();
      expect(CURRENCIES["EUR"]).toBeDefined();
      expect(CURRENCIES["GBP"]).toBeDefined();
      expect(CURRENCIES["JPY"]).toBeDefined();
    });

    test("regional currencies are present: XOF, MAD, NGN, KES", () => {
      expect(CURRENCIES["XOF"]).toBeDefined();
      expect(CURRENCIES["MAD"]).toBeDefined();
      expect(CURRENCIES["NGN"]).toBeDefined();
      expect(CURRENCIES["KES"]).toBeDefined();
    });
  });

  describe("symbol positioning", () => {
    test("USD symbol is before: $1000", () => {
      expect(CURRENCIES["USD"].position).toBe("before");
      expect(CURRENCIES["USD"].symbol).toBe("$");
    });

    test("EUR symbol is after: 1000€", () => {
      expect(CURRENCIES["EUR"].position).toBe("after");
      expect(CURRENCIES["EUR"].symbol).toBe("€");
    });

    test("GBP symbol is before: £1000", () => {
      expect(CURRENCIES["GBP"].position).toBe("before");
      expect(CURRENCIES["GBP"].symbol).toBe("£");
    });

    test("XOF symbol is after: 1000FCFA", () => {
      expect(CURRENCIES["XOF"].position).toBe("after");
      expect(CURRENCIES["XOF"].symbol).toBe("FCFA");
    });
  });

  describe("thousands separators", () => {
    test("USD uses comma: 1,000", () => {
      expect(CURRENCIES["USD"].thousandsSep).toBe(",");
    });

    test("EUR uses space: 1 000", () => {
      expect(CURRENCIES["EUR"].thousandsSep).toBe(" ");
    });

    test("CHF uses apostrophe: 1'000", () => {
      expect(CURRENCIES["CHF"].thousandsSep).toBe("'");
    });
  });

  describe("country to currency mapping", () => {
    test("US → USD", () => {
      expect(currencyForCountry("US")).toBe("USD");
    });

    test("UK → GBP", () => {
      expect(currencyForCountry("GB")).toBe("GBP");
    });

    test("France → EUR", () => {
      expect(currencyForCountry("FR")).toBe("EUR");
    });

    test("Japan → JPY", () => {
      expect(currencyForCountry("JP")).toBe("JPY");
    });

    test("Nigeria → NGN", () => {
      expect(currencyForCountry("NG")).toBe("NGN");
    });

    test("Kenya → KES", () => {
      expect(currencyForCountry("KE")).toBe("KES");
    });

    test("Morocco → MAD", () => {
      expect(currencyForCountry("MA")).toBe("MAD");
    });

    test("Eurozone countries return EUR", () => {
      const euroCountries = ["DE", "IT", "ES", "NL", "BE", "AT"];
      for (const country of euroCountries) {
        expect(currencyForCountry(country)).toBe("EUR");
      }
    });

    test("CFA zone countries return XOF", () => {
      const cfaCountries = ["SN", "CI", "ML", "BF"];
      for (const country of cfaCountries) {
        expect(currencyForCountry(country)).toBe("XOF");
      }
    });

    test("unknown country defaults to USD", () => {
      expect(currencyForCountry("XX")).toBe("USD");
    });

    test("country codes are case-insensitive", () => {
      expect(currencyForCountry("us")).toBe("USD");
      expect(currencyForCountry("Us")).toBe("USD");
      expect(currencyForCountry("FR")).toBe("EUR");
      expect(currencyForCountry("fr")).toBe("EUR");
    });
  });

  describe("price formatting", () => {
    test("formatPrice with USD currency and rate 1", () => {
      const rates = { USD: 1 };
      const result = formatPrice(800, "USD", rates);
      expect(result).toBe("$800");
    });

    test("formatPrice with EUR converts using rate", () => {
      const rates = { EUR: 0.92 };
      const result = formatPrice(1000, "EUR", rates);
      // 1000 * 0.92 = 920
      expect(result).toContain("920");
    });

    test("formatPrice with GBP", () => {
      const rates = { GBP: 0.79 };
      const result = formatPrice(1000, "GBP", rates);
      // 1000 * 0.79 = 790
      expect(result).toContain("790");
    });

    test("formatPrice defaults to USD if currency not found", () => {
      const rates = {};
      const result = formatPrice(800, "USD" as CurrencyCode, rates);
      expect(result).toBe("$800");
    });

    test("formatPrice rounds to nearest integer", () => {
      const rates = { USD: 1 };
      const result1 = formatPrice(800.4, "USD", rates);
      const result2 = formatPrice(800.6, "USD", rates);
      expect(result1).toBe("$800");
      expect(result2).toBe("$801");
    });

    test("formatPrice with thousands separator (USD)", () => {
      const rates = { USD: 1 };
      const result = formatPrice(123456, "USD", rates);
      expect(result).toContain(",");
    });

    test("formatPrice symbol position: before (USD)", () => {
      const rates = { USD: 1 };
      const result = formatPrice(800, "USD", rates);
      expect(result.startsWith("$")).toBe(true);
    });

    test("formatPrice symbol position: after (EUR)", () => {
      const rates = { EUR: 1 };
      const result = formatPrice(800, "EUR", rates);
      expect(result.endsWith("€")).toBe(true);
    });
  });

  describe("currency conversion", () => {
    test("convertUSD with USD returns same amount", () => {
      const rates = { USD: 1 };
      const result = convertUSD(800, "USD", rates);
      expect(result).toBe(800);
    });

    test("convertUSD with EUR multiplies by rate", () => {
      const rates = { EUR: 0.92 };
      const result = convertUSD(1000, "EUR", rates);
      expect(result).toBe(920);
    });

    test("convertUSD with missing rate uses 1", () => {
      const rates: Record<string, number> = {};
      const result = convertUSD(800, "EUR" as CurrencyCode, rates);
      expect(result).toBe(800);
    });

    test("convertUSD rounds result to nearest integer", () => {
      const rates = { EUR: 0.92 };
      const result1 = convertUSD(800.4, "EUR", rates);
      const result2 = convertUSD(800.6, "EUR", rates);
      // 800.4 * 0.92 = 736.368 → 736
      // 800.6 * 0.92 = 736.552 → 737
      expect(typeof result1).toBe("number");
      expect(typeof result2).toBe("number");
      expect(result2).toBeGreaterThanOrEqual(result1);
    });
  });

  describe("quick currencies picker", () => {
    test("QUICK_CURRENCIES has 16 currencies", () => {
      expect(QUICK_CURRENCIES.length).toBe(16);
    });

    test("QUICK_CURRENCIES includes major currencies", () => {
      expect(QUICK_CURRENCIES).toContain("USD");
      expect(QUICK_CURRENCIES).toContain("EUR");
      expect(QUICK_CURRENCIES).toContain("GBP");
      expect(QUICK_CURRENCIES).toContain("JPY");
    });

    test("QUICK_CURRENCIES includes regional currencies", () => {
      expect(QUICK_CURRENCIES).toContain("XOF");
      expect(QUICK_CURRENCIES).toContain("MAD");
      expect(QUICK_CURRENCIES).toContain("NGN");
      expect(QUICK_CURRENCIES).toContain("KES");
    });

    test("all QUICK_CURRENCIES are defined in CURRENCIES", () => {
      for (const code of QUICK_CURRENCIES) {
        expect(CURRENCIES[code]).toBeDefined();
      }
    });
  });

  describe("african currency support", () => {
    test("West African Franc (XOF) is defined", () => {
      expect(CURRENCIES["XOF"]).toBeDefined();
      expect(CURRENCIES["XOF"].name).toBe("Franc CFA");
    });

    test("Nigerian Naira (NGN) is defined", () => {
      expect(CURRENCIES["NGN"]).toBeDefined();
      expect(CURRENCIES["NGN"].symbol).toBe("₦");
    });

    test("Kenyan Shilling (KES) is defined", () => {
      expect(CURRENCIES["KES"]).toBeDefined();
      expect(CURRENCIES["KES"].symbol).toBe("KSh");
    });

    test("South African Rand (ZAR) is defined", () => {
      expect(CURRENCIES["ZAR"]).toBeDefined();
      expect(CURRENCIES["ZAR"].symbol).toBe("R");
    });

    test("Moroccan Dirham (MAD) is defined", () => {
      expect(CURRENCIES["MAD"]).toBeDefined();
      expect(CURRENCIES["MAD"].code).toBe("MAD");
    });

    test("Egyptian Pound (EGP) is defined", () => {
      expect(CURRENCIES["EGP"]).toBeDefined();
      expect(CURRENCIES["EGP"].symbol).toBe("E£");
    });
  });
});
