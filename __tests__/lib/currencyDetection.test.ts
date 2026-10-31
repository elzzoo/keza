import { getDefaultCurrencyForCountry } from "@/lib/currencyDetection";
import { currencyForCountry } from "@/lib/currency";

describe("geo currency detection", () => {
  it.each(["SN", "CI", "FR", "GB", "NG", "KE", "MA", "CM", "TN", "TZ", "NZ", "MX", "XX", "sn"])(
    "agrees with the supported currency map for %s",
    (country) => {
      expect(getDefaultCurrencyForCountry(country)).toBe(currencyForCountry(country));
    },
  );
});
