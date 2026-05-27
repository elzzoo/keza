const mockGet  = jest.fn();
const mockSet  = jest.fn();
const mockDel  = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: { get: mockGet, set: mockSet, del: mockDel },
}));

// server-only guard must be bypassed in tests
jest.mock("server-only", () => ({}));

import { getServerProfile, saveServerProfile, deleteServerProfile } from "@/lib/serverProfile";
import type { UserProfile } from "@/lib/userProfile";

const EMAIL = "user@example.com";
const PROFILE: Partial<UserProfile> = {
  balances: { "Flying Blue": 45000 },
  favoriteRoutes: [{ from: "DSS", to: "CDG", addedAt: "2026-01-01T00:00:00Z" }],
};

describe("getServerProfile", () => {
  it("returns null when key missing", async () => {
    mockGet.mockResolvedValueOnce(null);
    expect(await getServerProfile(EMAIL)).toBeNull();
    expect(mockGet).toHaveBeenCalledWith("keza:profile:server:user@example.com");
  });

  it("returns parsed profile when key exists", async () => {
    mockGet.mockResolvedValueOnce(PROFILE);
    const result = await getServerProfile(EMAIL);
    expect(result?.balances).toEqual({ "Flying Blue": 45000 });
  });
});

describe("saveServerProfile", () => {
  it("writes to correct key with 90-day TTL", async () => {
    mockSet.mockResolvedValueOnce("OK");
    await saveServerProfile(EMAIL, PROFILE as UserProfile);
    expect(mockSet).toHaveBeenCalledWith(
      "keza:profile:server:user@example.com",
      PROFILE,
      { ex: 90 * 24 * 60 * 60 }
    );
  });
});

describe("deleteServerProfile", () => {
  it("deletes the key", async () => {
    mockDel.mockResolvedValueOnce(1);
    await deleteServerProfile(EMAIL);
    expect(mockDel).toHaveBeenCalledWith("keza:profile:server:user@example.com");
  });
});
