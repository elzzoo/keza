// Confidence penalty multipliers applied to flight prices based on data source reliability
// Used to adjust ranking when comparing Duffel (HIGH/real-time) vs Travelpayouts (LOW/cached) vs synthetic flights
export const CONFIDENCE_PENALTY: Record<string, number> = {
  HIGH: 1.00,      // Duffel real-time prices — no penalty
  LOW: 1.05,       // Travelpayouts cache-based — +5% cost adjustment for ranking
  ESTIMATED: 1.10, // Synthetic flights — +10% cost adjustment for ranking
};
