/**
 * KEZA Pro access control
 * Determines if a user has Pro access (paid or trial)
 */

import { isProUser } from "@/lib/lemonsqueezy";
import { getTrialStatus } from "@/lib/lemonsqueezy";
import { logError } from "@/lib/logger";

export interface ProAccessStatus {
  hasPro: boolean;
  isTrialUser: boolean;
  trialExpiresAt?: string;
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

    const hasPro = isPro || trialStatus !== null;
    const isTrialUser = !isPro && trialStatus !== null;

    return {
      hasPro,
      isTrialUser,
      trialExpiresAt: trialStatus?.expiresAt,
    };
  } catch (err) {
    logError("[checkProAccess]", err, { email });
    return { hasPro: false, isTrialUser: false };
  }
}
