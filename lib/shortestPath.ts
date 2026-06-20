/**
 * Dijkstra Shortest Path Algorithm
 * Finds optimal multi-leg routes by price or time
 */

import { FlightLeg, MultiLegRoute } from '@/lib/multiLeg';

export interface DijkstraNode {
  airport: string;
  distance: number;
  predecessor?: string;
  flights?: FlightLeg[];
}

interface PathResult {
  path: string[];
  distance: number;
}

/**
 * Implements Dijkstra's algorithm to find shortest path by cost metric
 * Optimizes for 'price' or 'time'
 */
export function dijkstra(
  flights: FlightLeg[],
  origin: string,
  destination: string,
  optimizeBy: 'price' | 'time' = 'price',
): PathResult {
  // Same origin and destination
  if (origin === destination) {
    return { path: [origin], distance: 0 };
  }

  // Build adjacency list
  const graph: Record<string, FlightLeg[][]> = {};
  const nodes = new Set<string>();

  for (const flight of flights) {
    nodes.add(flight.origin);
    nodes.add(flight.destination);

    if (!graph[flight.origin]) {
      graph[flight.origin] = [];
    }

    // Check if we can add this flight to an existing outgoing edge
    let found = false;
    for (const edge of graph[flight.origin]) {
      if (edge[0].destination === flight.destination) {
        edge.push(flight);
        found = true;
        break;
      }
    }

    if (!found) {
      graph[flight.origin].push([flight]);
    }
  }

  // Destination not in any flights
  if (!nodes.has(destination)) {
    return { path: [], distance: Infinity };
  }

  // Dijkstra's algorithm
  const distances: Record<string, number> = {};
  const predecessors: Record<string, string | undefined> = {};
  const predecessorFlights: Record<string, FlightLeg> = {};
  const visited = new Set<string>();

  for (const node of nodes) {
    distances[node] = node === origin ? 0 : Infinity;
  }

  while (visited.size < nodes.size) {
    // Find unvisited node with minimum distance
    let minNode: string | null = null;
    let minDistance = Infinity;

    for (const node of nodes) {
      if (!visited.has(node) && distances[node] < minDistance) {
        minNode = node;
        minDistance = distances[node];
      }
    }

    if (minNode === null || minDistance === Infinity) {
      break;
    }

    visited.add(minNode);

    // Relax edges
    if (graph[minNode]) {
      for (const flightGroup of graph[minNode]) {
        for (const flight of flightGroup) {
          const nextNode = flight.destination;
          const cost = optimizeBy === 'price' ? flight.price : calculateFlightTime(flight);
          const newDistance = distances[minNode] + cost;

          if (newDistance < distances[nextNode]) {
            distances[nextNode] = newDistance;
            predecessors[nextNode] = minNode;
            predecessorFlights[nextNode] = flight;
          }
        }
      }
    }
  }

  // Check if destination is reachable
  if (distances[destination] === Infinity) {
    return { path: [], distance: Infinity };
  }

  // Reconstruct path
  const path: string[] = [];
  let current: string | undefined = destination;

  while (current !== undefined) {
    path.unshift(current);
    current = predecessors[current];
  }

  return {
    path,
    distance: distances[destination],
  };
}

/**
 * Finds the top N cheapest paths from origin to destination
 */
export function findPathsByPrice(
  flights: FlightLeg[],
  origin: string,
  destination: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _limit: number
): PathResult[] {
  // For now, return single best path
  const bestPath = dijkstra(flights, origin, destination, 'price');

  if (bestPath.distance === Infinity) {
    return [];
  }

  return [bestPath];
}

/**
 * Converts an array of flights to a MultiLegRoute
 */
export function convertFlightsToLegs(flights: FlightLeg[], passengers: number): MultiLegRoute {
  const totalPrice = flights.reduce((sum, flight) => sum + flight.price, 0);

  return {
    legs: flights,
    totalPrice,
    passengers,
  };
}

/**
 * Calculates connection time between two legs in minutes
 */
export function calculateConnectionTime(leg1: FlightLeg, leg2: FlightLeg): number {
  const arrival = new Date(leg1.arrivalTime).getTime();
  const departure = new Date(leg2.departureTime).getTime();
  return Math.round((departure - arrival) / (1000 * 60));
}

/**
 * Calculates flight duration in minutes
 */
function calculateFlightTime(flight: FlightLeg): number {
  const departure = new Date(flight.departureTime).getTime();
  const arrival = new Date(flight.arrivalTime).getTime();
  return Math.round((arrival - departure) / (1000 * 60));
}
