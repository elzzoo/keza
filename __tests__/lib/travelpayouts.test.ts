import { buildAviasalesUrl } from "../../lib/engine/travelpayouts";

describe("Aviasales URL generation", () => {
  it("generates correct oneway URL (CDG→JFK, 2026-08-01, 1 pax)", () => {
    const url = buildAviasalesUrl("CDG", "JFK", "2026-08-01", undefined, 1);
    expect(url).toContain("CDG");
    expect(url).toContain("JFK");
    expect(url).toContain("20260801");
    expect(url).toContain("1");
    expect(url).not.toContain("CDG1");
    expect(url).toContain("marker=714947");
  });

  it("generates correct roundtrip URL (SIN→LAX, 2026-08-01 to 2026-08-15, 2 pax)", () => {
    const url = buildAviasalesUrl("SIN", "LAX", "2026-08-01", "2026-08-15", 2);
    expect(url).toContain("SIN");
    expect(url).toContain("LAX");
    expect(url).toContain("20260801");
    expect(url).toContain("20260815");
    expect(url).toContain("SIN"); // Should return to origin, not to LAX
    expect(url).toContain("2");
    expect(url).toContain("marker=714947");
    // Verify the exact format: SIN20260801LAX20260815SIN2
    expect(url).toContain("SIN20260801LAX20260815SIN2");
  });

  it("formats date correctly (removes dashes)", () => {
    const url = buildAviasalesUrl("CDG", "JFK", "2026-08-01", undefined, 1);
    expect(url).toContain("20260801");
    expect(url).not.toContain("2026-08-01");
  });

  it("generates correct oneway URL with multiple passengers", () => {
    const url = buildAviasalesUrl("LAX", "SFO", "2026-06-15", undefined, 3);
    expect(url).toContain("LAX20260615SFO3");
    expect(url).toContain("marker=714947");
  });

  it("generates correct roundtrip URL with return date", () => {
    const url = buildAviasalesUrl("JFK", "LHR", "2026-07-10", "2026-07-20", 1);
    expect(url).toContain("JFK20260710LHR20260720JFK1");
    expect(url).toContain("marker=714947");
  });
});
