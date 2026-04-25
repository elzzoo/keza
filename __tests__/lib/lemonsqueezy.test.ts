// __tests__/lib/lemonsqueezy.test.ts

const mockGet = jest.fn();
const mockSet = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockGet(...args),
    set: (...args: unknown[]) => mockSet(...args),
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import {
  isProUser,
  grantPro,
  revokePro,
  verifyLemonWebhook,
} from "@/lib/lemonsqueezy";
import crypto from "crypto";

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
});

describe("isProUser", () => {
  it("returns false when no key in Redis", async () => {
    mockGet.mockResolvedValue(null);
    expect(await isProUser("user@example.com")).toBe(false);
  });

  it("returns false when value is 'cancelled'", async () => {
    mockGet.mockResolvedValue("cancelled");
    expect(await isProUser("user@example.com")).toBe(false);
  });

  it("returns true when subscription ID is stored", async () => {
    mockGet.mockResolvedValue("sub_123");
    expect(await isProUser("user@example.com")).toBe(true);
  });

  it("normalises email to lowercase", async () => {
    mockGet.mockResolvedValue("sub_abc");
    await isProUser("User@EXAMPLE.com");
    expect(mockGet).toHaveBeenCalledWith("keza:pro:user@example.com");
  });

  it("returns false (fail open) when Redis throws", async () => {
    mockGet.mockRejectedValue(new Error("redis down"));
    expect(await isProUser("user@example.com")).toBe(false);
  });
});

describe("grantPro", () => {
  it("sets the subscription ID in Redis", async () => {
    mockSet.mockResolvedValue("OK");
    await grantPro("user@example.com", "sub_xyz");
    expect(mockSet).toHaveBeenCalledWith("keza:pro:user@example.com", "sub_xyz");
  });
});

describe("revokePro", () => {
  it("sets value to 'cancelled' in Redis", async () => {
    mockSet.mockResolvedValue("OK");
    await revokePro("user@example.com");
    expect(mockSet).toHaveBeenCalledWith("keza:pro:user@example.com", "cancelled");
  });
});

describe("verifyLemonWebhook", () => {
  it("returns false when secret is not configured", () => {
    delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    expect(verifyLemonWebhook("body", "sig")).toBe(false);
  });

  it("returns true for a valid HMAC-SHA256 signature", () => {
    const secret = "test-secret-xyz";
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = secret;
    const body = JSON.stringify({ event: "subscription_created" });
    const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyLemonWebhook(body, sig)).toBe(true);
  });

  it("returns false for an invalid signature", () => {
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = "test-secret-xyz";
    expect(verifyLemonWebhook("body", "bad-signature")).toBe(false);
  });
});
