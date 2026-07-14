import { buildAviasalesUrl } from "../../lib/engine/travelpayouts";

describe("Aviasales URL generation", () => {
  it("generates correct oneway URL (CDG→JFK, 2026-08-01, 1 pax, economy)", () => {
    const url = buildAviasalesUrl("CDG", "JFK", "2026-08-01", undefined, 1);
    expect(url).toContain("CDG20260801JFK");
    expect(url).toContain("passengers=1");
    expect(url).toContain("class=economy");
    expect(url).toContain("marker=714947");
    expect(url).not.toContain("CDG1"); // passenger count should not be in path
  });

  it("generates correct roundtrip URL (SIN→LAX, 2026-08-01 to 2026-08-15, 2 pax, business)", () => {
    const url = buildAviasalesUrl("SIN", "LAX", "2026-08-01", "2026-08-15", 2, "business");
    expect(url).toContain("SIN20260801LAX20260815");
    expect(url).toContain("passengers=2");
    expect(url).toContain("class=business");
    expect(url).toContain("marker=714947");
    // Verify old format is gone: no "SIN20260801LAX20260815SIN2" pattern
    expect(url).not.toContain("LAX20260815SIN2");
  });

  it("formats date correctly (removes dashes)", () => {
    const url = buildAviasalesUrl("CDG", "JFK", "2026-08-01", undefined, 1);
    expect(url).toContain("20260801");
    expect(url).not.toContain("2026-08-01");
  });

  it("generates correct oneway URL with multiple passengers", () => {
    const url = buildAviasalesUrl("LAX", "SFO", "2026-06-15", undefined, 3);
    expect(url).toContain("LAX20260615SFO");
    expect(url).toContain("passengers=3");
    expect(url).toContain("marker=714947");
  });

  it("generates correct roundtrip URL with return date", () => {
    const url = buildAviasalesUrl("JFK", "LHR", "2026-07-10", "2026-07-20", 1);
    expect(url).toContain("JFK20260710LHR20260720");
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
});
