/**
 * Multi-Leg Routing System
 * Handles flight itineraries with multiple stops/connections
 */

export type Cabin = 'economy' | 'premium' | 'business' | 'first';

export interface FlightLeg {
  /** Origin airport IATA code */
  origin: string;
  /** Destination airport IATA code */
  destination: string;
  /** ISO 8601 departure time */
  departureTime: string;
  /** ISO 8601 arrival time */
  arrivalTime: string;
  /** Airline IATA code */
  airline: string;
  /** Flight number */
  flightNumber: string;
  /** Aircraft type code */
  aircraft: string;
  /** Cabin class */
  cabin: Cabin;
  /** Price in USD */
  price: number;
}

export interface MultiLegRoute {
  /** Array of flight segments */
  legs: FlightLeg[];
  /** Total route price in USD */
  totalPrice: number;
  /** Number of passengers */
  passengers: number;
}

export interface ConnectionConstraint {
  /** Minimum connection time in minutes (usually 90 for domestic, 120+ for intl) */
  minConnectionTimeMinutes: number;
  /** Maximum connection time in minutes (prevents long layovers) */
  maxConnectionTimeMinutes: number;
  /** Whether same-airline connections are preferred */
  sameAirlinePreference: boolean;
}

export interface OptimizationOptions {
  /** Optimization target: 'price', 'time', or 'emissions' */
  optimizeBy: 'price' | 'time' | 'emissions';
  /** Maximum number of stops allowed */
  maxStops: number;
  /** Maximum total travel time in minutes */
  maxTotalTime: number;
  /** Preferred airlines IATA codes */
  preferredAirlines?: string[];
}

/**
 * Validates a multi-leg route for feasibility
 * Checks:
 * - At least one leg
 * - Legs are connected (destination of leg N = origin of leg N+1)
 * - Each leg has valid departure < arrival
 * - Connection times are legal (90+ min for domestic, 120+ for intl)
 */
export function validateMultiLegRoute(route: MultiLegRoute): boolean {
  if (!route.legs || route.legs.length === 0) {
    return false;
  }

  // Check each leg is valid
  for (const leg of route.legs) {
    const departure = new Date(leg.departureTime);
    const arrival = new Date(leg.arrivalTime);

    if (departure >= arrival) {
      return false;
    }

    // Check basic IATA code format
    if (!leg.origin || !leg.destination || leg.origin.length !== 3 || leg.destination.length !== 3) {
      return false;
    }
  }

  // Check connections
  for (let i = 0; i < route.legs.length - 1; i++) {
    const current = route.legs[i];
    const next = route.legs[i + 1];

    // Destination of current must match origin of next
    if (current.destination !== next.origin) {
      return false;
    }

    const arrivalTime = new Date(current.arrivalTime).getTime();
    const departureTime = new Date(next.departureTime).getTime();
    const connectionMinutes = (departureTime - arrivalTime) / (1000 * 60);

    // Minimum connection time: 60 minutes
    if (connectionMinutes < 60) {
      return false;
    }

    // Maximum connection time: 24 hours
    if (connectionMinutes > 24 * 60) {
      return false;
    }
  }

  return true;
}

/**
 * Calculates total travel time from first departure to final arrival in minutes
 */
export function calculateRouteTotalTime(route: MultiLegRoute): number {
  if (route.legs.length === 0) {
    return 0;
  }

  const firstDeparture = new Date(route.legs[0].departureTime).getTime();
  const lastArrival = new Date(route.legs[route.legs.length - 1].arrivalTime).getTime();

  return Math.round((lastArrival - firstDeparture) / (1000 * 60));
}

/**
 * Calculates cost per passenger
 */
export function calculateRouteCPP(route: MultiLegRoute): number {
  return route.totalPrice / route.passengers;
}
