/**
 * Xalifly Pro feature gating
 * Determines which features are available based on Pro subscription status
 */

import type { ProAccessStatus } from "@/lib/proAccess";

export type ProFeature = "history-6mo" | "multi-passenger-alerts" | "unlimited-alerts";

export interface FeatureAccess {
  canAccess: boolean;
  reason?: string; // "trial-expired" | "not-pro" | "ok"
}

/**
 * Check if a user can access a specific Pro feature
 * @param feature - The feature to check access for
 * @param proStatus - The user's Pro access status
 * @returns Whether the user can access the feature
 */
export function canAccessFeature(
  feature: ProFeature,
  proStatus: ProAccessStatus
): FeatureAccess {
  // If user is not Pro or on trial, they cannot access Pro features
  if (!proStatus.isActive) {
    return {
      canAccess: false,
      reason: "not-pro",
    };
  }

  // If user is on an expired trial, they cannot access Pro features
  if (proStatus.hasTrial && proStatus.daysLeft !== null && proStatus.daysLeft <= 0) {
    return {
      canAccess: false,
      reason: "trial-expired",
    };
  }

  // All Pro features are available to:
  // 1. Paid Pro subscribers
  // 2. Users with an active trial (daysLeft > 0)
  return {
    canAccess: true,
    reason: "ok",
  };
}

/**
 * Map feature to human-readable name (for UI display)
 */
export function getFeatureName(feature: ProFeature): string {
  const names: Record<ProFeature, string> = {
    "history-6mo": "6-month price history",
    "multi-passenger-alerts": "Multi-passenger alerts",
    "unlimited-alerts": "Unlimited alerts",
  };
  return names[feature] ?? "Unknown feature";
}

/**
 * Map feature to upgrade CTA text
 */
export function getFeatureUpgradeText(feature: ProFeature): string {
  const texts: Record<ProFeature, string> = {
    "history-6mo": "Upgrade to Xalifly Pro to see 6-month price history",
    "multi-passenger-alerts": "Upgrade to Xalifly Pro to set multi-passenger alerts",
    "unlimited-alerts": "Upgrade to Xalifly Pro for unlimited alerts",
  };
  return texts[feature] ?? "Upgrade to Xalifly Pro";
}
