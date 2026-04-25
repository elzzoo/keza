// __tests__/lib/referral.test.ts

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockIncr = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockGet(...args),
    set: (...args: unknown[]) => mockSet(...args),
    incr: (...args: unknown[]) => mockIncr(...args),
  },
}));
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn().mockResolvedValue({ id: "mock" }) },
  })),
}));

import {
  getOrCreateReferralCode,
  resolveReferralCode,
  getReferralCredits,
  processReferralConversion,
} from "@/lib/referral";

beforeEach(() => {
  jest.clearAllMocks();
  process.env.HMAC_SECRET = "test-secret";
});

describe("getOrCreateReferralCode", () => {
  it("returns existing code from Redis", async () => {
    mockGet.mockResolvedValue("ABC12345");
    const code = await getOrCreateReferralCode("user@example.com");
    expect(code).toBe("ABC12345");
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("creates and stores a new code when none exists", async () => {
    mockGet.mockResolvedValue(null);
    mockSet.mockResolvedValue("OK");
    const code = await getOrCreateReferralCode("user@example.com");
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[A-Z0-9]+$/);
    expect(mockSet).toHaveBeenCalledTimes(2); // code + reverse lookup
  });

  it("is deterministic for same email", async () => {
    mockGet.mockResolvedValue(null);
    mockSet.mockResolvedValue("OK");
    const code1 = await getOrCreateReferralCode("user@example.com");
    mockGet.mockResolvedValue(null);
    const code2 = await getOrCreateReferralCode("user@example.com");
    expect(code1).toBe(code2);
  });

  it("normalises email to lowercase", async () => {
    mockGet.mockResolvedValue(null);
    mockSet.mockResolvedValue("OK");
    await getOrCreateReferralCode("User@EXAMPLE.com");
    expect(mockGet).toHaveBeenCalledWith("keza:ref:code:user@example.com");
  });
});

describe("resolveReferralCode", () => {
  it("returns email for known code", async () => {
    mockGet.mockResolvedValue("referrer@example.com");
    expect(await resolveReferralCode("ABC12345")).toBe("referrer@example.com");
  });

  it("returns null for unknown code", async () => {
    mockGet.mockResolvedValue(null);
    expect(await resolveReferralCode("UNKNOWN1")).toBeNull();
  });
});

describe("getReferralCredits", () => {
  it("returns 0 when no credits", async () => {
    mockGet.mockResolvedValue(null);
    expect(await getReferralCredits("user@example.com")).toBe(0);
  });

  it("returns parsed integer from Redis", async () => {
    mockGet.mockResolvedValue("3");
    expect(await getReferralCredits("user@example.com")).toBe(3);
  });

  it("returns 0 on Redis error (fail open)", async () => {
    mockGet.mockRejectedValue(new Error("redis down"));
    expect(await getReferralCredits("user@example.com")).toBe(0);
  });
});

describe("processReferralConversion", () => {
  it("does nothing if already converted", async () => {
    // First get = REF_CONVERTED check = "already converted"
    mockGet.mockResolvedValueOnce("referrer@example.com");
    await processReferralConversion("newuser@example.com", "ABC12345");
    expect(mockIncr).not.toHaveBeenCalled();
  });

  it("credits referrer and marks conversion", async () => {
    mockGet
      .mockResolvedValueOnce(null)                       // REF_CONVERTED_KEY → not yet converted
      .mockResolvedValueOnce("referrer@example.com");    // REF_EMAIL_KEY → referrer email
    mockSet.mockResolvedValue("OK");
    mockIncr.mockResolvedValue(1);

    await processReferralConversion("newuser@example.com", "ABC12345");

    expect(mockIncr).toHaveBeenCalledTimes(2); // credits + converts
    expect(mockSet).toHaveBeenCalledWith(
      "keza:ref:converted:newuser@example.com",
      "referrer@example.com"
    );
  });

  it("does nothing if referral code is invalid", async () => {
    mockGet
      .mockResolvedValueOnce(null)   // not converted
      .mockResolvedValueOnce(null);  // code not found
    await processReferralConversion("newuser@example.com", "INVALID1");
    expect(mockIncr).not.toHaveBeenCalled();
  });

  it("does not credit self-referral", async () => {
    mockGet
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("user@example.com"); // referrer = same as referred
    await processReferralConversion("user@example.com", "SELFREF1");
    expect(mockIncr).not.toHaveBeenCalled();
  });
});
