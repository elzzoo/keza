const mockRecordObservation = jest.fn();

jest.mock("@/lib/autoCalibrate", () => ({
  recordObservation: (...args: unknown[]) => mockRecordObservation(...args),
}));

import { recordHighConfidenceObservations } from "@/lib/engine/observations";
import type { FlightResult } from "@/lib/engine/types";

describe("recordHighConfidenceObservations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecordObservation.mockResolvedValue(undefined);
  });

  it("records only high-confidence observations with a usable best option", async () => {
    recordHighConfidenceObservations(
      [
        {
          cashCost: 1200,
          priceConfidence: "HIGH",
          bestOption: {
            program: "Flying Blue",
            taxes: 140,
            milesRequired: 55000,
          },
        },
        {
          cashCost: 900,
          priceConfidence: "LOW",
          bestOption: {
            program: "Singapore KrisFlyer",
            taxes: 90,
            milesRequired: 70000,
          },
        },
        {
          cashCost: 0,
          priceConfidence: "HIGH",
          bestOption: {
            program: "Avios",
            taxes: 50,
            milesRequired: 30000,
          },
        },
        {
          cashCost: 800,
          priceConfidence: "HIGH",
          bestOption: null,
        },
      ] as FlightResult[],
      { from: "CDG", to: "JFK", cabin: "business" },
    );

    await Promise.resolve();

    expect(mockRecordObservation).toHaveBeenCalledTimes(1);
    expect(mockRecordObservation).toHaveBeenCalledWith(
      "Flying Blue",
      1200,
      140,
      55000,
      "CDG-JFK",
      "business",
    );
  });
});
