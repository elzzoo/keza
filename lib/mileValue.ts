// lib/mileValue.ts
// Contextual mile value: adjusts the base market value (cents/mile) based on
// cabin class and route length. Premium redemptions and long-haul sweet spots
// have higher effective value than short-haul economy usage.

import type { Cabin } from "./engine";

/** Cabin multipliers applied to the base market value */
const CABIN_VALUE_MULTIPLIERS: Record<Cabin, number> = {
  economy: 1.0,
  premium: 1.4,
  business: 2.0,
  first: 2.5,
};

/** Route length brackets (one-way km) → value multiplier */
function getRouteLengthMultiplier(distanceKm: number): number {
  if (distanceKm < 2_000) return 0.85;  // short-haul: poor sweet spots
  if (distanceKm > 6_000) return 1.25;  // long-haul: best sweet spots
  return 1.0;                             // medium-haul: standard
}

/**
 * Compute the effective value of a mile for a specific redemption context.
 *
 * @param baseValueCents  - Static market value from milesPrices.ts (cents)
 * @param cabin           - Cabin class of the redemption
 * @param distanceKm      - Great-circle distance of the route (0 = unknown, skip adjustment)
 * @returns               - Adjusted value in cents (minimum 0.5)
 */
export function getContextualMileValue(
  baseValueCents: number,
  cabin: Cabin,
  distanceKm: number,
): number {
  const cabinMultiplier  = CABIN_VALUE_MULTIPLIERS[cabin];
  const routeMultiplier  = getRouteLengthMultiplier(distanceKm);
  const adjusted = baseValueCents * cabinMultiplier * routeMultiplier;
  return Math.max(0.5, Math.round(adjusted * 1000) / 1000);
}
