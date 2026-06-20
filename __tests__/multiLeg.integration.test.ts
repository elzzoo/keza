import { searchMultiLegRoutes } from '@/lib/multiLeg';
import { FlightLeg, MultiLegRoute } from '@/lib/multiLeg';

describe('Multi-Leg Integration Tests', () => {
  const mockFlights: FlightLeg[] = [
    // Direct flights
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
    // Via ORD - leg 1
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
    // Via ORD - leg 2
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
    // Via DEN - leg 1
    {
      origin: 'JFK',
      destination: 'DEN',
      departureTime: '2025-08-01T07:00:00Z',
      arrivalTime: '2025-08-01T09:30:00Z',
      airline: 'UA',
      flightNumber: 'UA2000',
      aircraft: '737',
      cabin: 'economy',
      price: 100,
    },
    // Via DEN - leg 2
    {
      origin: 'DEN',
      destination: 'LAX',
      departureTime: '2025-08-01T12:00:00Z',
      arrivalTime: '2025-08-01T13:30:00Z',
      airline: 'UA',
      flightNumber: 'UA3000',
      aircraft: '737',
      cabin: 'economy',
      price: 140,
    },
  ];

  describe('searchMultiLegRoutes()', () => {
    it('should search for multi-leg routes from origin to destination', async () => {
      const routes = await searchMultiLegRoutes(mockFlights, 'JFK', 'LAX', 1, 3);
      expect(Array.isArray(routes)).toBe(true);
      expect(routes.length).toBeGreaterThan(0);
    });

    it('should return routes sorted by price ascending', async () => {
      const routes = await searchMultiLegRoutes(mockFlights, 'JFK', 'LAX', 1, 3);
      for (let i = 0; i < routes.length - 1; i++) {
        expect(routes[i].totalPrice).toBeLessThanOrEqual(routes[i + 1].totalPrice);
      }
    });

    it('should limit results to requested count', async () => {
      const routes = await searchMultiLegRoutes(mockFlights, 'JFK', 'LAX', 1, 2);
      expect(routes.length).toBeLessThanOrEqual(2);
    });

    it('should include direct flight option', async () => {
      const routes = await searchMultiLegRoutes(mockFlights, 'JFK', 'LAX', 1, 3);
      const directRoute = routes.find((r) => r.legs.length === 1);
      expect(directRoute).toBeDefined();
      expect(directRoute?.totalPrice).toBe(250);
    });

    it('should find cheapest via-ORD route', async () => {
      const routes = await searchMultiLegRoutes(mockFlights, 'JFK', 'LAX', 1, 3);
      const viaORD = routes.find((r) => r.legs.some((l) => l.destination === 'ORD'));
      expect(viaORD).toBeDefined();
      expect(viaORD?.totalPrice).toBe(300); // 120 + 180
    });

    it('should find cheapest via-DEN route', async () => {
      const routes = await searchMultiLegRoutes(mockFlights, 'JFK', 'LAX', 1, 3);
      const viaDEN = routes.find((r) => r.legs.some((l) => l.destination === 'DEN'));
      expect(viaDEN).toBeDefined();
      expect(viaDEN?.totalPrice).toBe(240); // 100 + 140
    });

    it('should rank cheapest route first', async () => {
      const routes = await searchMultiLegRoutes(mockFlights, 'JFK', 'LAX', 1, 3);
      // Cheapest should be via DEN (240), not direct (250) or via ORD (300)
      expect(routes[0].totalPrice).toBe(240);
    });

    it('should handle single passenger', async () => {
      const routes = await searchMultiLegRoutes(mockFlights, 'JFK', 'LAX', 1, 3);
      expect(routes[0].passengers).toBe(1);
    });

    it('should handle multiple passengers', async () => {
      const routes = await searchMultiLegRoutes(mockFlights, 'JFK', 'LAX', 3, 3);
      expect(routes[0].passengers).toBe(3);
      // Price should be per-leg, not multiplied
      const totalLegsPrice = routes[0].legs.reduce((sum, leg) => sum + leg.price, 0);
      expect(routes[0].totalPrice).toBe(totalLegsPrice);
    });

    it('should return empty array for unreachable destination', async () => {
      const routes = await searchMultiLegRoutes(mockFlights, 'JFK', 'SFO', 1, 3);
      expect(routes).toEqual([]);
    });

    it('should support custom hub filtering', async () => {
      const routes = await searchMultiLegRoutes(mockFlights, 'JFK', 'LAX', 1, 3, ['DEN']);
      const hasDEN = routes.some((r) => r.legs.some((l) => l.destination === 'DEN' || l.origin === 'DEN'));
      expect(hasDEN).toBe(true);
    });

    it('should respect max stops constraint', async () => {
      const routes = await searchMultiLegRoutes(mockFlights, 'JFK', 'LAX', 1, 3);
      // All routes should have at most 2 legs (1 stop)
      expect(routes.every((r) => r.legs.length <= 2)).toBe(true);
    });

    it('should validate all returned routes', async () => {
      const routes = await searchMultiLegRoutes(mockFlights, 'JFK', 'LAX', 1, 3);
      for (const route of routes) {
        expect(route.legs.length).toBeGreaterThan(0);
        expect(route.totalPrice).toBeGreaterThan(0);
        expect(route.passengers).toBeGreaterThan(0);

        // Validate connections
        for (let i = 0; i < route.legs.length - 1; i++) {
          const current = route.legs[i];
          const next = route.legs[i + 1];
          expect(current.destination).toBe(next.origin);
        }
      }
    });
  });

  describe('End-to-end flow', () => {
    it('should complete search, build graph, find paths, and return routes', async () => {
      const startTime = Date.now();
      const routes = await searchMultiLegRoutes(mockFlights, 'JFK', 'LAX', 1, 3);
      const duration = Date.now() - startTime;

      // Should complete in reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000);

      // Should return valid results
      expect(routes.length).toBeGreaterThan(0);
      expect(routes[0].totalPrice).toBeGreaterThan(0);

      // All routes should be properly formed
      for (const route of routes) {
        expect(route.legs.length).toBeGreaterThan(0);
        expect(route.legs[0].origin).toBe('JFK');
        expect(route.legs[route.legs.length - 1].destination).toBe('LAX');
      }
    });
  });
});
