/**
 * KEZA Pro access control
 * Determines if a user has Pro access (paid or trial)
 */

import { isProUser } from "@/lib/lemonsqueezy";
import { getTrialStatus } from "@/lib/lemonsqueezy";
import { logError } from "@/lib/logger";

export interface ProAccessStatus {
  isPro: boolean;           // has paid subscription
  hasTrial: boolean;        // has active trial
  daysLeft: number | null;  // days left on trial (or null if paid)
  isActive: boolean;        // has either pro or trial
}

/**
 * Check if a user has Pro access (paid subscription or active trial)
 */
export async function checkProAccess(email: string): Promise<ProAccessStatus> {
  try {
    const [isPro, trialStatus] = await Promise.all([
      isProUser(email),
      getTrialStatus(email),
    ]);

    const hasTrial = trialStatus !== null && new Date(trialStatus.expiresAt) > new Date();
    const isActive = isPro || hasTrial;

    let daysLeft: number | null = null;
    if (hasTrial && trialStatus?.expiresAt) {
      const expiresAt = new Date(trialStatus.expiresAt);
      const now = new Date();
      const millisecondsLeft = expiresAt.getTime() - now.getTime();
      daysLeft = Math.ceil(millisecondsLeft / (24 * 60 * 60 * 1000));
    }

    return {
      isPro,
      hasTrial,
      daysLeft,
      isActive,
    };
  } catch (err) {
    logError("[checkProAccess]", err, { email });
    return { isPro: false, hasTrial: false, daysLeft: null, isActive: false };
  }
}
