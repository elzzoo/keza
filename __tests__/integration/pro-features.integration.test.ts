/**
 * Integration test for Pro Trial (F2) and Pro Gating (F3) features
 * Verifies that trial is granted, features are gated correctly
 */

import { grantTrialIfNew, getTrialStatus, isProUser } from "@/lib/lemonsqueezy";
import { checkProAccess } from "@/lib/proAccess";
import { canAccessFeature } from "@/lib/proGating";
import { redis } from "@/lib/redis";

describe("Pro Features Integration (F2 + F3)", () => {
  const testEmail = `integration-test-${Date.now()}@example.com`;

  afterAll(async () => {
    // Cleanup
    await redis.del(`keza:pro:trial:${testEmail.toLowerCase()}`);
    await redis.del(`keza:pro:${testEmail.toLowerCase()}`);
  });

  describe("F2: 7-Day Pro Trial", () => {
    it("grants trial on first login", async () => {
      const granted = await grantTrialIfNew(testEmail);
      expect(granted).toBe(true);
    });

    it("does not re-grant trial to same user", async () => {
      const granted = await grantTrialIfNew(testEmail);
      expect(granted).toBe(false);
    });

    it("returns active Pro access status with trial", async () => {
      const status = await checkProAccess(testEmail);
      expect(status.hasTrial).toBe(true);
      expect(status.isActive).toBe(true);
      expect(status.daysLeft).toBeGreaterThan(0);
      expect(status.daysLeft).toBeLessThanOrEqual(7);
    });

    it("trial status includes expiry date", async () => {
      const trial = await getTrialStatus(testEmail);
      expect(trial).not.toBeNull();
      expect(trial?.expiresAt).toBeDefined();
      const expiresAt = new Date(trial!.expiresAt);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("F3: Pro Gating", () => {
    it("allows Pro features for trial users", async () => {
      const status = await checkProAccess(testEmail);

      const historyAccess = canAccessFeature("history-6mo", status);
      const multiPassengerAccess = canAccessFeature("multi-passenger-alerts", status);
      const unlimitedAlertsAccess = canAccessFeature("unlimited-alerts", status);

      expect(historyAccess.canAccess).toBe(true);
      expect(multiPassengerAccess.canAccess).toBe(true);
      expect(unlimitedAlertsAccess.canAccess).toBe(true);
    });

    it("gates Pro features for free users", async () => {
      // Create a user with no trial and no Pro subscription
      const freeUserEmail = `free-${Date.now()}@example.com`;
      const freeStatus = await checkProAccess(freeUserEmail);

      const historyAccess = canAccessFeature("history-6mo", freeStatus);
      const multiPassengerAccess = canAccessFeature("multi-passenger-alerts", freeStatus);
      const unlimitedAlertsAccess = canAccessFeature("unlimited-alerts", freeStatus);

      expect(historyAccess.canAccess).toBe(false);
      expect(historyAccess.reason).toBe("not-pro");
      expect(multiPassengerAccess.canAccess).toBe(false);
      expect(unlimitedAlertsAccess.canAccess).toBe(false);
    });
  });

  describe("Combined: Trial + Gating", () => {
    it("trial user has access to all Pro features", async () => {
      const status = await checkProAccess(testEmail);

      // Verify trial is active
      expect(status.hasTrial).toBe(true);
      expect(status.isActive).toBe(true);

      // Verify all features are accessible
      const features = ["history-6mo", "multi-passenger-alerts", "unlimited-alerts"] as const;
      features.forEach((feature) => {
        const access = canAccessFeature(feature, status);
        expect(access.canAccess).toBe(true);
        expect(access.reason).toBe("ok");
      });
    });
  });
});
