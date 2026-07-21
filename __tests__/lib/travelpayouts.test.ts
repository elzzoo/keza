import { buildAviasalesUrl } from "../../lib/engine/travelpayouts";

// Regression guard for a production audit finding: Aviasales' /search path
// parser expects DDMM (day + month, 4 digits, NO year) per date segment.
// The previous format used the full ISO date with dashes stripped
// (YYYYMMDD, 8 digits) — this silently failed to parse on Aviasales' side:
// the origin airport still matched (via the leading 3-letter code), but the
// destination airport AND both dates were dropped, landing users on
// "Oops, the search failed to launch." Verified live against aviasales.com:
// /search/DSS20260820CDG20260827 → broken; /search/DSS2008CDG2708 → launches
// a correct DSS→CDG, Aug 20–27 search.
describe("Aviasales URL generation", () => {
  it("generates correct oneway URL (CDG→JFK, 2026-08-01, 1 pax, economy)", () => {
    const url = buildAviasalesUrl("CDG", "JFK", "2026-08-01", undefined, 1);
    expect(url).toContain("CDG0108JFK"); // DDMM, not YYYYMMDD
    expect(url).toContain("passengers=1");
    expect(url).toContain("class=economy");
    expect(url).toContain("marker=714947");
    expect(url).not.toContain("CDG1"); // passenger count should not be in path
    expect(url).not.toContain("20260801"); // guard against regressing to YYYYMMDD
  });

  it("generates correct roundtrip URL (SIN→LAX, 2026-08-01 to 2026-08-15, 2 pax, business)", () => {
    const url = buildAviasalesUrl("SIN", "LAX", "2026-08-01", "2026-08-15", 2, "business");
    expect(url).toContain("SIN0108LAX1508");
    expect(url).toContain("passengers=2");
    expect(url).toContain("class=business");
    expect(url).toContain("marker=714947");
    expect(url).not.toContain("2026");
  });

  it("formats date as DDMM (day + month, no year, no dashes)", () => {
    const url = buildAviasalesUrl("CDG", "JFK", "2026-08-01", undefined, 1);
    expect(url).toContain("0108");
    expect(url).not.toContain("2026-08-01");
    expect(url).not.toContain("20260801");
  });

  it("generates correct oneway URL with multiple passengers", () => {
    const url = buildAviasalesUrl("LAX", "SFO", "2026-06-15", undefined, 3);
    expect(url).toContain("LAX1506SFO");
    expect(url).toContain("passengers=3");
    expect(url).toContain("marker=714947");
  });

  it("generates correct roundtrip URL with return date", () => {
    const url = buildAviasalesUrl("JFK", "LHR", "2026-07-10", "2026-07-20", 1);
    expect(url).toContain("JFK1007LHR2007");
    expect(url).toContain("passengers=1");
    expect(url).toContain("class=economy");
    expect(url).toContain("marker=714947");
  });

  it("supports different cabin classes", () => {
    const economyUrl = buildAviasalesUrl("CDG", "JFK", "2026-08-01", undefined, 1, "economy");
    const businessUrl = buildAviasalesUrl("CDG", "JFK", "2026-08-01", undefined, 1, "business");
    const firstUrl = buildAviasalesUrl("CDG", "JFK", "2026-08-01", undefined, 1, "first");

    expect(economyUrl).toContain("class=economy");
    expect(businessUrl).toContain("class=business");
    expect(firstUrl).toContain("class=first");
  });

  it("pads single-digit day/month to 2 digits (Aviasales requires fixed-width DDMM)", () => {
    const url = buildAviasalesUrl("CDG", "JFK", "2026-01-05", undefined, 1);
    expect(url).toContain("CDG0501JFK"); // day=05, month=01 — not "51" or "15"
  });
});
