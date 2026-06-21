import "server-only";
import * as Sentry from "@sentry/nextjs";
import { logError } from "@/lib/logger";

/**
 * Track when a trial user converts to a paying customer
 * Called when: subscription_created webhook fires from LemonSqueezy
 */
export async function trackTrialConversion(
  email: string,
  plan: "PRO" | "PREMIUM" = "PRO",
  source: string = "other"
): Promise<void> {
  try {
    // Normalize source to valid enum value
    let normalizedSource: "trial_reminder" | "landing" | "search" | "other" = "other";
    if (
      source === "trial_reminder" ||
      source === "landing" ||
      source === "search"
    ) {
      normalizedSource = source;
    }

    // Send to Plausible Analytics
    await trackPlausibleEvent("trial_conversion", {
      plan,
      source: normalizedSource,
    });

    // Log to Sentry for revenue tracking
    Sentry.captureMessage("Trial user converted to paying", {
      level: "info",
      tags: {
        event_type: "trial_conversion",
        plan,
        source: normalizedSource,
      },
      extra: {
        email,
      },
    });
  } catch (err) {
    logError("[conversion] Trial conversion tracking failed", err);
    // Don't throw — conversion should not fail due to tracking
  }
}

/**
 * Send event to Plausible Analytics
 * Requires NEXT_PUBLIC_PLAUSIBLE_DOMAIN env var
 */
async function trackPlausibleEvent(
  eventName: string,
  props?: Record<string, string>
): Promise<void> {
  if (!process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN) {
    return; // Plausible not configured
  }

  try {
    await fetch("https://plausible.io/api/event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        domain: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
        name: eventName,
        url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://keza.app"}/checkout`,
        props: props || {},
      }),
    });
  } catch (err) {
    logError("[plausible] Event tracking failed", err);
  }
}

