import type { FlightResult } from '@/lib/engine/types'

export interface SignalContext {
  flight: FlightResult
  userProgram: string
  bookingDate: Date
  historicalData?: Record<string, any>
}

export function calculateCabinSignal(ctx: SignalContext): number {
  const cabin = ctx.flight.cabin?.toLowerCase() || 'economy'
  const cabinScores: Record<string, number> = {
    'economy': 20,
    'premium-economy': 50,
    'business': 80,
    'first': 100,
  }
  return cabinScores[cabin] || 20
}

export function calculateAccessibilitySignal(ctx: SignalContext): number {
  return Math.min(100, (ctx.flight.milesOptions?.length || 0) * 2.5)
}

export function calculatePriceSignal(ctx: SignalContext): number {
  const price = ctx.flight.totalPrice || ctx.flight.price || 0
  return Math.max(0, 100 - (price / 5000) * 100)
}

export function calculateConnectionsSignal(ctx: SignalContext): number {
  const stops = ctx.flight.stops || 0
  return stops === 0 ? 100 : stops === 1 ? 70 : 40
}

export function calculateLayoverSignal(ctx: SignalContext): number {
  const duration = ctx.flight.duration || 0
  const durationHours = duration / 60
  return durationHours < 2 ? 100 : durationHours < 4 ? 80 : durationHours < 8 ? 50 : 20
}

export function calculateCarrierSignal(ctx: SignalContext): number {
  return 75
}
