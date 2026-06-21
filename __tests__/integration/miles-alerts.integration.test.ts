import {
  createAlert,
  getAlertsByEmail,
  deactivateAlert,
  PriceAlert,
} from "@/lib/alerts";
import {
  trackBaselineCpp,
  recordCppObservation,
  addFavoriteRoute,
  getFavoriteRoutes,
} from "@/lib/alertsEngine";

describe("Miles alerts E2E flow", () => {
  const testEmail = `test-miles-${Date.now()}@example.com`;
  const routeKey = `SIN:LAX:Singapore KrisFlyer:${Date.now()}`;

  beforeEach(async () => {
    // Clear any existing alerts for test email
    const existing = await getAlertsByEmail(testEmail);
    for (const alert of existing) {
      await deactivateAlert(alert.id);
    }
  });

  it("should create miles alert and trigger on >10% CPP improvement", async () => {
    // 1. User creates miles alert at baseline CPP 1.2
    const alert = await createAlert({
      email: testEmail,
      from: "SIN",
      to: "LAX",
      cabin: "business",
      currentPrice: 2000,
      milesAlert: {
        program: "Singapore KrisFlyer",
        targetCpp: 1.5,
        baseCpp: 1.2,
      },
    });

    expect(alert.milesAlert).toBeDefined();
    expect(alert.milesAlert!.baseCpp).toBe(1.2);
    expect(alert.milesAlert!.program).toBe("Singapore KrisFlyer");

    // 2. Establish baseline in engine
    await trackBaselineCpp(routeKey, 1.2);

    // 3. Simulate next day: CPP improves to 1.38 (+15%)
    const observation = await recordCppObservation(routeKey, 1.38);

    expect(observation.triggered).toBe(true);
    expect(observation.improvement).toBeCloseTo(0.15, 2);

    // 4. Verify alert still active
    const updated = await getAlertsByEmail(testEmail);
    const foundAlert = updated.find((a) => a.id === alert.id);
    expect(foundAlert).toBeDefined();
    expect(foundAlert!.active).toBe(true);
  });

  it("should not trigger if improvement <10%", async () => {
    const alert = await createAlert({
      email: testEmail,
      from: "NRT",
      to: "LAX",
      cabin: "economy",
      currentPrice: 800,
      milesAlert: {
        program: "ANA Mileage Club",
        targetCpp: 1.2,
        baseCpp: 1.0,
      },
    });

    expect(alert.milesAlert).toBeDefined();

    const routeKey2 = `NRT:LAX:ANA Mileage Club:${Date.now()}`;
    await trackBaselineCpp(routeKey2, 1.0);

    // Only 8% improvement
    const observation = await recordCppObservation(routeKey2, 1.08);

    expect(observation.triggered).toBe(false);
    expect(observation.improvement).toBeLessThan(0.10);

    // Verify alert is still active
    const updated = await getAlertsByEmail(testEmail);
    const foundAlert = updated.find((a) => a.id === alert.id);
    expect(foundAlert).toBeDefined();
    expect(foundAlert!.active).toBe(true);
  });

  it("should support multiple routes for same user", async () => {
    const alert1 = await createAlert({
      email: testEmail,
      from: "SIN",
      to: "LAX",
      cabin: "business",
      currentPrice: 2000,
      milesAlert: {
        program: "Singapore KrisFlyer",
        targetCpp: 1.5,
        baseCpp: 1.2,
      },
    });

    const alert2 = await createAlert({
      email: testEmail,
      from: "NRT",
      to: "JFK",
      cabin: "economy",
      currentPrice: 1200,
      milesAlert: {
        program: "ANA Mileage Club",
        targetCpp: 1.2,
        baseCpp: 1.0,
      },
    });

    const userAlerts = await getAlertsByEmail(testEmail);
    const activeCount = userAlerts.filter((a) => a.active).length;

    expect(activeCount).toBeGreaterThanOrEqual(2);
    expect(userAlerts.some((a) => a.id === alert1.id)).toBe(true);
    expect(userAlerts.some((a) => a.id === alert2.id)).toBe(true);
  });

  it("should track baseline and multiple observations", async () => {
    const key = `DXB:LHR:Emirates Skywards:${Date.now()}`;

    // Record baseline
    await trackBaselineCpp(key, 1.0);
    let history = await recordCppObservation(key, 1.0);
    expect(history.triggered).toBe(false);

    // First observation: 5% improvement (no trigger)
    history = await recordCppObservation(key, 1.05);
    expect(history.triggered).toBe(false);

    // Second observation: 15% improvement (trigger)
    history = await recordCppObservation(key, 1.15);
    expect(history.triggered).toBe(true);
    expect(history.improvement).toBeCloseTo(0.15, 2);
  });

  it("should handle favorite routes tracking", async () => {
    const email = `fav-test-${Date.now()}@example.com`;

    // Add favorite routes
    await addFavoriteRoute(email, "SIN", "LAX");
    await addFavoriteRoute(email, "NRT", "JFK");
    await addFavoriteRoute(email, "CDG", "LHR");

    // Retrieve and verify
    const routes = await getFavoriteRoutes(email);
    expect(routes).toHaveLength(3);
    expect(routes).toContain("SIN:LAX");
    expect(routes).toContain("NRT:JFK");
    expect(routes).toContain("CDG:LHR");
  });

  it("should maintain different programs per route", async () => {
    const baseCpp = 1.0;
    const route = `SIN:LAX:${Date.now()}`;

    // Track baselines for different programs on same route
    const key1 = `${route}:Singapore KrisFlyer`;
    const key2 = `${route}:ANA Mileage Club`;

    await trackBaselineCpp(key1, 1.0);
    await trackBaselineCpp(key2, 1.5);

    // Observe improvements independently
    const obs1 = await recordCppObservation(key1, 1.15); // 15% improvement
    const obs2 = await recordCppObservation(key2, 1.60); // ~6.7% improvement

    expect(obs1.triggered).toBe(true);
    expect(obs2.triggered).toBe(false);
  });

  it("should handle precise 10% threshold", async () => {
    const key = `TEST:ROUTE:Program:${Date.now()}`;

    await trackBaselineCpp(key, 1.0);

    // 9.9% improvement - should not trigger
    const below = await recordCppObservation(key, 1.099);
    expect(below.triggered).toBe(false);

    // Reset for next test
    const key2 = `TEST:ROUTE:Program2:${Date.now()}`;
    await trackBaselineCpp(key2, 1.0);

    // Exactly 10% improvement - should trigger
    const exact = await recordCppObservation(key2, 1.10);
    expect(exact.triggered).toBe(true);

    // Reset for next test
    const key3 = `TEST:ROUTE:Program3:${Date.now()}`;
    await trackBaselineCpp(key3, 1.0);

    // 10.1% improvement - should trigger
    const above = await recordCppObservation(key3, 1.101);
    expect(above.triggered).toBe(true);
  });

  it("should survive deactivation and reactivation", async () => {
    const alert = await createAlert({
      email: testEmail,
      from: "LAX",
      to: "CDG",
      cabin: "business",
      currentPrice: 3000,
      milesAlert: {
        program: "Delta SkyMiles",
        targetCpp: 1.8,
        baseCpp: 1.5,
      },
    });

    expect(alert.active).toBe(true);

    // Deactivate
    await deactivateAlert(alert.id);
    let userAlerts = await getAlertsByEmail(testEmail);
    let found = userAlerts.find((a) => a.id === alert.id);
    expect(found).toBeUndefined();

    // Create new alert (re-activation)
    const newAlert = await createAlert({
      email: testEmail,
      from: "LAX",
      to: "CDG",
      cabin: "business",
      currentPrice: 3000,
      milesAlert: {
        program: "Delta SkyMiles",
        targetCpp: 1.8,
        baseCpp: 1.5,
      },
    });

    userAlerts = await getAlertsByEmail(testEmail);
    found = userAlerts.find((a) => a.id === newAlert.id);
    expect(found).toBeDefined();
    expect(found!.active).toBe(true);
  });
});
