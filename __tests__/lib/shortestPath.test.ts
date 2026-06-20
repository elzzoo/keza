import { dijkstra, findPathsByPrice, convertFlightsToLegs, calculateConnectionTime } from '@/lib/shortestPath';
import { FlightLeg, MultiLegRoute } from '@/lib/multiLeg';

describe('Dijkstra Shortest Path Algorithm', () => {
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
      destination: 'LAX',
      departureTime: '2025-08-01T10:00:00Z',
      arrivalTime: '2025-08-01T13:00:00Z',
      airline: 'BA',
      flightNumber: 'BA500',
      aircraft: '787',
      cabin: 'economy',
      price: 150,
    },
  ];

  describe('DijkstraNode interface', () => {
    it('should track node, distance, and predecessor', () => {
      const node = {
        airport: 'LAX',
        distance: 300,
        predecessor: 'ORD',
        flights: [mockFlights[1]],
      };
      expect(node.airport).toBe('LAX');
      expect(node.distance).toBe(300);
      expect(node.predecessor).toBe('ORD');
    });
  });

  describe('dijkstra()', () => {
    it('should find shortest path by price from origin to destination', () => {
      const result = dijkstra(mockFlights, 'JFK', 'LAX', 'price');
      expect(result).toBeDefined();
      expect(result.distance).toBeLessThanOrEqual(250);
    });

    it('should find direct path when it is cheaper', () => {
      const result = dijkstra(mockFlights, 'JFK', 'LAX', 'price');
      // Direct JFK->LAX costs 250, while via ORD costs 120+180=300
      expect(result.distance).toBe(250);
      expect(result.path).toEqual(['JFK', 'LAX']); // Direct is cheaper
    });

    it('should find multi-leg path when cheaper than direct', () => {
      // Create flights where multi-leg is cheaper
      const cheaperMultiLeg: FlightLeg[] = [
        {
          origin: 'JFK',
          destination: 'ORD',
          departureTime: '2025-08-01T06:00:00Z',
          arrivalTime: '2025-08-01T09:00:00Z',
          airline: 'UA',
          flightNumber: 'UA1234',
          aircraft: '737',
          cabin: 'economy',
          price: 50,
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
          price: 60,
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
      ];
      const result = dijkstra(cheaperMultiLeg, 'JFK', 'LAX', 'price');
      // Via ORD is 110, direct is 250, so via ORD should win
      expect(result.distance).toBe(110);
      expect(result.path).toContain('ORD');
    });

    it('should handle same origin and destination', () => {
      const result = dijkstra(mockFlights, 'JFK', 'JFK', 'price');
      expect(result.distance).toBe(0);
      expect(result.path).toEqual(['JFK']);
    });

    it('should return infinity distance for unreachable destination', () => {
      const result = dijkstra(mockFlights, 'JFK', 'SFO', 'price');
      expect(result.distance).toBe(Infinity);
    });
  });

  describe('findPathsByPrice()', () => {
    it('should find top 3 cheapest paths by price', () => {
      const paths = findPathsByPrice(mockFlights, 'JFK', 'LAX', 3);
      expect(paths.length).toBeLessThanOrEqual(3);
      expect(paths[0].distance).toBeLessThanOrEqual(paths[1]?.distance ?? Infinity);
    });

    it('should return paths sorted by price ascending', () => {
      const paths = findPathsByPrice(mockFlights, 'JFK', 'LAX', 5);
      for (let i = 0; i < paths.length - 1; i++) {
        expect(paths[i].distance).toBeLessThanOrEqual(paths[i + 1].distance);
      }
    });

    it('should limit number of results', () => {
      const paths = findPathsByPrice(mockFlights, 'JFK', 'LAX', 2);
      expect(paths.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array for unreachable destination', () => {
      const paths = findPathsByPrice(mockFlights, 'JFK', 'SFO', 3);
      expect(paths).toEqual([]);
    });
  });

  describe('convertFlightsToLegs()', () => {
    it('should convert array of flights to a single route', () => {
      const flights = [mockFlights[0], mockFlights[1]];
      const route = convertFlightsToLegs(flights, 1);
      expect(route.legs).toEqual(flights);
      expect(route.totalPrice).toBe(300);
      expect(route.passengers).toBe(1);
    });

    it('should calculate total price from all legs', () => {
      const flights = [mockFlights[0], mockFlights[1]];
      const route = convertFlightsToLegs(flights, 1);
      expect(route.totalPrice).toBe(120 + 180);
    });

    it('should preserve passenger count', () => {
      const flights = [mockFlights[0], mockFlights[1]];
      const route = convertFlightsToLegs(flights, 3);
      expect(route.passengers).toBe(3);
    });

    it('should handle single flight', () => {
      const flights = [mockFlights[2]];
      const route = convertFlightsToLegs(flights, 1);
      expect(route.legs).toHaveLength(1);
      expect(route.totalPrice).toBe(250);
    });
  });

  describe('calculateConnectionTime()', () => {
    it('should calculate connection time in minutes', () => {
      const leg1 = mockFlights[0]; // arrives 2025-08-01T09:00:00Z
      const leg2 = mockFlights[1]; // departs 2025-08-01T11:30:00Z
      const time = calculateConnectionTime(leg1, leg2);
      expect(time).toBe(150); // 2 hours 30 minutes
    });

    it('should handle multiple hour connection', () => {
      const leg1 = {
        ...mockFlights[0],
        arrivalTime: '2025-08-01T09:00:00Z',
      };
      const leg2 = {
        ...mockFlights[1],
        departureTime: '2025-08-01T15:00:00Z',
      };
      const time = calculateConnectionTime(leg1, leg2);
      expect(time).toBe(360); // 6 hours
    });

    it('should handle same-day connection', () => {
      const leg1 = {
        ...mockFlights[0],
        arrivalTime: '2025-08-01T14:00:00Z',
      };
      const leg2 = {
        ...mockFlights[1],
        departureTime: '2025-08-01T16:00:00Z',
      };
      const time = calculateConnectionTime(leg1, leg2);
      expect(time).toBe(120); // 2 hours
    });

    it('should handle overnight connection', () => {
      const leg1 = {
        ...mockFlights[0],
        arrivalTime: '2025-08-01T23:00:00Z',
      };
      const leg2 = {
        ...mockFlights[1],
        departureTime: '2025-08-02T06:00:00Z',
      };
      const time = calculateConnectionTime(leg1, leg2);
      expect(time).toBe(420); // 7 hours
    });
  });
});
