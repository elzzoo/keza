/**
 * Connectivity Graph Builder
 * Creates a directed graph from flights for efficient routing
 */

import { FlightLeg } from '@/lib/multiLeg';

export interface GraphEdge {
  destination: string;
  flights: FlightLeg[];
}

export interface ConnectivityGraph {
  /** Set of all unique airports in the graph */
  nodes: string[];
  /** Adjacency list: origin -> [destinations and their flights] */
  edges: Record<string, GraphEdge[]>;
}

/**
 * Builds a connectivity graph from a list of flights
 * Groups flights by origin and destination for efficient routing queries
 */
export function buildConnectivityGraph(flights: FlightLeg[]): ConnectivityGraph {
  const nodes = new Set<string>();
  const edges: Record<string, GraphEdge[]> = {};

  for (const flight of flights) {
    // Add nodes
    nodes.add(flight.origin);
    nodes.add(flight.destination);

    // Initialize origin in edges if not present
    if (!edges[flight.origin]) {
      edges[flight.origin] = [];
    }

    // Find or create edge for this destination
    let edge = edges[flight.origin].find((e) => e.destination === flight.destination);
    if (!edge) {
      edge = {
        destination: flight.destination,
        flights: [],
      };
      edges[flight.origin].push(edge);
    }

    // Add flight to edge
    edge.flights.push(flight);
  }

  return {
    nodes: Array.from(nodes),
    edges,
  };
}

/**
 * Gets all direct flight options from an origin airport
 */
export function getDirectConnections(graph: ConnectivityGraph, origin: string): FlightLeg[] {
  const edges = graph.edges[origin];
  if (!edges) {
    return [];
  }

  const flights: FlightLeg[] = [];
  for (const edge of edges) {
    flights.push(...edge.flights);
  }
  return flights;
}

/**
 * Checks if there is any path between two airports in the graph
 * Uses BFS for efficient connectivity check
 */
export function isConnected(graph: ConnectivityGraph, origin: string, destination: string): boolean {
  // Same airport is connected to itself
  if (origin === destination) {
    return true;
  }

  // BFS to find path
  const visited = new Set<string>();
  const queue: string[] = [origin];
  visited.add(origin);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const edges = graph.edges[current];

    if (!edges) {
      continue;
    }

    for (const edge of edges) {
      if (edge.destination === destination) {
        return true;
      }

      if (!visited.has(edge.destination)) {
        visited.add(edge.destination);
        queue.push(edge.destination);
      }
    }
  }

  return false;
}

/**
 * Finds all possible connection paths from origin to destination
 * Respects minimum connection time constraint
 */
export function getConnectionOptions(
  graph: ConnectivityGraph,
  origin: string,
  destination: string,
  minConnectionTimeMinutes: number,
): FlightLeg[][] {
  const options: FlightLeg[][] = [];

  // DFS to find all paths
  const visited = new Set<string>();
  const path: FlightLeg[] = [];

  function dfs(currentOrigin: string, currentDestination: string): void {
    if (currentOrigin === currentDestination) {
      // Found a valid path
      options.push([...path]);
      return;
    }

    // Prevent infinite loops
    if (visited.has(currentOrigin)) {
      return;
    }

    visited.add(currentOrigin);
    const edges = graph.edges[currentOrigin];

    if (edges) {
      for (const edge of edges) {
        // Filter flights by connection time if path is not empty
        let validFlights = edge.flights;

        if (path.length > 0) {
          const lastFlight = path[path.length - 1];
          const lastArrival = new Date(lastFlight.arrivalTime).getTime();

          validFlights = edge.flights.filter((flight) => {
            const nextDeparture = new Date(flight.departureTime).getTime();
            const connectionMinutes = (nextDeparture - lastArrival) / (1000 * 60);
            return connectionMinutes >= minConnectionTimeMinutes;
          });
        }

        // Try each valid flight
        for (const flight of validFlights) {
          path.push(flight);
          dfs(flight.destination, currentDestination);
          path.pop();
        }
      }
    }

    visited.delete(currentOrigin);
  }

  // Start DFS from origin
  if (origin === destination) {
    // Direct case handled separately
    const edges = graph.edges[origin];
    if (edges) {
      for (const edge of edges) {
        if (edge.destination === destination) {
          options.push(...edge.flights.map((f) => [f]));
        }
      }
    }
  } else {
    dfs(origin, destination);
  }

  return options;
}
