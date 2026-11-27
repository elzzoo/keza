import { resolveCardMarket } from "@/lib/cardMarket";
import { calculateAcquisitionCost } from "@/lib/milesAcquisition";
import { buildCostOptions } from "@/lib/costComparisonEngine";
import { buildSearchCacheKey } from "@/lib/searchCacheKey";
import { parseSearchParams } from "@/lib/searchInput";

jest.mock("@/lib/logger");

const US_BANK = /Chase|Amex|Citi|Capital One|Bilt|Brex|Wells Fargo/;
const flight = {
  from: "CDG", to: "JFK", totalPrice: 900, airlines: ["Air France"],
  stops: 0, cabin: "economy" as const, tripType: "oneway" as const, passengers: 1,
};

describe("card market", () => {
  it("explicit choice wins over the country", () => {
    expect(resolveCardMarket("US", "FR")).toBe("US");
    expect(resolveCardMarket("OTHER", "US")).toBe("OTHER");
    expect(resolveCardMarket(undefined, "SN")).toBe("OTHER");
    expect(resolveCardMarket(undefined, "us")).toBe("US");
    expect(resolveCardMarket("nonsense", null)).toBe("US");
  });

  it("never proposes a US bank card outside the US", () => {
    const vias = (market: "US" | "OTHER") =>
      buildCostOptions({ ...flight, cardMarket: market }, new Map()).milesOptions.map((o) => o.via ?? "");
    expect(vias("US").some((v) => US_BANK.test(v))).toBe(true);
    expect(vias("OTHER").some((v) => US_BANK.test(v))).toBe(false);
    expect(calculateAcquisitionCost("Flying Blue", 25_000, "OTHER").paths.some((p) => US_BANK.test(p.source))).toBe(false);
  });

  it("keeps a separate cache entry outside the US", () => {
    const params = { from: "CDG", to: "JFK", date: "2027-01-10", tripType: "oneway", stops: "any", cabin: "economy", passengers: 1, userPrograms: [] };
    const us = buildSearchCacheKey("v", { ...params, cardMarket: "US" });
    expect(us).toBe(buildSearchCacheKey("v", params));
    expect(buildSearchCacheKey("v", { ...params, cardMarket: "OTHER" })).not.toBe(us);
  });

  it("accepts only known values from the request", () => {
    const body = { from: "CDG", to: "JFK", date: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10) };
    const parsed = (cardMarket: string) => parseSearchParams({ ...body, cardMarket: cardMarket as never });
    expect(parsed("OTHER")).toMatchObject({ ok: true, params: { cardMarket: "OTHER" } });
    expect(parsed("xx")).toMatchObject({ ok: true, params: { cardMarket: undefined } });
  });
});
