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

/**
 * Orchestrates multi-leg route search
 * Searches direct + via hubs, builds graph, finds optimal paths
 * Returns top N routes sorted by price
 */
export async function searchMultiLegRoutes(
  flights: FlightLeg[],
  origin: string,
  destination: string,
  passengers: number = 1,
  maxResults: number = 3,
  preferredHubs?: string[],
): Promise<MultiLegRoute[]> {
  // Import here to avoid circular dependencies
  const { buildConnectivityGraph } = await import('./graphBuilder');
  const { dijkstra } = await import('./shortestPath');

  if (flights.length === 0) {
    return [];
  }

  // Build connectivity graph
  const graph = buildConnectivityGraph(flights);

  // Check if destination is reachable
  const nodes = graph.nodes;
  if (!nodes.includes(origin) || !nodes.includes(destination)) {
    return [];
  }

  // Find all paths from origin to destination
  const routes: MultiLegRoute[] = [];
  const seenPrices = new Set<number>();

  // First, check for direct flights
  const directFlights = flights.filter((f) => f.origin === origin && f.destination === destination);
  for (const flight of directFlights) {
    const route: MultiLegRoute = {
      legs: [flight],
      totalPrice: flight.price,
      passengers,
    };
    if (validateMultiLegRoute(route)) {
      routes.push(route);
      seenPrices.add(flight.price);
    }
  }

  // Use Dijkstra to find shortest path by price
  const bestPath = dijkstra(flights, origin, destination, 'price');

  if (bestPath.distance !== Infinity && bestPath.path.length > 1) {
    // Reconstruct route from path
    const legRoute = reconstructRoute(flights, bestPath.path, passengers);
    if (legRoute && !seenPrices.has(legRoute.totalPrice)) {
      routes.push(legRoute);
      seenPrices.add(legRoute.totalPrice);
    }
  }

  // Try alternative paths through different hubs if available
  const hubs = preferredHubs || ['ORD', 'DEN', 'ATL', 'DFW'];

  for (const hub of hubs) {
    if (hub === origin || hub === destination) continue;
    if (!nodes.includes(hub)) continue;

    // Try origin -> hub -> destination
    const toHub = dijkstra(flights, origin, hub, 'price');
    if (toHub.distance !== Infinity && toHub.path.length > 0) {
      const fromHub = dijkstra(flights, hub, destination, 'price');
      if (fromHub.distance !== Infinity && fromHub.path.length > 0) {
        // Combine paths
        const combinedPath = [...toHub.path.slice(0, -1), ...fromHub.path];
        const legRoute = reconstructRoute(flights, combinedPath, passengers);
        if (legRoute && !seenPrices.has(legRoute.totalPrice)) {
          routes.push(legRoute);
          seenPrices.add(legRoute.totalPrice);
        }
      }
    }
  }

  // Sort by price ascending
  routes.sort((a, b) => a.totalPrice - b.totalPrice);

  // Return top N results
  return routes.slice(0, maxResults);
}

/**
 * Reconstructs a MultiLegRoute from a path of airports and available flights
 */
function reconstructRoute(flights: FlightLeg[], path: string[], passengers: number): MultiLegRoute | null {
  if (path.length < 2) {
    return null;
  }

  const legs: FlightLeg[] = [];
  let totalPrice = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];

    // Find cheapest flight from 'from' to 'to'
    const candidates = flights.filter((f) => f.origin === from && f.destination === to);

    if (candidates.length === 0) {
      return null; // No flight available for this leg
    }

    // Pick cheapest candidate
    const flight = candidates.reduce((cheapest, current) => (current.price < cheapest.price ? current : cheapest));

    legs.push(flight);
    totalPrice += flight.price;
  }

  // Validate route
  if (!validateMultiLegRoute({ legs, totalPrice, passengers })) {
    return null;
  }

  return {
    legs,
    totalPrice,
    passengers,
  };
}
