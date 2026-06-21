import {
  trackBaselineCpp,
  getBaselineHistory,
  detectCppImprovement,
  recordCppObservation,
  addFavoriteRoute,
  removeFavoriteRoute,
  getFavoriteRoutes,
} from "@/lib/alertsEngine";

describe("alertsEngine", () => {
  describe("trackBaselineCpp", () => {
    it("should store baseline CPP for a route+program", async () => {
      const key = "SIN:LAX:Singapore KrisFlyer";
      const cpp = 1.5;

      await trackBaselineCpp(key, cpp);
      const history = await getBaselineHistory(key);

      expect(history).toBeDefined();
      expect(history?.baseline).toBe(cpp);
      expect(history?.createdAt).toBeDefined();
    });

    it("should not overwrite existing baseline if newer than 24 hours old", async () => {
      const key = `NRT:LAX:ANA Mileage Club:${Date.now()}`;
      const baseline1 = 1.2;
      const baseline2 = 1.5;

      await trackBaselineCpp(key, baseline1);
      const first = await getBaselineHistory(key);

      // Immediate second call should not overwrite
      await trackBaselineCpp(key, baseline2);
      const second = await getBaselineHistory(key);

      expect(second?.baseline).toBe(baseline1); // Original retained
    });

    it("should overwrite baseline if older than 24 hours", async () => {
      const key = `DXB:LHR:Emirates Skywards:${Date.now()}`;
      const baseline1 = 1.0;
      const baseline2 = 2.0;

      const oldTime = new Date(Date.now() - 25 * 60 * 60 * 1000);
      await trackBaselineCpp(key, baseline1, oldTime);
      await trackBaselineCpp(key, baseline2);
      const history = await getBaselineHistory(key);

      expect(history?.baseline).toBe(baseline2);
    });
  });

  describe("detectCppImprovement", () => {
    it("should return true when CPP improves >10%", () => {
      const baseline = 1.0;
      const current = 1.15;
      expect(detectCppImprovement(baseline, current)).toBe(true);
    });

    it("should return false when CPP improves <10%", () => {
      const baseline = 1.0;
      const current = 1.08;
      expect(detectCppImprovement(baseline, current)).toBe(false);
    });

    it("should return true when CPP improves exactly 10%", () => {
      const baseline = 1.0;
      const current = 1.10;
      expect(detectCppImprovement(baseline, current)).toBe(true);
    });

    it("should return false when CPP degrades", () => {
      const baseline = 2.0;
      const current = 1.5;
      expect(detectCppImprovement(baseline, current)).toBe(false);
    });

    it("should return false for invalid baseline", () => {
      expect(detectCppImprovement(0, 1.5)).toBe(false);
      expect(detectCppImprovement(-1, 1.5)).toBe(false);
    });

    it("should return false for invalid current", () => {
      expect(detectCppImprovement(1.5, 0)).toBe(false);
      expect(detectCppImprovement(1.5, -1)).toBe(false);
    });

    it("should calculate improvement correctly for decimal values", () => {
      expect(detectCppImprovement(0.5, 0.55)).toBe(true); // 10%
      expect(detectCppImprovement(2.0, 2.19)).toBe(false); // 9.5%
      expect(detectCppImprovement(2.0, 2.21)).toBe(true); // 10.5%
    });
  });

  describe("recordCppObservation", () => {
    it("should trigger alert when new CPP >10% better than baseline", async () => {
      const key = `SIN:LAX:Singapore KrisFlyer:${Date.now()}`;
      await trackBaselineCpp(key, 1.0);

      const result = await recordCppObservation(key, 1.15);
      expect(result.triggered).toBe(true);
      expect(result.improvement).toBeCloseTo(0.15, 2);
    });

    it("should not trigger alert when improvement <10%", async () => {
      const key = `NRT:LAX:ANA Mileage Club:${Date.now()}`;
      await trackBaselineCpp(key, 1.0);

      const result = await recordCppObservation(key, 1.08);
      expect(result.triggered).toBe(false);
      expect(result.improvement).toBe(0);
    });

    it("should handle invalid routeKey gracefully", async () => {
      const history = await getBaselineHistory(`invalid:${Date.now()}`);
      expect(history).toBeNull();
    });

    it("should handle negative CPP values", () => {
      expect(detectCppImprovement(-1, 2.0)).toBe(false);
      expect(detectCppImprovement(1.0, -2.0)).toBe(false);
    });
  });

  describe("Favorite routes", () => {
    it("should add and retrieve favorite routes", async () => {
      const email = `user+${Date.now()}@example.com`;
      await addFavoriteRoute(email, "SIN", "LAX");
      await addFavoriteRoute(email, "NRT", "JFK");

      const routes = await getFavoriteRoutes(email);
      expect(routes).toContain("SIN:LAX");
      expect(routes).toContain("NRT:JFK");
    });

    it("should remove favorite routes", async () => {
      const email = `user2+${Date.now()}@example.com`;
      await addFavoriteRoute(email, "DXB", "LHR");
      await removeFavoriteRoute(email, "DXB", "LHR");

      const routes = await getFavoriteRoutes(email);
      expect(routes).not.toContain("DXB:LHR");
    });

    it("should handle case-insensitive email keys", async () => {
      const email = `test+${Date.now()}@EXAMPLE.COM`;
      await addFavoriteRoute(email, "sfo", "nyc");

      const lowerEmail = email.toLowerCase();
      const routes = await getFavoriteRoutes(lowerEmail);
      expect(routes).toContain("SFO:NYC");
    });
  });
});
