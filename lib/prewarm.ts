/**
 * Route pre-warming configuration for the hourly cron job.
 * Keeps popular routes cached and ready for the first user.
 */

export interface PreWarmRoute {
  from: string;
  to: string;
  name: string;
}

/**
 * Top 20 most popular corridors by traffic volume.
 * Prioritized for pre-warming cache to reduce cold start latency.
 */
export const TOP_ROUTES: PreWarmRoute[] = [
  { from: "SIN", to: "LAX", name: "Singapore → Los Angeles" },
  { from: "SIN", to: "JFK", name: "Singapore → New York" },
  { from: "CDG", to: "JFK", name: "Paris → New York" },
  { from: "NRT", to: "LAX", name: "Tokyo → Los Angeles" },
  { from: "DXB", to: "LHR", name: "Dubai → London" },
  { from: "LHR", to: "LAX", name: "London → Los Angeles" },
  { from: "CDG", to: "LAX", name: "Paris → Los Angeles" },
  { from: "BKK", to: "SYD", name: "Bangkok → Sydney" },
  { from: "HND", to: "LAX", name: "Tokyo → Los Angeles" },
  { from: "LAX", to: "JFK", name: "Los Angeles → New York" },
  { from: "SFO", to: "LHR", name: "San Francisco → London" },
  { from: "ORD", to: "LHR", name: "Chicago → London" },
  { from: "DXB", to: "JFK", name: "Dubai → New York" },
  { from: "SYD", to: "LAX", name: "Sydney → Los Angeles" },
  { from: "NRT", to: "JFK", name: "Tokyo → New York" },
  { from: "SGN", to: "LAX", name: "Ho Chi Minh → Los Angeles" },
  { from: "KUL", to: "LAX", name: "Kuala Lumpur → Los Angeles" },
  { from: "BKK", to: "LAX", name: "Bangkok → Los Angeles" },
  { from: "ICN", to: "LAX", name: "Seoul → Los Angeles" },
  { from: "HKG", to: "LAX", name: "Hong Kong → Los Angeles" },
];

/**
 * Generate departure dates for the next 90 days, every 7 days.
 * Starts 15 days out (avoids immediate future noise).
 * Returns YYYY-MM-DD format strings.
 */
export function getPreWarmDates(): string[] {
  const dates: string[] = [];
  const today = new Date();

  // Generate dates 15, 22, 29, 36... days from today (every 7 days)
  for (let i = 15; i < 90; i += 7) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split("T")[0]);
  }

  return dates;
}
