const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
  },
}));

import { getForexRate } from "@/lib/autoCalibrate";

describe("getForexRate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue("OK");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("tries the backup provider when the primary request fails", async () => {
    const fetchMock = jest.spyOn(global, "fetch")
      .mockRejectedValueOnce(new Error("primary unavailable"))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ rates: { XOF: 625 } }) } as Response);

    await expect(getForexRate()).resolves.toBe(625);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mockRedisSet).toHaveBeenCalledWith("forex:usd:xof", 625, { ex: 12 * 60 * 60 });
  });

  it("uses the approximate fallback only after both providers fail", async () => {
    const fetchMock = jest.spyOn(global, "fetch")
      .mockRejectedValueOnce(new Error("primary unavailable"))
      .mockRejectedValueOnce(new Error("backup unavailable"));

    await expect(getForexRate()).resolves.toBe(600);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mockRedisSet).toHaveBeenCalledWith("forex:usd:xof", 600, { ex: 24 * 60 * 60 });
  });
});
