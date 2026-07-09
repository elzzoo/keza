import { createHash } from 'crypto'

export type ABCohort = 'baseline' | 'signal' | 'ml'

export function assignCohort(userId: string): ABCohort {
  const hash = createHash('md5').update(userId).digest('hex')
  const value = parseInt(hash.substring(0, 8), 16) / 0xffffffff
  
  if (value < 0.33) return 'baseline'
  if (value < 0.66) return 'signal'
  return 'ml'
}

export async function trackConversion(_userId: string, _cohort: ABCohort, _booked: boolean, _value: number): Promise<void> {
  // Placeholder for analytics tracking
}
