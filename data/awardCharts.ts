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
      AFRICA_EAST:   { economy: 15_000, premium: 22_000, business: 45_000 },
      AFRICA_SOUTH:  { economy: 20_000, premium: 28_000, business: 55_000 },
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
      AFRICA_EAST:   { economy:  7_500, premium: 12_000, business: 25_000 },
      AFRICA_SOUTH:  { economy: 15_000, premium: 22_000, business: 45_000 },
      AFRICA_WEST:   { economy: 15_000, premium: 22_000, business: 45_000 },
      AFRICA_NORTH:  { economy: 15_000, premium: 22_000, business: 45_000 },
    },
    AFRICA_SOUTH: {
      EUROPE:        { economy: 30_000, premium: 45_000, business: 85_000 },
      NORTH_AMERICA: { economy: 50_000, premium: 70_000, business: 120_000 },
      AFRICA_SOUTH:  { economy:  7_500, premium: 12_000, business: 25_000 },
      AFRICA_EAST:   { economy: 15_000, premium: 22_000, business: 45_000 },
      AFRICA_WEST:   { economy: 20_000, premium: 28_000, business: 60_000 },
      AFRICA_NORTH:  { economy: 20_000, premium: 28_000, business: 55_000 },
    },
    EUROPE: {
      NORTH_AMERICA: { economy: 25_000, premium: 40_000, business: 72_000 },
      ASIA:          { economy: 35_000, premium: 50_000, business: 90_000 },
      MIDDLE_EAST:   { economy: 15_000, premium: 20_000, business: 45_000 },
      SOUTH_AMERICA: { economy: 45_000, premium: 65_000, business: 110_000 },
      EUROPE:        { economy: 15_000, premium: 20_000, business: 35_000 },
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
      AFRICA_WEST:   { economy: 10_000, premium: 17_500, business: 35_000 },
      AFRICA_EAST:   { economy: 12_500, premium: 20_000, business: 40_000 },
      AFRICA_SOUTH:  { economy: 17_500, premium: 27_500, business: 55_000 },
    },
    AFRICA_WEST: {
      // Official Turkish chart 2025-2026: Zone 6 (Central/West Africa) → Zone 2 (Europe)
      // Economy: 25,000 one-way / Business: 50,000 one-way
      EUROPE:        { economy: 25_000, premium: 37_500, business: 50_000 },
      NORTH_AMERICA: { economy: 40_000, premium: 55_000, business: 85_000 },
      MIDDLE_EAST:   { economy: 20_000, premium: 30_000, business: 50_000 },
      ASIA:          { economy: 45_000, premium: 60_000, business: 90_000 },
      AFRICA_WEST:   { economy:  7_500, premium: 12_000, business: 25_000 },
      AFRICA_EAST:   { economy: 17_500, premium: 25_000, business: 45_000 },
      AFRICA_SOUTH:  { economy: 20_000, premium: 30_000, business: 55_000 },
      AFRICA_NORTH:  { economy: 12_500, premium: 20_000, business: 35_000 },
    },
    AFRICA_EAST: {
      // Official Turkish chart 2025-2026: Zone 7 (East Africa) → Zone 2 (Europe)
      // Economy: ~22,500 one-way (between Zone 6 and Zone 5 rates)
      EUROPE:        { economy: 22_500, premium: 32_500, business: 55_000 },
      NORTH_AMERICA: { economy: 37_500, premium: 55_000, business: 90_000 },
      MIDDLE_EAST:   { economy: 12_500, premium: 20_000, business: 40_000 },
      AFRICA_EAST:   { economy:  7_500, premium: 12_000, business: 25_000 },
      AFRICA_SOUTH:  { economy: 12_500, premium: 20_000, business: 40_000 },
      AFRICA_WEST:   { economy: 15_000, premium: 22_500, business: 45_000 },
    },
    AFRICA_SOUTH: {
      EUROPE:        { economy: 22_500, premium: 35_000, business: 65_000 },
      AFRICA_EAST:   { economy: 12_500, premium: 20_000, business: 40_000 },
      AFRICA_WEST:   { economy: 17_500, premium: 27_500, business: 55_000 },
      AFRICA_SOUTH:  { economy:  7_500, premium: 12_000, business: 25_000 },
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
      AFRICA_WEST:   { economy: 22_500, premium: 32_500, business: 55_000 },
      AFRICA_EAST:   { economy: 20_000, premium: 30_000, business: 50_000 },
    },
    AFRICA_WEST: {
      EUROPE:        { economy: 36_000, premium: 50_000, business: 85_000 },
      NORTH_AMERICA: { economy: 50_000, premium: 72_500, business: 120_000 },
      MIDDLE_EAST:   { economy: 22_500, premium: 32_500, business: 55_000 },
      ASIA:          { economy: 40_000, premium: 57_500, business: 95_000 },
      AFRICA_EAST:   { economy: 22_500, premium: 32_500, business: 55_000 },
      AFRICA_SOUTH:  { economy: 27_500, premium: 40_000, business: 67_500 },
      AFRICA_WEST:   { economy: 12_500, premium: 20_000, business: 35_000 },
    },
    AFRICA_EAST: {
      EUROPE:        { economy: 32_500, premium: 47_500, business: 80_000 },
      NORTH_AMERICA: { economy: 50_000, premium: 72_500, business: 120_000 },
      MIDDLE_EAST:   { economy: 15_000, premium: 22_500, business: 40_000 },
      ASIA:          { economy: 32_500, premium: 47_500, business: 80_000 },
      AFRICA_EAST:   { economy: 10_000, premium: 17_500, business: 30_000 },
      AFRICA_SOUTH:  { economy: 20_000, premium: 30_000, business: 50_000 },
    },
    EUROPE: {
      NORTH_AMERICA: { economy: 32_500, premium: 50_000, business: 82_500 },
      ASIA:          { economy: 30_000, premium: 45_000, business: 77_500 },
      MIDDLE_EAST:   { economy: 17_500, premium: 27_500, business: 45_000 },
    },
    AFRICA_SOUTH: {
      EUROPE:        { economy: 40_000, premium: 57_500, business: 92_500 },
      MIDDLE_EAST:   { economy: 22_500, premium: 32_500, business: 55_000 },
      NORTH_AMERICA: { economy: 55_000, premium: 80_000, business: 132_500 },
      ASIA:          { economy: 40_000, premium: 57_500, business: 95_000 },
      AFRICA_EAST:   { economy: 20_000, premium: 30_000, business: 50_000 },
      AFRICA_WEST:   { economy: 27_500, premium: 40_000, business: 67_500 },
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
      AFRICA_WEST:   { economy: 15_000, premium: 22_500, business: 42_500 },
      AFRICA_EAST:   { economy: 17_500, premium: 25_000, business: 45_000 },
    },
    AFRICA_WEST: {
      EUROPE:        { economy: 22_500, premium: 32_500, business: 60_000 },
      NORTH_AMERICA: { economy: 40_000, premium: 57_500, business: 100_000 },
      MIDDLE_EAST:   { economy: 17_500, premium: 25_000, business: 45_000 },
      ASIA:          { economy: 35_000, premium: 50_000, business: 90_000 },
      AFRICA_EAST:   { economy: 17_500, premium: 25_000, business: 45_000 },
      AFRICA_SOUTH:  { economy: 22_500, premium: 32_500, business: 60_000 },
      AFRICA_WEST:   { economy: 10_000, premium: 17_500, business: 30_000 },
    },
    AFRICA_EAST: {
      EUROPE:        { economy: 27_500, premium: 40_000, business: 70_000 },
      MIDDLE_EAST:   { economy: 15_000, premium: 22_500, business: 42_500 },
      AFRICA_EAST:   { economy: 10_000, premium: 17_500, business: 30_000 },
      AFRICA_SOUTH:  { economy: 15_000, premium: 22_500, business: 42_500 },
    },
    EUROPE: {
      NORTH_AMERICA: { economy: 30_000, premium: 45_000, business: 75_000 },
      ASIA:          { economy: 32_500, premium: 47_500, business: 82_500 },
      MIDDLE_EAST:   { economy: 15_000, premium: 22_500, business: 40_000 },
    },
    AFRICA_SOUTH: {
      EUROPE:        { economy: 35_000, premium: 50_000, business: 85_000 },
      MIDDLE_EAST:   { economy: 20_000, premium: 30_000, business: 55_000 },
      NORTH_AMERICA: { economy: 50_000, premium: 72_500, business: 115_000 },
      ASIA:          { economy: 37_500, premium: 55_000, business: 90_000 },
      AFRICA_EAST:   { economy: 15_000, premium: 22_500, business: 42_500 },
      AFRICA_WEST:   { economy: 22_500, premium: 32_500, business: 60_000 },
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
      AFRICA_WEST:   { economy: 13_000, premium: 26_000, business: 47_750 },
      AFRICA_EAST:   { economy: 20_000, premium: 40_000, business: 60_000 },
      AFRICA_NORTH:  { economy:  7_500, premium: 15_000, business: 30_000 },
    },
    AFRICA_WEST: {
      EUROPE:        { economy: 26_000, premium: 52_000, business: 78_000 },
      NORTH_AMERICA: { economy: 39_000, premium: 78_000, business: 104_000 },
      MIDDLE_EAST:   { economy: 20_000, premium: 40_000, business: 60_000 },
      AFRICA_WEST:   { economy:  7_500, premium: 15_000, business: 30_000 },
      AFRICA_EAST:   { economy: 20_000, premium: 40_000, business: 60_000 },
      AFRICA_SOUTH:  { economy: 26_000, premium: 52_000, business: 78_000 },
    },
    AFRICA_EAST: {
      EUROPE:        { economy: 26_000, premium: 52_000, business: 78_000 },
      MIDDLE_EAST:   { economy: 13_000, premium: 26_000, business: 47_750 },
      AFRICA_EAST:   { economy:  7_500, premium: 15_000, business: 30_000 },
      AFRICA_SOUTH:  { economy: 13_000, premium: 26_000, business: 47_750 },
      AFRICA_WEST:   { economy: 20_000, premium: 40_000, business: 60_000 },
    },
    AFRICA_SOUTH: {
      EUROPE:        { economy: 26_000, premium: 52_000, business: 78_000 },
      NORTH_AMERICA: { economy: 39_000, premium: 78_000, business: 104_000 },
      AFRICA_SOUTH:  { economy:  7_500, premium: 15_000, business: 30_000 },
      AFRICA_EAST:   { economy: 13_000, premium: 26_000, business: 47_750 },
      MIDDLE_EAST:   { economy: 20_000, premium: 40_000, business: 60_000 },
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
      AFRICA_EAST:   { economy: 10_000, premium: 15_000, business: 30_000 },
      AFRICA_SOUTH:  { economy: 15_000, premium: 22_500, business: 45_000 },
    },
    AFRICA_WEST: {
      EUROPE:        { economy: 20_000, premium: 30_000, business: 60_000 },
      NORTH_AMERICA: { economy: 40_000, premium: 57_500, business: 100_000 },
      MIDDLE_EAST:   { economy: 15_000, premium: 22_500, business: 42_500 },
      ASIA:          { economy: 35_000, premium: 50_000, business: 90_000 },
      AFRICA_WEST:   { economy:  7_500, premium: 12_000, business: 25_000 },
      AFRICA_EAST:   { economy: 10_000, premium: 15_000, business: 32_500 },
      AFRICA_SOUTH:  { economy: 15_000, premium: 22_500, business: 45_000 },
      AFRICA_NORTH:  { economy: 10_000, premium: 15_000, business: 30_000 },
    },
    AFRICA_EAST: {
      EUROPE:        { economy: 25_000, premium: 37_500, business: 70_000 },
      NORTH_AMERICA: { economy: 45_000, premium: 65_000, business: 110_000 },
      MIDDLE_EAST:   { economy: 12_500, premium: 20_000, business: 37_500 },
      ASIA:          { economy: 30_000, premium: 45_000, business: 80_000 },
      AFRICA_EAST:   { economy:  5_000, premium: 10_000, business: 20_000 },
      AFRICA_SOUTH:  { economy: 10_000, premium: 15_000, business: 32_500 },
      AFRICA_WEST:   { economy: 10_000, premium: 15_000, business: 32_500 },
      AFRICA_NORTH:  { economy: 10_000, premium: 15_000, business: 30_000 },
    },
    AFRICA_SOUTH: {
      EUROPE:        { economy: 30_000, premium: 45_000, business: 80_000 },
      NORTH_AMERICA: { economy: 50_000, premium: 70_000, business: 115_000 },
      AFRICA_EAST:   { economy: 10_000, premium: 15_000, business: 32_500 },
      AFRICA_WEST:   { economy: 15_000, premium: 22_500, business: 45_000 },
      AFRICA_SOUTH:  { economy:  7_500, premium: 12_000, business: 25_000 },
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
      AFRICA_WEST:   { economy: 12_500, premium: 20_000, business: 37_500 },
      AFRICA_EAST:   { economy: 15_000, premium: 22_500, business: 42_500 },
    },
    AFRICA_WEST: {
      EUROPE:        { economy: 22_500, premium: 32_500, business: 55_000 },
      NORTH_AMERICA: { economy: 40_000, premium: 57_500, business: 90_000 },
      MIDDLE_EAST:   { economy: 25_000, premium: 35_000, business: 65_000 },
      ASIA:          { economy: 45_000, premium: 65_000, business: 105_000 },
      AFRICA_WEST:   { economy:  7_500, premium: 12_500, business: 25_000 },
      AFRICA_EAST:   { economy: 15_000, premium: 22_500, business: 42_500 },
      AFRICA_SOUTH:  { economy: 20_000, premium: 30_000, business: 55_000 },
    },
    AFRICA_EAST: {
      EUROPE:        { economy: 25_000, premium: 37_500, business: 65_000 },
      NORTH_AMERICA: { economy: 45_000, premium: 65_000, business: 100_000 },
      AFRICA_EAST:   { economy:  7_500, premium: 12_500, business: 25_000 },
      AFRICA_SOUTH:  { economy: 12_500, premium: 20_000, business: 37_500 },
      AFRICA_WEST:   { economy: 15_000, premium: 22_500, business: 42_500 },
    },
    AFRICA_SOUTH: {
      EUROPE:        { economy: 55_000, premium: 75_000, business: 110_000 },
      NORTH_AMERICA: { economy: 55_000, premium: 75_000, business: 110_000 },
      MIDDLE_EAST:   { economy: 30_000, premium: 45_000, business: 75_000 },
      AFRICA_SOUTH:  { economy:  7_500, premium: 12_500, business: 25_000 },
      AFRICA_EAST:   { economy: 12_500, premium: 20_000, business: 37_500 },
      AFRICA_WEST:   { economy: 20_000, premium: 30_000, business: 55_000 },
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

  "ANA Mileage Club": {
    ASIA: {
      NORTH_AMERICA: { economy: 35_000, premium: 55_000, business: 88_000 },
      EUROPE:        { economy: 35_000, premium: 55_000, business: 88_000 },
      MIDDLE_EAST:   { economy: 20_000, premium: 30_000, business: 55_000 },
      ASIA:          { economy: 10_000, premium: 15_000, business: 30_000 },
    },
    NORTH_AMERICA: {
      ASIA:          { economy: 35_000, premium: 55_000, business: 88_000 },
      EUROPE:        { economy: 30_000, premium: 45_000, business: 75_000 },
    },
    EUROPE: {
      ASIA:          { economy: 35_000, premium: 55_000, business: 88_000 },
      NORTH_AMERICA: { economy: 30_000, premium: 45_000, business: 75_000 },
    },
  },

  "LATAM Pass": {
    SOUTH_AMERICA: {
      SOUTH_AMERICA:  { economy: 10_000, premium: 15_000, business: 30_000 },
      NORTH_AMERICA:  { economy: 25_000, premium: 37_500, business: 55_000 },
      EUROPE:         { economy: 35_000, premium: 52_500, business: 70_000 },
      MIDDLE_EAST:    { economy: 42_000, premium: 60_000, business: 85_000 },
    },
    NORTH_AMERICA: {
      SOUTH_AMERICA:  { economy: 25_000, premium: 37_500, business: 55_000 },
    },
    EUROPE: {
      SOUTH_AMERICA:  { economy: 35_000, premium: 52_500, business: 70_000 },
    },
  },

  "United MileagePlus": {
    AFRICA_NORTH: {
      EUROPE:        { economy: 22_500, premium: 32_500, business: 60_000 },
      NORTH_AMERICA: { economy: 35_000, premium: 50_000, business: 85_000 },
      MIDDLE_EAST:   { economy: 20_000, premium: 30_000, business: 55_000 },
      AFRICA_WEST:   { economy: 15_000, premium: 22_500, business: 42_500 },
      AFRICA_EAST:   { economy: 17_500, premium: 25_000, business: 47_500 },
    },
    AFRICA_WEST: {
      EUROPE:        { economy: 30_000, premium: 40_000, business: 70_000 },
      NORTH_AMERICA: { economy: 40_000, premium: 57_500, business: 100_000 },
      MIDDLE_EAST:   { economy: 30_000, premium: 40_000, business: 70_000 },
      ASIA:          { economy: 45_000, premium: 62_500, business: 110_000 },
      AFRICA_WEST:   { economy: 10_000, premium: 15_000, business: 30_000 },
      AFRICA_EAST:   { economy: 17_500, premium: 25_000, business: 47_500 },
      AFRICA_SOUTH:  { economy: 22_500, premium: 32_500, business: 60_000 },
    },
    AFRICA_EAST: {
      EUROPE:        { economy: 30_000, premium: 42_500, business: 75_000 },
      NORTH_AMERICA: { economy: 45_000, premium: 62_500, business: 110_000 },
      AFRICA_EAST:   { economy: 10_000, premium: 15_000, business: 30_000 },
      AFRICA_SOUTH:  { economy: 15_000, premium: 22_500, business: 42_500 },
      AFRICA_WEST:   { economy: 17_500, premium: 25_000, business: 47_500 },
    },
    EUROPE: {
      NORTH_AMERICA: { economy: 30_000, premium: 42_500, business: 70_000 },
      ASIA:          { economy: 35_000, premium: 50_000, business: 80_000 },
      MIDDLE_EAST:   { economy: 22_500, premium: 32_500, business: 55_000 },
    },
  },

  // Singapore KrisFlyer — official Saver award chart (2025)
  // One-way per pax. Source: krisflyer.com/flights/use-miles/award-table
  "Singapore KrisFlyer": {
    ASIA: {
      NORTH_AMERICA: { economy: 35_000, premium: 55_000, business: 90_000 },
      EUROPE:        { economy: 30_000, premium: 47_500, business: 80_000 },
      MIDDLE_EAST:   { economy: 17_500, premium: 27_500, business: 55_000 },
      AFRICA_EAST:   { economy: 25_000, premium: 40_000, business: 75_000 },
      AFRICA_WEST:   { economy: 35_000, premium: 55_000, business: 90_000 },
      ASIA:          { economy: 12_500, premium: 20_000, business: 40_000 },
    },
    EUROPE: {
      NORTH_AMERICA: { economy: 30_000, premium: 47_500, business: 80_000 },
      ASIA:          { economy: 30_000, premium: 47_500, business: 80_000 },
      MIDDLE_EAST:   { economy: 17_500, premium: 27_500, business: 55_000 },
    },
    NORTH_AMERICA: {
      ASIA:          { economy: 35_000, premium: 55_000, business: 90_000 },
      EUROPE:        { economy: 30_000, premium: 47_500, business: 80_000 },
    },
  },

  "Iberia Avios Plus": {
    EUROPE: {
      EUROPE:        { economy:  9_000, premium: 13_500, business: 18_000 },
      NORTH_AMERICA: { economy: 25_000, premium: 37_500, business: 57_500 },
      SOUTH_AMERICA: { economy: 30_000, premium: 45_000, business: 65_000 },
      MIDDLE_EAST:   { economy: 17_500, premium: 25_000, business: 40_000 },
      AFRICA_NORTH:  { economy: 17_500, premium: 25_000, business: 40_000 },
      AFRICA_WEST:   { economy: 20_000, premium: 30_000, business: 50_000 },
    },
    NORTH_AMERICA: {
      EUROPE:        { economy: 25_000, premium: 37_500, business: 57_500 },
      SOUTH_AMERICA: { economy: 25_000, premium: 37_500, business: 57_500 },
    },
    SOUTH_AMERICA: {
      EUROPE:        { economy: 30_000, premium: 45_000, business: 65_000 },
      NORTH_AMERICA: { economy: 25_000, premium: 37_500, business: 57_500 },
      SOUTH_AMERICA: { economy: 12_500, premium: 20_000, business: 35_000 },
    },
  },
};

