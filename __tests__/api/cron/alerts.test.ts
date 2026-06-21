import {
  recordCppObservation,
  trackBaselineCpp,
} from "@/lib/alertsEngine";

describe("cron/alerts — miles alert detection", () => {
  it("should detect >10% CPP improvement on cron run", async () => {
    const routeKey = `SIN:LAX:Singapore KrisFlyer:${Date.now()}`;

    // Establish baseline
    await trackBaselineCpp(routeKey, 1.0);

    // Next day: CPP improves 15%
    const result = await recordCppObservation(routeKey, 1.15);

    expect(result.triggered).toBe(true);
    expect(result.improvement).toBeCloseTo(0.15, 2);
  });

  it("should not alert if CPP improvement <10%", async () => {
    const routeKey = `NRT:LAX:ANA Mileage Club:${Date.now()}`;

    await trackBaselineCpp(routeKey, 1.0);
    const result = await recordCppObservation(routeKey, 1.08);

    expect(result.triggered).toBe(false);
  });

  it("should calculate exact improvement thresholds", async () => {
    const routeKey = `DXB:LHR:Emirates:${Date.now()}`;

    await trackBaselineCpp(routeKey, 1.0);

    // Just below 10%
    const below10 = await recordCppObservation(routeKey, 1.099);
    expect(below10.triggered).toBe(false);

    // Reset and test exactly 10%
    const key2 = `DXB:LHR:Emirates:${Date.now()}-2`;
    await trackBaselineCpp(key2, 1.0);
    const exactly10 = await recordCppObservation(key2, 1.10);
    expect(exactly10.triggered).toBe(true);

    // Just above 10%
    const key3 = `DXB:LHR:Emirates:${Date.now()}-3`;
    await trackBaselineCpp(key3, 1.0);
    const above10 = await recordCppObservation(key3, 1.101);
    expect(above10.triggered).toBe(true);
  });

  it("should handle zero and negative CPP values gracefully", async () => {
    const routeKey = `BAD:ROUTE:${Date.now()}`;

    await trackBaselineCpp(routeKey, 0);
    const result = await recordCppObservation(routeKey, 1.5);

    expect(result.triggered).toBe(false);
    expect(result.improvement).toBe(0);
  });

  it("should not trigger on degraded CPP", async () => {
    const routeKey = `DXB:CDG:Skywards:${Date.now()}`;

    await trackBaselineCpp(routeKey, 2.0);
    const result = await recordCppObservation(routeKey, 1.5);

    expect(result.triggered).toBe(false);
  });
});
