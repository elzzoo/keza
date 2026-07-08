// lib/scoring/signals.ts
// 6-signal scoring functions for flight ranking in P5.2

import type { FlightResult } from "@/lib/engine/types";
import { PROGRAMS_BY_NAME } from "@/lib/globalPrograms";

export interface SignalContext {
  flight: FlightResult;
  userProgram?: string;
  bookingDate: Date;
  historicalData?: Record<string, any>;
}

/**
 * Calculate cabin signal (0-100)
 * Economy=20, Premium Economy=50, Business=80, First=100
 */
export function calculateCabinSignal(ctx: SignalContext): number {
  const cabin = ctx.flight.cabin;
  const cabinScores: Record<string, number> = {
    economy: 20,
    premium: 50,
    business: 80,
    first: 100,
  };
  return cabinScores[cabin] ?? 20;
}

/**
 * Calculate accessibility signal (0-100)
 * Based on program availability and accessibility score
 * More accessible programs (score <= 2) get higher scores
 */
export function calculateAccessibilitySignal(ctx: SignalContext): number {
  const flight = ctx.flight;
  if (!flight.milesOptions || flight.milesOptions.length === 0) {
    return 20; // Low accessibility if no options
  }

  // Count accessible programs (accessibility score <= 2)
  const accessibleCount = flight.milesOptions.filter((opt) => {
    const program = PROGRAMS_BY_NAME[opt.program];
    return program && (program.accessibilityScore ?? 2) <= 2;
  }).length;

  const totalCount = flight.milesOptions.length;
  if (totalCount === 0) return 20;

  // Convert ratio to 0-100 scale: more accessible programs = higher score
  const accessibilityRatio = accessibleCount / totalCount;
  return Math.round(20 + accessibilityRatio * 80); // 20-100
}

/**
 * Calculate price signal (0-100)
 * Lower price = higher signal (inverted logic)
 * Normalizes against typical route pricing
 */
export function calculatePriceSignal(ctx: SignalContext): number {
  const flight = ctx.flight;
  // Use the best available price (miles cost if available and cheaper, otherwise cash cost)
  const bestCost = flight.milesCost > 0
    ? Math.min(flight.cashCost, flight.milesCost)
    : flight.cashCost;

  if (bestCost <= 0) return 50; // Unknown price, default to middle

  // Define typical price ranges for different routes
  // Use cashCost as baseline for typical pricing
  const minPrice = 400;   // floor price (heavily discounted) = 100
  const maxPrice = 3000;  // ceiling price (premium) = 0

  // Simple linear inversion: lower price = higher score
  const normalized = (maxPrice - bestCost) / (maxPrice - minPrice);
  const score = normalized * 100;
  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate connections signal (0-100)
 * Direct=100, 1-stop=70, 2+stops=40
 * Penalty for very long layovers
 */
export function calculateConnectionsSignal(ctx: SignalContext): number {
  const stops = ctx.flight.stops ?? 0;
  const duration = ctx.flight.duration ?? 0; // in minutes

  let baseScore: number;
  if (stops === 0) {
    baseScore = 100; // Direct flight
  } else if (stops === 1) {
    baseScore = 70; // One stop
  } else {
    baseScore = 40; // Two or more stops
  }

  // Apply duration penalty for very long trips (>24h travel)
  const durationHours = duration / 60;
  if (durationHours > 24) {
    // Reduce score by up to 20 points for extremely long journeys
    const reduction = Math.min(20, (durationHours - 24) * 2);
    return Math.max(20, baseScore - reduction);
  }

  return baseScore;
}

/**
 * Calculate layover signal (0-100)
 * Based on flight duration and number of stops
 * Shorter and more direct flights get higher scores
 * <2h=100, 2-4h=80, 4-8h=50, 8h+=20
 */
export function calculateLayoverSignal(ctx: SignalContext): number {
  const duration = ctx.flight.duration ?? 0; // in minutes
  const durationHours = duration / 60;

  if (durationHours < 2) return 100; // Short haul / nonstop
  if (durationHours < 4) return 80; // 2-4 hour layovers
  if (durationHours < 8) return 50; // 4-8 hour layovers
  return 20; // Long hauls with extended layovers
}

/**
 * Calculate carrier signal (0-100)
 * Based on airline reputation and program tier
 * Better programs (premium alliances) get higher scores
 */
export function calculateCarrierSignal(ctx: SignalContext): number {
  const flight = ctx.flight;
  if (!flight.milesOptions || flight.milesOptions.length === 0) {
    return 50; // Unknown carrier
  }

  // Get the best option's program
  const bestOption = flight.bestOption;
  if (!bestOption) return 50;

  // Score based on program accessibility (proxy for carrier quality)
  const program = PROGRAMS_BY_NAME[bestOption.program];
  const accessibilityScore = program?.accessibilityScore ?? 2;

  // Accessibility score: 1 (best) -> 3 (worst)
  // Convert to 0-100: score 1 = 100, score 2 = 75, score 3 = 50
  if (accessibilityScore === 1) return 100;
  if (accessibilityScore === 2) return 75;
  return 50;
}
