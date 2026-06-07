/**
 * Unit tests for Pro access control
 */

import { checkProAccess } from "@/lib/proAccess";
import * as lemonsqueezy from "@/lib/lemonsqueezy";

// Mock the dependencies
jest.mock("@/lib/lemonsqueezy");

const mockLemonsqueezy = lemonsqueezy as jest.Mocked<typeof lemonsqueezy>;

describe("checkProAccess", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return hasPro: true for a paid Pro user", async () => {
    mockLemonsqueezy.isProUser.mockResolvedValue(true);
    mockLemonsqueezy.getTrialStatus.mockResolvedValue(null);

    const result = await checkProAccess("paid@example.com");

    expect(result.hasPro).toBe(true);
    expect(result.isTrialUser).toBe(false);
    expect(result.trialExpiresAt).toBeUndefined();
  });

  it("should return hasPro: true and isTrialUser: true for an active trial user", async () => {
    const trialExpiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    mockLemonsqueezy.isProUser.mockResolvedValue(false);
    mockLemonsqueezy.getTrialStatus.mockResolvedValue({
      createdAt: new Date().toISOString(),
      expiresAt: trialExpiresAt,
    });

    const result = await checkProAccess("trial@example.com");

    expect(result.hasPro).toBe(true);
    expect(result.isTrialUser).toBe(true);
    expect(result.trialExpiresAt).toBe(trialExpiresAt);
  });

  it("should return hasPro: false for a free user with no trial", async () => {
    mockLemonsqueezy.isProUser.mockResolvedValue(false);
    mockLemonsqueezy.getTrialStatus.mockResolvedValue(null);

    const result = await checkProAccess("free@example.com");

    expect(result.hasPro).toBe(false);
    expect(result.isTrialUser).toBe(false);
    expect(result.trialExpiresAt).toBeUndefined();
  });
});
