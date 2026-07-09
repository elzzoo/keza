export interface BookingWindowPrediction {
  bestDay: number
  confidence: number
  priceEstimate: number
}

export async function predictBookingWindow(_from: string, _to: string, _departDate: Date): Promise<BookingWindowPrediction> {
  return {
    bestDay: 21,
    confidence: 0.5,
    priceEstimate: 0,
  }
}
