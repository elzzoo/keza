const mockCaptureEvent = jest.fn();

jest.mock("@sentry/nextjs", () => ({
  captureMessage: jest.fn(),
  captureEvent: (...args: unknown[]) => mockCaptureEvent(...args),
  getActiveSpan: () => null,
}));

import { summarizeSearchProviders, trackSearchPerformance } from "@/lib/performance";

describe("search performance attribution", () => {
  beforeEach(() => mockCaptureEvent.mockClear());

  it("uses actual result sources instead of partial status", () => {
    expect(summarizeSearchProviders(["AMADEUS", "TP", "SYNTHETIC"])).toEqual({
      provider: "mixed",
      duffelResultCount: 0,
      tpResultCount: 1,
    });
    expect(summarizeSearchProviders([]).provider).toBe("none");
  });

  it("does not emit invented supplier or cache timings", async () => {
    await trackSearchPerformance("CDG-DSS", {
      totalTime: 1200,
      providerSources: ["AMADEUS"],
      partial: true,
      totalResultCount: 1,
    });
    const event = mockCaptureEvent.mock.calls[0][0];
    expect(event.tags.provider).toBe("amadeus");
    expect(event.measurements.total_time.value).toBe(1200);
    expect(event.measurements).not.toHaveProperty("duffel_time");
    expect(event.measurements).not.toHaveProperty("tp_time");
    expect(event.measurements).not.toHaveProperty("cache_hit_time");
  });
});
