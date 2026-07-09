export interface PriceAlert {
  id: string
  userId: string
  from: string
  to: string
  departDate: Date
  priceThreshold: number
  frequency: 'instant' | 'daily'
  active: boolean
  createdAt: Date
}

export async function createPriceAlert(
  userId: string,
  from: string,
  to: string,
  departDate: Date,
  priceThreshold: number,
  frequency: 'instant' | 'daily'
): Promise<PriceAlert> {
  return {
    id: Math.random().toString(36),
    userId,
    from,
    to,
    departDate,
    priceThreshold,
    frequency,
    active: true,
    createdAt: new Date(),
  }
}

export async function checkAndFireAlerts(_from: string, _to: string, _currentPrice: number): Promise<void> {
  // Placeholder for alert checking logic
}
