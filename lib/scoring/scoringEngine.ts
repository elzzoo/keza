// lib/scoring/scoringEngine.ts
// Main scoring engine for P5.2: aggregates 6 signals into overall score

import * as signals from "./signals";
import type { FlightResult } from "@/lib/engine/types";

export interface ScoringResult {
  overallScore: number; // 0-100
  breakdown: {
    cabin: number;
    accessibility: number;
    price: number;
    connections: number;
    layover: number;
    carrier: number;
  };
  reasoning: string;
}

/**
 * Score and rank flights using a 6-signal aggregation model.
 * Equal weighting for MVP (1/6 each), extensible for future tuning.
 *
 * @param flights - Array of flight results to score
 * @param userProgram - Optional user's preferred program (for future personalization)
 * @param bookingDate - Current date for context
 * @returns Scored flight results with breakdown
 */
export async function scoreFlights(
  flights: FlightResult[],
  userProgram?: string,
  bookingDate: Date = new Date()
): Promise<Array<FlightResult & { scoringResult: ScoringResult }>> {
  return flights.map((flight) => {
    const ctx: signals.SignalContext = {
      flight,
      userProgram,
      bookingDate,
    };

    // Calculate all 6 signals
    const cabin = signals.calculateCabinSignal(ctx);
    const accessibility = signals.calculateAccessibilitySignal(ctx);
    const price = signals.calculatePriceSignal(ctx);
    const connections = signals.calculateConnectionsSignal(ctx);
    const layover = signals.calculateLayoverSignal(ctx);
    const carrier = signals.calculateCarrierSignal(ctx);

    // Weighted average (equal weights for MVP: 1/6 each)
    const overallScore = (cabin + accessibility + price + connections + layover + carrier) / 6;

    return {
      ...flight,
      scoringResult: {
        overallScore: Math.round(overallScore * 10) / 10, // Round to 1 decimal
        breakdown: {
          cabin: Math.round(cabin * 10) / 10,
          accessibility: Math.round(accessibility * 10) / 10,
          price: Math.round(price * 10) / 10,
          connections: Math.round(connections * 10) / 10,
          layover: Math.round(layover * 10) / 10,
          carrier: Math.round(carrier * 10) / 10,
        },
        reasoning: `Overall: ${(Math.round(overallScore * 10) / 10).toFixed(1)}/100`,
      },
    };
  });
}
