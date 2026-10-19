import { buildSearchCacheKey } from "@/lib/searchCacheKey";

const baseParams = {
  from: "DSS",
  to: "CDG",
  date: "2026-10-01",
  tripType: "roundtrip",
  returnDate: "2026-10-08",
  stops: "any",
  cabin: "business",
  passengers: 2,
};

describe("buildSearchCacheKey", () => {
  it("builds the canonical search cache key", () => {
    expect(buildSearchCacheKey("v31", { ...baseParams, userPrograms: [] }))
      .toMatch(/^keza:v31:DSS:CDG:2026-10-01:roundtrip:2026-10-08:any:business:2:[a-f0-9]{64}$/);
  });

  it("keeps an empty return date slot for one-way searches", () => {
    expect(buildSearchCacheKey("v31", {
      ...baseParams,
      tripType: "oneway",
      returnDate: undefined,
      stops: "direct",
      cabin: "economy",
      passengers: 1,
      userPrograms: [],
    })).toMatch(/^keza:v31:DSS:CDG:2026-10-01:oneway::direct:economy:1:[a-f0-9]{64}$/);
  });

  it("separates profiles while preserving program order", () => {
    const key = (userPrograms: string[]) =>
      buildSearchCacheKey("v31", { ...baseParams, userPrograms });

    expect(key(["Flying Blue"])).not.toBe(key(["Avios"]));
    expect(key(["Flying Blue", "Avios"])).not.toBe(key(["Avios", "Flying Blue"]));
    expect(key(["Flying Blue", "Avios"])).toBe(key(["Flying Blue", "Avios"]));
    expect(key([])).not.toBe("keza:v31:DSS:CDG:2026-10-01:roundtrip:2026-10-08:any:business:2");
  });

  it("does not collide when program names contain separators", () => {
    const key = (userPrograms: string[]) =>
      buildSearchCacheKey("v31", { ...baseParams, userPrograms });

    expect(key(["A:B", "C"])).not.toBe(key(["A", "B:C"]));
  });
});
