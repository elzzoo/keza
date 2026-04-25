import {
  isValidIata,
  isValidEmail,
  isValidCabin,
  isValidPrice,
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
