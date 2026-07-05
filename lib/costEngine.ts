// lib/costEngine.ts
// Bonus transfer management (caching & initialization).
// Main cost comparison logic re-exported from costComparisonEngine for backward compatibility.

import type { TransferBonusRecord } from "@/data/transferBonuses";
import { TRANSFER_BONUSES as TRANSFER_BONUSES_STATIC } from "@/data/transferBonuses";

// Re-export public types and functions from new modules
export type { Recommendation, Verdict, FlightInput, MilesOption, CostComparison } from "./costComparisonEngine";
export { buildCostOptions, generateVerdictLabel } from "./costComparisonEngine";
export { PROGRAM_TO_AIRLINE } from "./programEngine";

// ─── In-Memory Cache for Bonus Transfers ──────────────────────────────────────
// Populated on app startup from Redis or static fallback.
// This allows synchronous access from costEngine while still supporting dynamic updates.
let cachedBonusTransfers: TransferBonusRecord[] = TRANSFER_BONUSES_STATIC;

/**
 * Get bonus transfers (sync).
 * Uses in-memory cache populated at app startup.
 * Falls back to static data if cache not initialized.
 */
export function getBonusTransfers(): TransferBonusRecord[] {
  return cachedBonusTransfers;
}

/**
 * Initialize bonus transfers cache (called at app startup).
 * Loads from Redis if available, falls back to static data.
 */
export async function initializeBonusTransfers(): Promise<void> {
  const { loadBonusTransfers } = await import("./bonusTransfersRedis");
  try {
    cachedBonusTransfers = await loadBonusTransfers();
  } catch {
    // Fallback to static data on error
    cachedBonusTransfers = TRANSFER_BONUSES_STATIC;
  }
}

// ─── Redis-backed effective price loader ──────────────────────────────────────
// Delegates to milesDataService for a single source of truth.
// Behaviour is identical to before (Redis-first, static fallback, never throws).

export async function getEffectivePrices(): Promise<Map<string, number>> {
  const { getAllEffectivePrices } = await import("./milesDataService");
  return getAllEffectivePrices();
}
