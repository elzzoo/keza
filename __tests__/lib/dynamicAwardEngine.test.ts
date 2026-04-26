import { estimateMilesRequired } from "@/lib/dynamicAwardEngine";

describe("estimateMilesRequired — zone-pair caps", () => {
  // CDG (48.85, 2.35) → NRT (35.77, 140.39) = ~9,714 km
  // SkyTeam at 7.5/km = 72,855 miles — must be capped at 45,000
  it("caps EUROPE→ASIA economy at 45,000 one-way", () => {
    const est = estimateMilesRequired(
      "Flying Club",
      "SkyTeam",
      48.85, 2.35,   // CDG
      35.77, 140.39, // NRT
      "economy",
      "oneway",
      1,
      "EUROPE",
      "ASIA",
    );
    expect(est.milesRequired).toBeLessThanOrEqual(45_000);
  });

  it("caps EUROPE→NORTH_AMERICA economy at 35,000 one-way", () => {
    const est = estimateMilesRequired(
      "LifeMiles",
      "Star Alliance",
      48.85, 2.35,    // CDG
      40.71, -74.01,  // JFK
      "economy",
      "oneway",
      1,
      "EUROPE",
      "NORTH_AMERICA",
    );
    expect(est.milesRequired).toBeLessThanOrEqual(35_000);
  });

  it("caps EUROPE→MIDDLE_EAST economy at 20,000 one-way", () => {
    const est = estimateMilesRequired(
      "LifeMiles",
      "Star Alliance",
      48.85, 2.35,    // CDG
      25.25, 55.36,   // DXB
      "economy",
      "oneway",
      1,
      "EUROPE",
      "MIDDLE_EAST",
    );
    expect(est.milesRequired).toBeLessThanOrEqual(20_000);
  });

  it("doubles miles for roundtrip", () => {
    const ow = estimateMilesRequired("LifeMiles", "Star Alliance", 48.85, 2.35, 40.71, -74.01, "economy", "oneway", 1, "EUROPE", "NORTH_AMERICA");
    const rt = estimateMilesRequired("LifeMiles", "Star Alliance", 48.85, 2.35, 40.71, -74.01, "economy", "roundtrip", 1, "EUROPE", "NORTH_AMERICA");
    expect(rt.milesRequired).toBe(ow.milesRequired * 2);
  });
});
