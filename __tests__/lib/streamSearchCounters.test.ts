const mockIncr = jest.fn();
const mockExpire = jest.fn();
const mockZincrby = jest.fn();
const mockLogWarn = jest.fn();

jest.mock("server-only", () => ({}));
jest.mock("@/lib/redis", () => ({
  redis: {
    incr: (...args: unknown[]) => mockIncr(...args),
    expire: (...args: unknown[]) => mockExpire(...args),
    zincrby: (...args: unknown[]) => mockZincrby(...args),
  },
}));
jest.mock("@/lib/logger", () => ({
  logWarn: (...args: unknown[]) => mockLogWarn(...args),
}));

import { countStreamSearch } from "@/lib/streamSearchCounters";

describe("countStreamSearch", () => {
  const day = new Date().toISOString().slice(0, 10);

  beforeEach(() => {
    jest.clearAllMocks();
    mockIncr.mockResolvedValue(1);
    mockExpire.mockResolvedValue(1);
    mockZincrby.mockResolvedValue(1);
  });

  it("writes the keys read by /api/stats, the admin table and trending", async () => {
    await countStreamSearch("DSS", "CDG");

    expect(mockIncr).toHaveBeenCalledWith(`keza:stats:searches:${day}`);
    expect(mockExpire).toHaveBeenCalledWith(`keza:stats:searches:${day}`, 30 * 24 * 60 * 60);
    expect(mockZincrby).toHaveBeenCalledWith(`keza:stats:routes:${day}`, 1, "DSS-CDG");
    expect(mockExpire).toHaveBeenCalledWith(`keza:stats:routes:${day}`, 7 * 24 * 60 * 60);
  });

  it("never fails the search when Redis does", async () => {
    mockIncr.mockRejectedValue(new Error("redis down"));

    await expect(countStreamSearch("DSS", "CDG")).resolves.toBeUndefined();
    expect(mockLogWarn).toHaveBeenCalled();
  });
});
