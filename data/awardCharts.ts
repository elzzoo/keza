// data/awardCharts.ts
// Zone-based award miles required per program.
// All values are per person, one-way. getMilesRequired() applies roundtrip × 2 and × passengers.
// Source: official program award charts as of 2026-Q1.

import type { Zone } from "@/lib/zones";
import type { Cabin } from "@/lib/engine";

// Miles required per person, one-way: economy / premium / business
// "first" cabin falls back to business values in getMilesRequired
type CabinMiles = { economy: number; premium: number; business: number };
type ZoneChart = Partial<Record<Zone, CabinMiles>>;
type ProgramChart = Partial<Record<Zone, ZoneChart>>;

const AWARD_CHARTS: Record<string, ProgramChart> = {
  "Flying Blue": {
    AFRICA_NORTH: {
      EUROPE:        { economy: 15_000, premium: 25_000, business: 50_000 },
      NORTH_AMERICA: { economy: 35_000, premium: 55_000, business: 90_000 },
      MIDDLE_EAST:   { economy: 15_000, premium: 22_000, business: 45_000 },
      AFRICA_WEST:   { economy: 10_000, premium: 15_000, business: 30_000 },
      AFRICA_NORTH:  { economy:  7_500, premium: 12_000, business: 25_000 },
    },
    AFRICA_WEST: {
      EUROPE:        { economy: 20_000, premium: 32_000, business: 62_000 },
      NORTH_AMERICA: { economy: 40_000, premium: 60_000, business: 100_000 },
      MIDDLE_EAST:   { economy: 20_000, premium: 28_000, business: 55_000 },
      ASIA:          { economy: 40_000, premium: 55_000, business: 100_000 },
      AFRICA_WEST:   { economy: 10_000, premium: 15_000, business: 30_000 },
      AFRICA_EAST:   { economy: 15_000, premium: 22_000, business: 45_000 },
      AFRICA_SOUTH:  { economy: 20_000, premium: 28_000, business: 60_000 },
      AFRICA_NORTH:  { economy: 10_000, premium: 15_000, business: 30_000 },
      SOUTH_AMERICA: { economy: 55_000, premium: 75_000, business: 120_000 },
    },
    AFRICA_EAST: {
      EUROPE:        { economy: 25_000, premium: 40_000, business: 75_000 },
      NORTH_AMERICA: { economy: 45_000, premium: 65_000, business: 110_000 },
      MIDDLE_EAST:   { economy: 20_000, premium: 28_000, business: 55_000 },
    },
    AFRICA_SOUTH: {
      EUROPE:        { economy: 30_000, premium: 45_000, business: 85_000 },
      NORTH_AMERICA: { economy: 50_000, premium: 70_000, business: 120_000 },
    },
    EUROPE: {
      NORTH_AMERICA: { economy: 25_000, premium: 40_000, business: 72_000 },
      ASIA:          { economy: 35_000, premium: 50_000, business: 90_000 },
      MIDDLE_EAST:   { economy: 15_000, premium: 20_000, business: 45_000 },
      SOUTH_AMERICA: { economy: 45_000, premium: 65_000, business: 110_000 },
    },
    MIDDLE_EAST: {
      EUROPE:        { economy: 15_000, premium: 20_000, business: 45_000 },
      NORTH_AMERICA: { economy: 40_000, premium: 55_000, business: 100_000 },
      ASIA:          { economy: 20_000, premium: 28_000, business: 55_000 },
    },
  },

  "Turkish Miles&Smiles": {
    AFRICA_NORTH: {
      EUROPE:        { economy: 12_500, premium: 20_000, business: 40_000 },
      MIDDLE_EAST:   { economy: 10_000, premium: 17_500, business: 35_000 },
      AFRICA_NORTH:  { economy:  7_500, premium: 12_000, business: 25_000 },
    },
    AFRICA_WEST: {
      EUROPE:        { economy: 15_000, premium: 25_000, business: 50_000 },
      NORTH_AMERICA: { economy: 35_000, premium: 50_000, business: 85_000 },
      MIDDLE_EAST:   { economy: 15_000, premium: 25_000, business: 50_000 },
      ASIA:          { economy: 40_000, premium: 55_000, business: 90_000 },
      AFRICA_WEST:   { economy:  7_500, premium: 12_000, business: 25_000 },
      AFRICA_EAST:   { economy: 15_000, premium: 22_500, business: 45_000 },
      AFRICA_NORTH:  { economy: 10_000, premium: 17_500, business: 35_000 },
    },
    AFRICA_EAST: {
      EUROPE:        { economy: 17_500, premium: 27_500, business: 55_000 },
      NORTH_AMERICA: { economy: 37_500, premium: 55_000, business: 90_000 },
      MIDDLE_EAST:   { economy: 12_500, premium: 20_000, business: 40_000 },
    },
    AFRICA_SOUTH: {
      EUROPE:        { economy: 22_500, premium: 35_000, business: 65_000 },
    },
    EUROPE: {
      NORTH_AMERICA: { economy: 30_000, premium: 42_500, business: 70_000 },
      ASIA:          { economy: 35_000, premium: 50_000, business: 80_000 },
      MIDDLE_EAST:   { economy: 12_500, premium: 20_000, business: 40_000 },
    },
    MIDDLE_EAST: {
      EUROPE:        { economy: 12_500, premium: 20_000, business: 40_000 },
      NORTH_AMERICA: { economy: 35_000, premium: 50_000, business: 80_000 },
      ASIA:          { economy: 17_500, premium: 25_000, business: 50_000 },
    },
  },

  "Emirates Skywards": {
    AFRICA_NORTH: {
      EUROPE:        { economy: 27_500, premium: 40_000, business: 67_500 },
      MIDDLE_EAST:   { economy: 15_000, premium: 22_500, business: 42_500 },
      NORTH_AMERICA: { economy: 42_500, premium: 62_500, business: 105_000 },
    },
    AFRICA_WEST: {
      EUROPE:        { economy: 36_000, premium: 50_000, business: 85_000 },
      NORTH_AMERICA: { economy: 50_000, premium: 72_500, business: 120_000 },
      MIDDLE_EAST:   { economy: 22_500, premium: 32_500, business: 55_000 },
      ASIA:          { economy: 40_000, premium: 57_500, business: 95_000 },
      AFRICA_EAST:   { economy: 15_000, premium: 22_500, business: 40_000 },
    },
    AFRICA_EAST: {
      EUROPE:        { economy: 32_500, premium: 47_500, business: 80_000 },
      NORTH_AMERICA: { economy: 50_000, premium: 72_500, business: 120_000 },
      MIDDLE_EAST:   { economy: 15_000, premium: 22_500, business: 40_000 },
      ASIA:          { economy: 32_500, premium: 47_500, business: 80_000 },
    },
    EUROPE: {
      NORTH_AMERICA: { economy: 32_500, premium: 50_000, business: 82_500 },
      ASIA:          { economy: 30_000, premium: 45_000, business: 77_500 },
      MIDDLE_EAST:   { economy: 17_500, premium: 27_500, business: 45_000 },
    },
    MIDDLE_EAST: {
      EUROPE:        { economy: 17_500, premium: 27_500, business: 45_000 },
      NORTH_AMERICA: { economy: 35_000, premium: 52_500, business: 87_500 },
      ASIA:          { economy: 17_500, premium: 27_500, business: 42_500 },
    },
  },

  "Qatar Privilege Club": {
    AFRICA_NORTH: {
      EUROPE:        { economy: 17_500, premium: 27_500, business: 50_000 },
      MIDDLE_EAST:   { economy: 12_500, premium: 20_000, business: 37_500 },
      NORTH_AMERICA: { economy: 35_000, premium: 52_500, business: 90_000 },
    },
    AFRICA_WEST: {
      EUROPE:        { economy: 22_500, premium: 32_500, business: 60_000 },
      NORTH_AMERICA: { economy: 40_000, premium: 57_500, business: 100_000 },
      MIDDLE_EAST:   { economy: 17_500, premium: 25_000, business: 45_000 },
      ASIA:          { economy: 35_000, premium: 50_000, business: 90_000 },
    },
    AFRICA_EAST: {
      EUROPE:        { economy: 27_500, premium: 40_000, business: 70_000 },
      MIDDLE_EAST:   { economy: 15_000, premium: 22_500, business: 42_500 },
    },
    EUROPE: {
      NORTH_AMERICA: { economy: 30_000, premium: 45_000, business: 75_000 },
      ASIA:          { economy: 32_500, premium: 47_500, business: 82_500 },
      MIDDLE_EAST:   { economy: 15_000, premium: 22_500, business: 40_000 },
    },
    MIDDLE_EAST: {
      EUROPE:        { economy: 15_000, premium: 22_500, business: 40_000 },
      NORTH_AMERICA: { economy: 35_000, premium: 50_000, business: 87_500 },
      ASIA:          { economy: 17_500, premium: 25_000, business: 45_000 },
    },
  },

  "British Airways Avios": {
    AFRICA_NORTH: {
      EUROPE:        { economy: 13_000, premium: 26_000, business: 47_750 },
      MIDDLE_EAST:   { economy: 13_000, premium: 26_000, business: 47_750 },
    },
    AFRICA_WEST: {
      EUROPE:        { economy: 26_000, premium: 52_000, business: 78_000 },
      NORTH_AMERICA: { economy: 39_000, premium: 78_000, business: 104_000 },
      MIDDLE_EAST:   { economy: 20_000, premium: 40_000, business: 60_000 },
    },
    AFRICA_EAST: {
      EUROPE:        { economy: 26_000, premium: 52_000, business: 78_000 },
      MIDDLE_EAST:   { economy: 13_000, premium: 26_000, business: 47_750 },
    },
    EUROPE: {
      NORTH_AMERICA: { economy: 26_000, premium: 52_000, business: 78_000 },
      ASIA:          { economy: 39_000, premium: 78_000, business: 104_000 },
      MIDDLE_EAST:   { economy: 13_000, premium: 26_000, business: 47_750 },
    },
  },

  "Ethiopian ShebaMiles": {
    AFRICA_NORTH: {
      EUROPE:        { economy: 17_500, premium: 27_500, business: 55_000 },
      MIDDLE_EAST:   { economy: 12_500, premium: 20_000, business: 37_500 },
      AFRICA_WEST:   { economy: 10_000, premium: 15_000, business: 30_000 },
    },
    AFRICA_WEST: {
      EUROPE:        { economy: 20_000, premium: 30_000, business: 60_000 },
      NORTH_AMERICA: { economy: 40_000, premium: 57_500, business: 100_000 },
      MIDDLE_EAST:   { economy: 15_000, premium: 22_500, business: 42_500 },
      ASIA:          { economy: 35_000, premium: 50_000, business: 90_000 },
      AFRICA_EAST:   { economy: 10_000, premium: 15_000, business: 32_500 },
    },
    AFRICA_EAST: {
      EUROPE:        { economy: 25_000, premium: 37_500, business: 70_000 },
      NORTH_AMERICA: { economy: 45_000, premium: 65_000, business: 110_000 },
      MIDDLE_EAST:   { economy: 12_500, premium: 20_000, business: 37_500 },
      ASIA:          { economy: 30_000, premium: 45_000, business: 80_000 },
    },
    EUROPE: {
      NORTH_AMERICA: { economy: 35_000, premium: 52_500, business: 90_000 },
      ASIA:          { economy: 37_500, premium: 55_000, business: 95_000 },
    },
  },

  "Air Canada Aeroplan": {
    AFRICA_NORTH: {
      EUROPE:        { economy: 17_500, premium: 27_500, business: 50_000 },
      NORTH_AMERICA: { economy: 35_000, premium: 52_500, business: 80_000 },
      MIDDLE_EAST:   { economy: 20_000, premium: 30_000, business: 55_000 },
    },
    AFRICA_WEST: {
      EUROPE:        { economy: 22_500, premium: 32_500, business: 55_000 },
      NORTH_AMERICA: { economy: 40_000, premium: 57_500, business: 90_000 },
      MIDDLE_EAST:   { economy: 25_000, premium: 35_000, business: 65_000 },
      ASIA:          { economy: 45_000, premium: 65_000, business: 105_000 },
    },
    AFRICA_EAST: {
      EUROPE:        { economy: 25_000, premium: 37_500, business: 65_000 },
      NORTH_AMERICA: { economy: 45_000, premium: 65_000, business: 100_000 },
    },
    EUROPE: {
      NORTH_AMERICA: { economy: 27_500, premium: 40_000, business: 65_000 },
      ASIA:          { economy: 37_500, premium: 55_000, business: 87_500 },
      MIDDLE_EAST:   { economy: 22_500, premium: 32_500, business: 60_000 },
    },
    NORTH_AMERICA: {
      ASIA:          { economy: 45_000, premium: 65_000, business: 100_000 },
    },
  },

  "United MileagePlus": {
    AFRICA_NORTH: {
      EUROPE:        { economy: 22_500, premium: 32_500, business: 60_000 },
      NORTH_AMERICA: { economy: 35_000, premium: 50_000, business: 85_000 },
      MIDDLE_EAST:   { economy: 20_000, premium: 30_000, business: 55_000 },
    },
    AFRICA_WEST: {
      EUROPE:        { economy: 30_000, premium: 40_000, business: 70_000 },
      NORTH_AMERICA: { economy: 40_000, premium: 57_500, business: 100_000 },
      MIDDLE_EAST:   { economy: 30_000, premium: 40_000, business: 70_000 },
      ASIA:          { economy: 45_000, premium: 62_500, business: 110_000 },
    },
    AFRICA_EAST: {
      EUROPE:        { economy: 30_000, premium: 42_500, business: 75_000 },
      NORTH_AMERICA: { economy: 45_000, premium: 62_500, business: 110_000 },
    },
    EUROPE: {
      NORTH_AMERICA: { economy: 30_000, premium: 42_500, business: 70_000 },
      ASIA:          { economy: 35_000, premium: 50_000, business: 80_000 },
      MIDDLE_EAST:   { economy: 22_500, premium: 32_500, business: 55_000 },
    },
  },
};

