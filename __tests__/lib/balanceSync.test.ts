const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: { get: mockRedisGet, set: mockRedisSet },
}));

jest.mock("@/lib/logger");

import { fetchAirlineBalance, syncUserBalances } from "@/lib/balanceSync";

describe("Balance Sync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisSet.mockResolvedValue("OK");
    mockRedisGet.mockResolvedValue(null);
  });

  it("fetches Singapore Airlines balance from API", async () => {
    // Mock the fetch for Singapore API
    global.fetch = jest.fn((url: string | Request | URL) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("singaporeair.com")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              miles: 50000,
              expireDate: "2026-12-31",
              tier: "Gold",
            }),
        } as Response);
      }
      return Promise.reject(new Error("Unknown URL"));
    }) as jest.Mock;

    const balance = await fetchAirlineBalance("SINGAPORE", {
      username: "user123",
      password: "pass123",
    });
    expect(balance).not.toBeNull();
    expect(balance).toHaveProperty("program", "Singapore KrisFlyer");
    expect(balance).toHaveProperty("miles");
    expect(typeof balance?.miles).toBe("number");
    expect(balance?.miles).toBe(50000);
  });

  it("handles API errors gracefully", async () => {
    // Mock failed fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.reject(new Error("API Error")),
      } as Response)
    );

    const balance = await fetchAirlineBalance("SINGAPORE", {
      username: "invalid",
      password: "invalid",
    });
    expect(balance).toBeNull();
  });

  it("syncs all programs for user", async () => {
    // Mock successful fetch for both airlines
    global.fetch = jest.fn((url: string | Request | URL) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("singaporeair.com")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              miles: 50000,
              expireDate: "2026-12-31",
              tier: "Gold",
            }),
        } as Response);
      }
      if (urlStr.includes("ana.co.jp")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              premiummiles: 30000,
              basicmiles: 20000,
              membershipStatus: "Platinum",
            }),
        } as Response);
      }
      return Promise.reject(new Error("Unknown URL"));
    }) as jest.Mock;

    const programs = {
      SINGAPORE: { username: "user1", password: "pass1" },
      ANA: { username: "user2", password: "pass2" },
    };
    const results = await syncUserBalances("user@example.com", programs);
    expect(results).toHaveLength(2);
    expect(results[0]).toHaveProperty("program");
    expect(results[0]).toHaveProperty("miles");
    expect(results[0]).toHaveProperty("lastSynced");

    // Verify Redis was called
    expect(mockRedisSet).toHaveBeenCalled();
  });
});
