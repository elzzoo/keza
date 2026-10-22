import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("flight result seat-map contract", () => {
  const cardSource = readFileSync(join(process.cwd(), "components/FlightCard.tsx"), "utf8");

  it("does not fetch availability for an aircraft absent from FlightResult", () => {
    expect(cardSource).not.toContain("querySeatAvailability");
    expect(cardSource).not.toContain('"B787"');
  });

  it("does not render estimated seat counts as flight-specific availability", () => {
    expect(cardSource).not.toContain("percentAvailable");
    expect(cardSource).not.toContain("seatMap.available");
  });
});
