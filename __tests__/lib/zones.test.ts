// __tests__/lib/zones.test.ts
import { getZone } from "@/lib/zones";

describe("getZone", () => {
  it("returns AFRICA_WEST for Dakar DSS", () => {
    expect(getZone("DSS")).toBe("AFRICA_WEST");
  });
  it("returns AFRICA_WEST for Lagos LOS", () => {
    expect(getZone("LOS")).toBe("AFRICA_WEST");
  });
  it("returns EUROPE for Paris CDG", () => {
    expect(getZone("CDG")).toBe("EUROPE");
  });
  it("returns EUROPE for London LHR", () => {
    expect(getZone("LHR")).toBe("EUROPE");
  });
  it("returns NORTH_AMERICA for New York JFK", () => {
    expect(getZone("JFK")).toBe("NORTH_AMERICA");
  });
  it("returns MIDDLE_EAST for Dubai DXB", () => {
    expect(getZone("DXB")).toBe("MIDDLE_EAST");
  });
  it("returns AFRICA_EAST for Nairobi NBO", () => {
    expect(getZone("NBO")).toBe("AFRICA_EAST");
  });
  it("returns AFRICA_SOUTH for Johannesburg JNB", () => {
    expect(getZone("JNB")).toBe("AFRICA_SOUTH");
  });
  it("returns null for unknown airport", () => {
    expect(getZone("XYZ")).toBeNull();
  });
  it("is case-insensitive", () => {
    expect(getZone("dss")).toBe("AFRICA_WEST");
    expect(getZone("cdg")).toBe("EUROPE");
  });
  it("handles mixed case input", () => {
    expect(getZone("Dss")).toBe("AFRICA_WEST");
    expect(getZone("cDG")).toBe("EUROPE");
  });
});