/** Cabin multipliers used when no static chart entry exists for a program/route.
 *  first = business × 1.5 (chart lookup override: rawMiles × 1.5). The cash
 *  ratio (6.5 / 4.0 = 1.625) is slightly higher; 1.5× is the miles convention. */
const FALLBACK_CABIN_MULTIPLIERS: Record<string, number> = {
  economy:  1.0,
  premium:  1.5,
  business: 2.5,
  first:    4.0,  // 2.5 × 1.6 = 4.0; cash ratio (6.5/4.0=1.625) — slightly above the 1.5× convention
};

// Distance-based fallback estimate (km) — declared at module level, NOT inside
// distanceFallback(), so the object is allocated once and reused on every call.
const ZONE_DISTANCE_ESTIMATE_KM: Partial<Record<Zone, Partial<Record<Zone, number>>>> = {
  AFRICA_NORTH: { EUROPE: 2_000, NORTH_AMERICA: 7_000, MIDDLE_EAST: 3_500, AFRICA_WEST: 3_000, AFRICA_EAST: 5_000, AFRICA_SOUTH: 7_500, ASIA: 8_000, SOUTH_AMERICA: 8_500 },
  AFRICA_WEST:  { EUROPE: 4_500, NORTH_AMERICA: 8_000, MIDDLE_EAST: 5_500, ASIA: 9_000, AFRICA_EAST: 4_000, AFRICA_SOUTH: 5_000, AFRICA_NORTH: 3_000, SOUTH_AMERICA: 9_000 },
  AFRICA_EAST:  { EUROPE: 5_000, NORTH_AMERICA: 9_500, MIDDLE_EAST: 3_500, ASIA: 6_500, AFRICA_SOUTH: 3_500, AFRICA_NORTH: 5_000 },
  AFRICA_SOUTH: { EUROPE: 9_000, NORTH_AMERICA: 12_000, MIDDLE_EAST: 6_500, ASIA: 9_500, AFRICA_EAST: 3_500, AFRICA_WEST: 5_000, AFRICA_NORTH: 7_500, SOUTH_AMERICA: 7_500 },
  EUROPE:       { EUROPE: 2_000, NORTH_AMERICA: 7_000, ASIA: 8_000, MIDDLE_EAST: 3_500, SOUTH_AMERICA: 9_000 },
  MIDDLE_EAST:  { EUROPE: 3_500, NORTH_AMERICA: 9_500, ASIA: 4_000 },
  NORTH_AMERICA:{ ASIA: 10_000, SOUTH_AMERICA: 6_500 },
  ASIA:         { SOUTH_AMERICA: 12_000 },
};

