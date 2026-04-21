import type { Region } from "@/data/destinations";

// 12 monthly multipliers applied to cashEstimateUsd base price.
// Index 0 = January, index 11 = December.
// Rationale:
//   Africa/Europe: high season summer (Jul/Aug) + holidays (Dec), low Jan–Feb
//   Americas:      similar to Europe with stronger Dec spike
//   Asia:          Chinese New Year (Jan high), monsoon dip (Jun/Sep)
//   Middle-East:   summer high season, mild pattern
//   Oceania:       inverted hemispheres — Jul/Aug = austral winter = cheap

export type MonthlyMultipliers = [
  number, number, number, number, // Jan Fév Mar Avr
  number, number, number, number, // Mai Jun Jul Aoû
  number, number, number, number, // Sep Oct Nov Déc
];

export const REGIONAL_SEASONALITY: Record<Region, MonthlyMultipliers> = {
  africa:       [0.82, 0.84, 0.90, 0.95, 1.00, 1.15, 1.35, 1.30, 1.05, 0.97, 1.10, 1.20],
  europe:       [0.82, 0.84, 0.90, 0.94, 0.98, 1.15, 1.35, 1.30, 1.02, 0.96, 1.10, 1.20],
  americas:     [0.88, 0.85, 0.92, 0.95, 1.00, 1.18, 1.35, 1.28, 1.05, 0.98, 1.05, 1.25],
  asia:         [1.10, 0.90, 0.95, 1.05, 1.00, 0.95, 1.00, 1.05, 0.92, 0.90, 1.00, 1.15],
  "middle-east":[0.90, 0.88, 0.92, 0.95, 1.00, 1.10, 1.20, 1.15, 1.00, 0.95, 1.00, 1.10],
  oceania:      [1.20, 1.10, 1.05, 0.95, 0.88, 0.85, 0.90, 0.92, 0.95, 1.00, 1.05, 1.10],
};
