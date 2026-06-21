/**
 * Unit tests for Pro feature gating
 */

import { canAccessFeature, getFeatureName, getFeatureUpgradeText } from "@/lib/proGating";
import type { ProAccessStatus } from "@/lib/proAccess";

describe("canAccessFeature", () => {
  const freeUser: ProAccessStatus = {
    isPro: false,
    hasTrial: false,
    daysLeft: null,
    isActive: false,
  };

  const paidUser: ProAccessStatus = {
    isPro: true,
    hasTrial: false,
    daysLeft: null,
    isActive: true,
  };

  const trialUser: ProAccessStatus = {
    isPro: false,
    hasTrial: true,
    daysLeft: 5,
    isActive: true,
  };

  const expiredTrialUser: ProAccessStatus = {
    isPro: false,
    hasTrial: true,
    daysLeft: 0,
    isActive: true, // Still marked as having trial, but daysLeft = 0
  };

  it("denies access to free users", () => {
    const result = canAccessFeature("history-6mo", freeUser);
    expect(result.canAccess).toBe(false);
    expect(result.reason).toBe("not-pro");
  });

  it("allows access to paid Pro users", () => {
    const result = canAccessFeature("history-6mo", paidUser);
    expect(result.canAccess).toBe(true);
    expect(result.reason).toBe("ok");
  });

  it("allows access to active trial users", () => {
    const result = canAccessFeature("history-6mo", trialUser);
    expect(result.canAccess).toBe(true);
    expect(result.reason).toBe("ok");
  });

  it("denies access to expired trial users", () => {
    const result = canAccessFeature("history-6mo", expiredTrialUser);
    expect(result.canAccess).toBe(false);
    expect(result.reason).toBe("trial-expired");
  });

  it("applies same rules to all Pro features", () => {
    const features = ["history-6mo", "multi-passenger-alerts", "unlimited-alerts"] as const;
    features.forEach((feature) => {
      const paidResult = canAccessFeature(feature, paidUser);
      const trialResult = canAccessFeature(feature, trialUser);
      const freeResult = canAccessFeature(feature, freeUser);

      expect(paidResult.canAccess).toBe(true);
      expect(trialResult.canAccess).toBe(true);
      expect(freeResult.canAccess).toBe(false);
    });
  });
});

describe("getFeatureName", () => {
  it("returns human-readable names for features", () => {
    expect(getFeatureName("history-6mo")).toBe("6-month price history");
    expect(getFeatureName("multi-passenger-alerts")).toBe("Multi-passenger alerts");
    expect(getFeatureName("unlimited-alerts")).toBe("Unlimited alerts");
  });
});

describe("getFeatureUpgradeText", () => {
  it("returns upgrade CTA text for features", () => {
    expect(getFeatureUpgradeText("history-6mo")).toContain("6-month price history");
    expect(getFeatureUpgradeText("multi-passenger-alerts")).toContain("multi-passenger alerts");
    expect(getFeatureUpgradeText("unlimited-alerts")).toContain("unlimited alerts");
  });
});
