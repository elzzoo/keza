const mockScoreFlights = jest.fn();
const mockLogWarn = jest.fn();

jest.mock("@/lib/config", () => ({
  ENABLE_P5_2_SOFT_LAUNCH: true,
  P5_2_BASELINE_ONLY: false,
}));

jest.mock("@/lib/scoring/scoringEngine", () => ({
  scoreFlights: (...args: unknown[]) => mockScoreFlights(...args),
}));

jest.mock("@/lib/logger", () => ({
  logWarn: (...args: unknown[]) => mockLogWarn(...args),
}));

import { applyP52Scoring } from "@/lib/engine/scoring";
import type { FlightResult } from "@/lib/engine/types";

describe("applyP52Scoring", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("scores and sorts results when baseline mode is off", async () => {
    const flights = [
      { airlines: ["Low Score Air"] },
      { airlines: ["High Score Air"] },
    ] as FlightResult[];

    mockScoreFlights.mockImplementation(async (results) =>
      results.map((result: { airlines: string[] }) => ({
        ...result,
        scoringResult: {
          overallScore: result.airlines.includes("High Score Air") ? 95 : 20,
          breakdown: { cabin: 0, accessibility: 0, price: 0, connections: 0, layover: 0, carrier: 0 },
          reasoning: "test score",
        },
      })),
    );

    const scored = await applyP52Scoring(flights);

    expect(mockScoreFlights).toHaveBeenCalledWith(flights, "", expect.any(Date));
    expect(scored[0].airlines).toEqual(["High Score Air"]);
    expect(scored[0].scoringResult?.overallScore).toBe(95);
    expect(scored[1].scoringResult?.overallScore).toBe(20);
  });

  it("skips already scored cache entries when requested", async () => {
    const flights = [
      {
        airlines: ["Cached Air"],
        scoringResult: {
          overallScore: 81,
          breakdown: { cabin: 0, accessibility: 0, price: 0, connections: 0, layover: 0, carrier: 0 },
          reasoning: "cached score",
        },
      },
    ] as FlightResult[];

    const scored = await applyP52Scoring(flights, { skipIfAlreadyScored: true });

    expect(scored).toBe(flights);
    expect(mockScoreFlights).not.toHaveBeenCalled();
  });

  it("keeps original ranking if scoring fails", async () => {
    const flights = [{ airlines: ["Original Air"] }] as FlightResult[];
    mockScoreFlights.mockRejectedValue(new Error("boom"));

    const scored = await applyP52Scoring(flights, { logPrefix: "[test]" });

    expect(scored).toBe(flights);
    expect(mockLogWarn).toHaveBeenCalledWith(
      "[test] P5.2 scoring failed, keeping cost-based ranking: Error: boom",
    );
  });
});
