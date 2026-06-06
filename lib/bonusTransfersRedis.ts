import { redis } from "@/lib/redis";
import { TRANSFER_BONUSES, type TransferBonusRecord } from "@/data/transferBonuses";
import { logError } from "@/lib/logger";

/**
 * Redis schema for bonus transfers curation
 * Key: keza:bonus:transfers
 * Type: JSON string (array of TransferBonusRecord)
 * TTL: 30 days (allows manual curation without code deployment)
 * Fallback: TRANSFER_BONUSES static array (if Redis misses)
 */
export const BONUS_TRANSFERS_KEY = "keza:bonus:transfers";
export const BONUS_TRANSFERS_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

/**
 * Load bonus transfers from Redis, with fallback to static data.
 * Redis allows dynamic updates without code deploys.
 */
export async function loadBonusTransfers(): Promise<TransferBonusRecord[]> {
  try {
    const cached = await redis.get<TransferBonusRecord[]>(BONUS_TRANSFERS_KEY);
    if (cached && Array.isArray(cached)) {
      return cached;
    }
  } catch (err) {
    logError("[bonusTransfers] Redis load failed, using fallback", err);
  }

  // Fallback to static data
  return TRANSFER_BONUSES;
}

/**
 * Sync bonus transfers to Redis (called by cron or manual curation).
 * Allows curators to update transfer bonuses without code changes.
 */
export async function syncBonusTransfersToRedis(
  transfers: TransferBonusRecord[]
): Promise<void> {
  try {
    await redis.set(BONUS_TRANSFERS_KEY, transfers, { ex: BONUS_TRANSFERS_TTL_SECONDS });
  } catch (err) {
    logError("[bonusTransfers] Redis sync failed", err);
  }
}

/**
 * Get effective ratio for a transfer (promo if active, else base).
 */
export function getEffectiveTransferRatio(
  record: TransferBonusRecord
): number {
  if (!record.promoRatio || !record.promoValidUntil) {
    return record.baseRatio;
  }
  const now = new Date();
  const expiry = new Date(record.promoValidUntil);
  return expiry > now ? record.promoRatio : record.baseRatio;
}

/**
 * Filter transfers with active bonuses (used for marketing/UX).
 */
export function getActiveBonusTransfers(
  transfers: TransferBonusRecord[]
): TransferBonusRecord[] {
  const now = new Date();
  return transfers.filter((t) => {
    if (!t.promoValidUntil) return false;
    const expiry = new Date(t.promoValidUntil);
    return expiry > now && t.promoRatio !== undefined;
  });
}
