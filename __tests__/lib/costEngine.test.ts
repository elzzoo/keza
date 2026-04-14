// __tests__/lib/costEngine.test.ts
import { buildCostOptions } from "@/lib/costEngine";
import type { FlightInput } from "@/lib/costEngine";

const BASE_FLIGHT: FlightInput = {
  from: "DSS",
  to: "CDG",
  totalPrice: 1_200,
  airlines: ["Air France"],
  stops: 0,
  cabin: "business",
  tripType: "roundtrip",
  passengers: 2,
};

describe("buildCostOptions — smoke", () => {
  it("returns a CostComparison with cashTotal", () => {
    const result = buildCostOptions(BASE_FLIGHT, new Map());
    expect(result.cashTotal).toBe(1_200);
  });
});
