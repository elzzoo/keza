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

  it("should return isPro: true for a paid Pro user", async () => {
    mockLemonsqueezy.isProUser.mockResolvedValue(true);
    mockLemonsqueezy.getTrialStatus.mockResolvedValue(null);

    const result = await checkProAccess("paid@example.com");

    expect(result.isPro).toBe(true);
    expect(result.hasTrial).toBe(false);
    expect(result.isActive).toBe(true);
    expect(result.daysLeft).toBeNull();
  });

  it("should return isActive: true and hasTrial: true for an active trial user", async () => {
    const trialExpiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    mockLemonsqueezy.isProUser.mockResolvedValue(false);
    mockLemonsqueezy.getTrialStatus.mockResolvedValue({
      createdAt: new Date().toISOString(),
      expiresAt: trialExpiresAt,
    });

    const result = await checkProAccess("trial@example.com");

    expect(result.isPro).toBe(false);
    expect(result.isActive).toBe(true);
    expect(result.hasTrial).toBe(true);
    expect(result.daysLeft).toBe(5);
  });

  it("should return isActive: false for a free user with no trial", async () => {
    mockLemonsqueezy.isProUser.mockResolvedValue(false);
    mockLemonsqueezy.getTrialStatus.mockResolvedValue(null);

    const result = await checkProAccess("free@example.com");

    expect(result.isPro).toBe(false);
    expect(result.hasTrial).toBe(false);
    expect(result.isActive).toBe(false);
    expect(result.daysLeft).toBeNull();
  });
});
