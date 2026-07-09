import type { FlightResult } from '@/lib/engine/types'
import * as signals from './signals'

export interface ScoringResult {
  overallScore: number
  breakdown: { cabin: number; accessibility: number; price: number; connections: number; layover: number; carrier: number }
  reasoning: string
}

export async function scoreFlights(
  flights: FlightResult[],
  userProgram: string,
  _bookingDate: Date
): Promise<Array<FlightResult & { scoringResult: ScoringResult }>> {
  return flights.map(flight => {
    const ctx = { flight, userProgram, bookingDate: new Date() }
    const cabin = signals.calculateCabinSignal(ctx)
    const accessibility = signals.calculateAccessibilitySignal(ctx)
    const price = signals.calculatePriceSignal(ctx)
    const connections = signals.calculateConnectionsSignal(ctx)
    const layover = signals.calculateLayoverSignal(ctx)
    const carrier = signals.calculateCarrierSignal(ctx)

    const overallScore = (cabin + accessibility + price + connections + layover + carrier) / 6

    return {
      ...flight,
      scoringResult: {
        overallScore,
        breakdown: { cabin, accessibility, price, connections, layover, carrier },
        reasoning: `Score: ${overallScore.toFixed(1)}/100`,
      },
    }
  })
}
