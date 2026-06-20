import {
  isValidIata,
  isValidEmail,
  isValidCabin,
  isValidPrice,
  isValidFlightInputPrice,
  isValidPassengerCount,
  isValidStops,
  isValidHttpsUrl,
} from "@/lib/validate";

describe("isValidIata", () => {
  it("accepts 3-letter uppercase codes", () => {
    expect(isValidIata("CDG")).toBe(true);
    expect(isValidIata("JFK")).toBe(true);
    expect(isValidIata("DKR")).toBe(true);
  });

  it("accepts lowercase input (normalised internally)", () => {
    expect(isValidIata("cdg")).toBe(true);
  });

  it("rejects codes that are too short or too long", () => {
    expect(isValidIata("CD")).toBe(false);
    expect(isValidIata("CDGG")).toBe(false);
  });

  it("rejects codes with digits or special chars", () => {
    expect(isValidIata("CD1")).toBe(false);
    expect(isValidIata("C-G")).toBe(false);
  });

  it("rejects non-string inputs", () => {
    expect(isValidIata(null)).toBe(false);
    expect(isValidIata(undefined)).toBe(false);
    expect(isValidIata(123)).toBe(false);
  });
});

describe("isValidEmail", () => {
  it("accepts standard email addresses", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("user.name+tag@sub.domain.org")).toBe(true);
  });

  it("rejects missing @ or domain parts", () => {
    expect(isValidEmail("userexample.com")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
  });

  it("rejects emails with spaces", () => {
    expect(isValidEmail("user @example.com")).toBe(false);
  });

  it("rejects emails over 254 characters", () => {
    const long = "a".repeat(249) + "@b.com"; // 249+6 = 255 chars → over the 254 limit
    expect(long.length).toBe(255);
    expect(isValidEmail(long)).toBe(false);
  });

  it("rejects non-string inputs", () => {
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
  });
});

describe("isValidCabin", () => {
  it("accepts all 4 valid cabin values", () => {
    expect(isValidCabin("economy")).toBe(true);
    expect(isValidCabin("premium")).toBe(true);
    expect(isValidCabin("business")).toBe(true);
    expect(isValidCabin("first")).toBe(true);
  });

  it("rejects unknown cabin values", () => {
    expect(isValidCabin("Economy")).toBe(false);
    expect(isValidCabin("coach")).toBe(false);
    expect(isValidCabin("")).toBe(false);
  });

  it("rejects non-string inputs", () => {
    expect(isValidCabin(null)).toBe(false);
    expect(isValidCabin(1)).toBe(false);
  });
});

describe("isValidPrice", () => {
  it("accepts positive numbers within range", () => {
    expect(isValidPrice(1)).toBe(true);
    expect(isValidPrice(500)).toBe(true);
    expect(isValidPrice(50000)).toBe(true);
  });

  it("accepts numeric strings (coerced)", () => {
    expect(isValidPrice("250")).toBe(true);
  });

  it("rejects zero and negative numbers", () => {
    expect(isValidPrice(0)).toBe(false);
    expect(isValidPrice(-1)).toBe(false);
  });

  it("rejects prices above 50 000", () => {
    expect(isValidPrice(50001)).toBe(false);
  });

  it("rejects NaN, Infinity, and non-numeric strings", () => {
    expect(isValidPrice(NaN)).toBe(false);
    expect(isValidPrice(Infinity)).toBe(false);
    expect(isValidPrice("abc")).toBe(false);
    expect(isValidPrice(null)).toBe(false);
  });
});

describe("isValidFlightInputPrice", () => {
  it("accepts positive numbers with at most 2 decimal places", () => {
    expect(isValidFlightInputPrice(100)).toBe(true);
    expect(isValidFlightInputPrice(500.5)).toBe(true);
    expect(isValidFlightInputPrice(1234.56)).toBe(true);
  });

  it("rejects numbers with more than 2 decimal places (financial precision)", () => {
    expect(isValidFlightInputPrice(100.123)).toBe(false);
    expect(isValidFlightInputPrice(500.555)).toBe(false);
  });

  it("rejects zero and negative numbers", () => {
    expect(isValidFlightInputPrice(0)).toBe(false);
    expect(isValidFlightInputPrice(-100)).toBe(false);
  });

  it("rejects prices above 100 000", () => {
    expect(isValidFlightInputPrice(100001)).toBe(false);
  });

  it("rejects non-finite values", () => {
    expect(isValidFlightInputPrice(NaN)).toBe(false);
    expect(isValidFlightInputPrice(Infinity)).toBe(false);
  });
});

describe("isValidPassengerCount", () => {
  it("accepts integers from 1 to 9", () => {
    expect(isValidPassengerCount(1)).toBe(true);
    expect(isValidPassengerCount(4)).toBe(true);
    expect(isValidPassengerCount(9)).toBe(true);
  });

  it("rejects zero and negative counts", () => {
    expect(isValidPassengerCount(0)).toBe(false);
    expect(isValidPassengerCount(-1)).toBe(false);
  });

  it("rejects counts over 9", () => {
    expect(isValidPassengerCount(10)).toBe(false);
    expect(isValidPassengerCount(100)).toBe(false);
  });

  it("rejects decimal numbers", () => {
    expect(isValidPassengerCount(1.5)).toBe(false);
    expect(isValidPassengerCount(2.1)).toBe(false);
  });

  it("rejects invalid values", () => {
    expect(isValidPassengerCount(null)).toBe(false);
    expect(isValidPassengerCount(undefined)).toBe(false);
    expect(isValidPassengerCount("abc")).toBe(false);
  });
});

describe("isValidStops", () => {
  it("accepts integers from 0 to 5", () => {
    expect(isValidStops(0)).toBe(true);
    expect(isValidStops(1)).toBe(true);
    expect(isValidStops(5)).toBe(true);
  });

  it("rejects negative numbers", () => {
    expect(isValidStops(-1)).toBe(false);
  });

  it("rejects stops over 5", () => {
    expect(isValidStops(6)).toBe(false);
    expect(isValidStops(10)).toBe(false);
  });

  it("rejects decimal numbers", () => {
    expect(isValidStops(1.5)).toBe(false);
    expect(isValidStops(2.1)).toBe(false);
  });

  it("rejects invalid values", () => {
    expect(isValidStops(null)).toBe(false);
    expect(isValidStops(undefined)).toBe(false);
    expect(isValidStops("abc")).toBe(false);
  });
});

describe("isValidHttpsUrl", () => {
  it("accepts valid https URLs", () => {
    expect(isValidHttpsUrl("https://example.com/push")).toBe(true);
    expect(isValidHttpsUrl("https://fcm.googleapis.com/fcm/send/abc123")).toBe(true);
  });

  it("rejects http URLs", () => {
    expect(isValidHttpsUrl("http://example.com/push")).toBe(false);
  });

  it("rejects non-URL strings", () => {
    expect(isValidHttpsUrl("not-a-url")).toBe(false);
    expect(isValidHttpsUrl("")).toBe(false);
  });

  it("rejects non-string inputs", () => {
    expect(isValidHttpsUrl(null)).toBe(false);
    expect(isValidHttpsUrl(undefined)).toBe(false);
    expect(isValidHttpsUrl(123)).toBe(false);
  });
});