// Distance-based fallback estimate (miles) — cabin-scaled to prevent economy miles
// leaking into Business/First calculations for programs without static chart entries.
function distanceFallback(originZone: Zone, destZone: Zone, cabin: string = "economy"): number {
  const d = ZONE_DISTANCE_ESTIMATE_KM[originZone]?.[destZone]
    ?? ZONE_DISTANCE_ESTIMATE_KM[destZone]?.[originZone]
    ?? 7_000;
  const multiplier = FALLBACK_CABIN_MULTIPLIERS[cabin] ?? 1.0;
  return Math.round(d * 4.5 * multiplier);
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
    // Static charts have economy/premium/business columns only; no "first" column.
    // First class uses business rates × 1.5 to reflect the typical first-vs-business
    // award premium (~40-60% more miles). This keeps the miles/cash ratio coherent:
    //   cash ratio (first/business) ≈ 1.6×  →  miles ratio ≈ 1.5×
    const cabinKey = cabin === "first" ? "business" : cabin;
    const rawMiles = entry[cabinKey] ?? distanceFallback(originZone, destZone, cabin);
    milesPerPaxOneway = cabin === "first" ? Math.round(rawMiles * 1.5) : rawMiles;
    source = "REAL";
  } else {
    milesPerPaxOneway = distanceFallback(originZone, destZone, cabin);
    source = "ESTIMATE";
  }

  const tripMultiplier = tripType === "roundtrip" ? 2 : 1;
  return {
    miles: milesPerPaxOneway * tripMultiplier * passengers,
    source,
  };
}