// Distance-based fallback estimate (miles)
function distanceFallback(originZone: Zone, destZone: Zone): number {
  const ZONE_DISTANCE_ESTIMATE: Partial<Record<Zone, Partial<Record<Zone, number>>>> = {
    AFRICA_NORTH:{ EUROPE: 2_000, NORTH_AMERICA: 7_000, MIDDLE_EAST: 3_500, AFRICA_WEST: 3_000, AFRICA_EAST: 5_000, ASIA: 8_000, SOUTH_AMERICA: 8_500 },
    AFRICA_WEST: { EUROPE: 4_500, NORTH_AMERICA: 8_000, MIDDLE_EAST: 5_500, ASIA: 9_000, AFRICA_EAST: 4_000, AFRICA_SOUTH: 5_000, SOUTH_AMERICA: 9_000 },
    AFRICA_EAST: { EUROPE: 5_000, NORTH_AMERICA: 9_500, MIDDLE_EAST: 3_500, ASIA: 6_500, AFRICA_SOUTH: 3_500 },
    EUROPE:      { NORTH_AMERICA: 7_000, ASIA: 8_000, MIDDLE_EAST: 3_500, SOUTH_AMERICA: 9_000 },
    MIDDLE_EAST: { EUROPE: 3_500, NORTH_AMERICA: 9_500, ASIA: 4_000 },
    NORTH_AMERICA:{ ASIA: 10_000, SOUTH_AMERICA: 6_500 },
    ASIA:        { SOUTH_AMERICA: 12_000 },
  };
  const d = ZONE_DISTANCE_ESTIMATE[originZone]?.[destZone]
    ?? ZONE_DISTANCE_ESTIMATE[destZone]?.[originZone]
    ?? 7_000;
  return Math.round(d * 4.5);
}

export function getMilesRequired(
  program: string,
  originZone: Zone,
  destZone: Zone,
  cabin: Cabin,
  tripType: "oneway" | "roundtrip",
  passengers: number
): { miles: number; source: "REAL" | "ESTIMATE" } {
  const chart = AWARD_CHARTS[program]?.[originZone]?.[destZone];
  // Try reverse direction too (many charts are symmetric)
  const reverseChart = AWARD_CHARTS[program]?.[destZone]?.[originZone];
  const entry = chart ?? reverseChart;

  let milesPerPaxOneway: number;
  let source: "REAL" | "ESTIMATE";

  if (entry) {
    const cabinKey = cabin === "first" ? "business" : cabin;
    milesPerPaxOneway = entry[cabinKey] ?? distanceFallback(originZone, destZone);
    source = "REAL";
  } else {
    milesPerPaxOneway = distanceFallback(originZone, destZone);
    source = "ESTIMATE";
  }

  const tripMultiplier = tripType === "roundtrip" ? 2 : 1;
  return {
    miles: milesPerPaxOneway * tripMultiplier * passengers,
    source,
  };
}
