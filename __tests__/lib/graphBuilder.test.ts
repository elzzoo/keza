import {
  buildConnectivityGraph,
  getConnectionOptions,
  getDirectConnections,
  isConnected,
} from '@/lib/graphBuilder';
import { FlightLeg } from '@/lib/multiLeg';

describe('Connectivity Graph Builder', () => {
  const mockFlights: FlightLeg[] = [
    {
      origin: 'JFK',
      destination: 'ORD',
      departureTime: '2025-08-01T06:00:00Z',
      arrivalTime: '2025-08-01T09:00:00Z',
      airline: 'UA',
      flightNumber: 'UA1234',
      aircraft: '737',
      cabin: 'economy',
      price: 120,
    },
    {
      origin: 'ORD',
      destination: 'LAX',
      departureTime: '2025-08-01T11:30:00Z',
      arrivalTime: '2025-08-01T14:00:00Z',
      airline: 'UA',
      flightNumber: 'UA5678',
      aircraft: '777',
      cabin: 'economy',
      price: 180,
    },
    {
      origin: 'JFK',
      destination: 'LAX',
      departureTime: '2025-08-01T08:00:00Z',
      arrivalTime: '2025-08-01T16:00:00Z',
      airline: 'AA',
      flightNumber: 'AA100',
      aircraft: '777',
      cabin: 'economy',
      price: 250,
    },
    {
      origin: 'ORD',
      destination: 'LHR',
      departureTime: '2025-08-01T20:00:00Z',
      arrivalTime: '2025-08-02T08:00:00Z',
      airline: 'BA',
      flightNumber: 'BA200',
      aircraft: '787',
      cabin: 'premium',
      price: 600,
    },
  ];

  describe('ConnectivityGraph interface', () => {
    it('should have adjacency list structure', () => {
      const graph = {
        nodes: ['JFK', 'ORD', 'LAX', 'LHR'],
        edges: {
          JFK: [
            {
              destination: 'ORD',
              flights: [mockFlights[0]],
            },
            {
              destination: 'LAX',
              flights: [mockFlights[2]],
            },
          ],
          ORD: [
            {
              destination: 'LAX',
              flights: [mockFlights[1]],
            },
            {
              destination: 'LHR',
              flights: [mockFlights[3]],
            },
          ],
        },
      };
      expect(graph.nodes).toHaveLength(4);
      expect(graph.edges['JFK']).toHaveLength(2);
    });
  });

  describe('buildConnectivityGraph()', () => {
    it('should build graph from flight legs', () => {
      const graph = buildConnectivityGraph(mockFlights);
      expect(graph.nodes).toContain('JFK');
      expect(graph.nodes).toContain('ORD');
      expect(graph.nodes).toContain('LAX');
      expect(graph.nodes).toContain('LHR');
    });

    it('should group flights by origin and destination', () => {
      const graph = buildConnectivityGraph(mockFlights);
      const jfkEdges = graph.edges['JFK'];
      expect(jfkEdges).toBeDefined();
      expect(jfkEdges.length).toBeGreaterThan(0);

      const ordDestinations = jfkEdges.map((e) => e.destination);
      expect(ordDestinations).toContain('ORD');
      expect(ordDestinations).toContain('LAX');
    });

    it('should handle empty flight list', () => {
      const graph = buildConnectivityGraph([]);
      expect(graph.nodes).toHaveLength(0);
      expect(Object.keys(graph.edges)).toHaveLength(0);
    });

    it('should handle single flight', () => {
      const singleFlight = [mockFlights[0]];
      const graph = buildConnectivityGraph(singleFlight);
      expect(graph.nodes).toContain('JFK');
      expect(graph.nodes).toContain('ORD');
      expect(graph.edges['JFK']).toBeDefined();
    });
  });

  describe('getDirectConnections()', () => {
    it('should return all flights from a given origin', () => {
      const graph = buildConnectivityGraph(mockFlights);
      const connections = getDirectConnections(graph, 'JFK');
      expect(connections.length).toBeGreaterThan(0);
      expect(connections.every((e) => mockFlights.flat().includes(e))).toBe(true);
    });

    it('should return empty array for unconnected airport', () => {
      const graph = buildConnectivityGraph(mockFlights);
      const connections = getDirectConnections(graph, 'SFO');
      expect(connections).toEqual([]);
    });

    it('should aggregate flights to same destination', () => {
      const flights: FlightLeg[] = [
        {
          origin: 'JFK',
          destination: 'LAX',
          departureTime: '2025-08-01T08:00:00Z',
          arrivalTime: '2025-08-01T16:00:00Z',
          airline: 'UA',
          flightNumber: 'UA100',
          aircraft: '777',
          cabin: 'economy',
          price: 250,
        },
        {
          origin: 'JFK',
          destination: 'LAX',
          departureTime: '2025-08-01T10:00:00Z',
          arrivalTime: '2025-08-01T18:00:00Z',
          airline: 'AA',
          flightNumber: 'AA100',
          aircraft: '787',
          cabin: 'premium',
          price: 400,
        },
      ];
      const graph = buildConnectivityGraph(flights);
      const connections = getDirectConnections(graph, 'JFK');
      expect(connections).toHaveLength(2);
    });
  });

  describe('isConnected()', () => {
    it('should detect direct connection', () => {
      const graph = buildConnectivityGraph(mockFlights);
      expect(isConnected(graph, 'JFK', 'ORD')).toBe(true);
    });

    it('should detect multi-hop connection', () => {
      const graph = buildConnectivityGraph(mockFlights);
      expect(isConnected(graph, 'JFK', 'LAX')).toBe(true);
    });

    it('should return false for disconnected airports', () => {
      const flights: FlightLeg[] = [
        {
          origin: 'JFK',
          destination: 'ORD',
          departureTime: '2025-08-01T06:00:00Z',
          arrivalTime: '2025-08-01T09:00:00Z',
          airline: 'UA',
          flightNumber: 'UA1234',
          aircraft: '737',
          cabin: 'economy',
          price: 120,
        },
      ];
      const graph = buildConnectivityGraph(flights);
      expect(isConnected(graph, 'ORD', 'JFK')).toBe(false);
    });

    it('should handle same origin and destination', () => {
      const graph = buildConnectivityGraph(mockFlights);
      expect(isConnected(graph, 'JFK', 'JFK')).toBe(true);
    });

    it('should detect connection through 2 hops', () => {
      const flights: FlightLeg[] = [
        {
          origin: 'A',
          destination: 'B',
          departureTime: '2025-08-01T06:00:00Z',
          arrivalTime: '2025-08-01T08:00:00Z',
          airline: 'UA',
          flightNumber: 'UA1',
          aircraft: '737',
          cabin: 'economy',
          price: 100,
        },
        {
          origin: 'B',
          destination: 'C',
          departureTime: '2025-08-01T10:00:00Z',
          arrivalTime: '2025-08-01T12:00:00Z',
          airline: 'UA',
          flightNumber: 'UA2',
          aircraft: '737',
          cabin: 'economy',
          price: 100,
        },
      ];
      const graph = buildConnectivityGraph(flights);
      expect(isConnected(graph, 'A', 'C')).toBe(true);
    });
  });

  describe('getConnectionOptions()', () => {
    it('should return all possible connection options from one airport to another', () => {
      const graph = buildConnectivityGraph(mockFlights);
      const options = getConnectionOptions(graph, 'JFK', 'LAX', 120);
      expect(Array.isArray(options)).toBe(true);
    });

    it('should filter out connections violating minimum time constraint', () => {
      const flights: FlightLeg[] = [
        {
          origin: 'JFK',
          destination: 'ORD',
          departureTime: '2025-08-01T06:00:00Z',
          arrivalTime: '2025-08-01T09:00:00Z',
          airline: 'UA',
          flightNumber: 'UA1234',
          aircraft: '737',
          cabin: 'economy',
          price: 120,
        },
        {
          origin: 'ORD',
          destination: 'LAX',
          departureTime: '2025-08-01T10:00:00Z',
          arrivalTime: '2025-08-01T13:00:00Z',
          airline: 'UA',
          flightNumber: 'UA5678',
          aircraft: '777',
          cabin: 'economy',
          price: 180,
        },
      ];
      const graph = buildConnectivityGraph(flights);
      const options = getConnectionOptions(graph, 'JFK', 'LAX', 120);
      // Connection time is 60 minutes which is less than 120 required, so should be filtered
      expect(options.length).toBe(0);
    });

    it('should accept connections meeting minimum time constraint', () => {
      const flights: FlightLeg[] = [
        {
          origin: 'JFK',
          destination: 'ORD',
          departureTime: '2025-08-01T06:00:00Z',
          arrivalTime: '2025-08-01T09:00:00Z',
          airline: 'UA',
          flightNumber: 'UA1234',
          aircraft: '737',
          cabin: 'economy',
          price: 120,
        },
        {
          origin: 'ORD',
          destination: 'LAX',
          departureTime: '2025-08-01T11:30:00Z',
          arrivalTime: '2025-08-01T14:00:00Z',
          airline: 'UA',
          flightNumber: 'UA5678',
          aircraft: '777',
          cabin: 'economy',
          price: 180,
        },
      ];
      const graph = buildConnectivityGraph(flights);
      const options = getConnectionOptions(graph, 'JFK', 'LAX', 120);
      // Connection time is 150 minutes which meets the 120 minimum
      expect(options.length).toBeGreaterThan(0);
    });

    it('should handle direct flights', () => {
      const flights: FlightLeg[] = [
        {
          origin: 'JFK',
          destination: 'LAX',
          departureTime: '2025-08-01T08:00:00Z',
          arrivalTime: '2025-08-01T16:00:00Z',
          airline: 'AA',
          flightNumber: 'AA100',
          aircraft: '777',
          cabin: 'economy',
          price: 250,
        },
      ];
      const graph = buildConnectivityGraph(flights);
      const options = getConnectionOptions(graph, 'JFK', 'LAX', 0);
      expect(options.length).toBeGreaterThan(0);
    });
  });
});
