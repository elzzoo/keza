import { buildSearchCacheKey } from "@/lib/searchCacheKey";

describe("buildSearchCacheKey", () => {
  it("builds the canonical search cache key", () => {
    expect(
      buildSearchCacheKey("v30", {
        from: "DSS",
        to: "CDG",
        date: "2026-10-01",
        tripType: "roundtrip",
        returnDate: "2026-10-08",
        stops: "any",
        cabin: "business",
        passengers: 2,
      }),
    ).toBe("keza:v30:DSS:CDG:2026-10-01:roundtrip:2026-10-08:any:business:2");
  });

  it("keeps an empty return date slot for one-way searches", () => {
    expect(
      buildSearchCacheKey("v30", {
        from: "DSS",
        to: "CDG",
        date: "2026-10-01",
        tripType: "oneway",
        stops: "direct",
        cabin: "economy",
        passengers: 1,
      }),
    ).toBe("keza:v30:DSS:CDG:2026-10-01:oneway::direct:economy:1");
  });
});
