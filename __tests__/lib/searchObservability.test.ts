const mockRedisIncr = jest.fn();
const mockRedisIncrby = jest.fn();
const mockRedisExpire = jest.fn();
const mockRedisZincrby = jest.fn();
const mockRedisGet = jest.fn();
const mockRedisZrange = jest.fn();
const mockLogWarn = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    incr: (...args: unknown[]) => mockRedisIncr(...args),
    incrby: (...args: unknown[]) => mockRedisIncrby(...args),
    expire: (...args: unknown[]) => mockRedisExpire(...args),
    zincrby: (...args: unknown[]) => mockRedisZincrby(...args),
    get: (...args: unknown[]) => mockRedisGet(...args),
    zrange: (...args: unknown[]) => mockRedisZrange(...args),
  },
}));

jest.mock("@/lib/logger", () => ({
  logWarn: (...args: unknown[]) => mockLogWarn(...args),
}));

import { getSearchObservabilitySummary, recordSearchObservability } from "@/lib/searchObservability";
import type { FlightResult } from "@/lib/engine";

describe("searchObservability", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisIncr.mockResolvedValue(1);
    mockRedisIncrby.mockResolvedValue(1);
    mockRedisExpire.mockResolvedValue(1);
    mockRedisZincrby.mockResolvedValue(1);
    mockRedisGet.mockResolvedValue(0);
    mockRedisZrange.mockResolvedValue([]);
  });

  it("records status, primary provider, result providers, latency, and route stats", async () => {
    await recordSearchObservability({
      from: "CDG",
      to: "DSS",
      results: [
        { source: "AMADEUS" } as FlightResult,
        { source: "TP" } as FlightResult,
        { source: "SYNTHETIC" } as FlightResult,
      ],
      partial: false,
      fromCache: false,
      responseTimeMs: 2400,
      date: new Date("2026-09-24T12:00:00Z"),
    });

    expect(mockRedisIncr).toHaveBeenCalledWith("keza:stats:search:status:2026-09-24:complete");
    expect(mockRedisIncr).toHaveBeenCalledWith("keza:stats:search:provider:primary:2026-09-24:amadeus");
    expect(mockRedisIncr).toHaveBeenCalledWith("keza:stats:search:latency:2026-09-24:1_3s");
    expect(mockRedisIncrby).toHaveBeenCalledWith("keza:stats:search:provider:results:2026-09-24:tp", 1);
    expect(mockRedisIncrby).toHaveBeenCalledWith("keza:stats:search:provider:results:2026-09-24:synthetic", 1);
    expect(mockRedisZincrby).toHaveBeenCalledWith("keza:stats:search:routes:2026-09-24", 1, "CDG-DSS");
    expect(mockRedisExpire).toHaveBeenCalled();
  });

  it("returns a bounded summary", async () => {
    mockRedisGet.mockImplementation(async (key: string) => {
      if (key.includes(":complete")) return 3;
      if (key.includes(":partial")) return 1;
      if (key.includes(":cache_hit")) return 2;
      return 0;
    });
    mockRedisZrange.mockResolvedValue(["CDG-DSS", 4]);

    const summary = await getSearchObservabilitySummary(1);

    expect(summary.days).toHaveLength(1);
    expect(summary.totals).toEqual({ searches: 6, partial: 1, cacheHits: 2, empty: 0 });
    expect(summary.days[0].topRoutes).toEqual([{ route: "CDG-DSS", count: 4 }]);
  });
});
