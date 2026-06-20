import {
  validateMultiLegRoute,
  calculateRouteTotalTime,
  calculateRouteCPP,
} from '@/lib/multiLeg';

describe('Multi-Leg Schema & Validation', () => {
  describe('FlightLeg interface', () => {
    it('should have required properties', () => {
      const leg = {
        origin: 'JFK',
        destination: 'LHR',
        departureTime: '2025-08-01T09:00:00Z',
        arrivalTime: '2025-08-01T21:00:00Z',
        airline: 'BA',
        flightNumber: 'BA112',
        aircraft: '777',
        cabin: 'economy' as const,
        price: 850,
      };
      expect(leg).toBeDefined();
      expect(leg.origin).toBe('JFK');
      expect(leg.destination).toBe('LHR');
    });
  });

  describe('MultiLegRoute interface', () => {
    it('should contain array of flight legs', () => {
      const route = {
        legs: [
          {
            origin: 'JFK',
            destination: 'ORD',
            departureTime: '2025-08-01T06:00:00Z',
            arrivalTime: '2025-08-01T09:00:00Z',
            airline: 'UA',
            flightNumber: 'UA1234',
            aircraft: '737',
            cabin: 'economy' as const,
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
            cabin: 'economy' as const,
            price: 180,
          },
        ],
        totalPrice: 300,
        passengers: 1,
      };
      expect(route.legs).toHaveLength(2);
      expect(route.legs[0].origin).toBe('JFK');
      expect(route.legs[1].destination).toBe('LAX');
    });
  });

  describe('ConnectionConstraint interface', () => {
    it('should validate minimum connection time', () => {
      const constraint = {
        minConnectionTimeMinutes: 90,
        maxConnectionTimeMinutes: 480,
        sameAirlinePreference: true,
      };
      expect(constraint.minConnectionTimeMinutes).toBe(90);
      expect(constraint.maxConnectionTimeMinutes).toBe(480);
    });
  });

  describe('OptimizationOptions interface', () => {
    it('should specify optimization criteria', () => {
      const options = {
        optimizeBy: 'price' as const,
        maxStops: 2,
        maxTotalTime: 1440,
        preferredAirlines: ['UA', 'BA'],
      };
      expect(options.optimizeBy).toBe('price');
      expect(options.maxStops).toBe(2);
      expect(options.preferredAirlines).toContain('BA');
    });
  });

  describe('validateMultiLegRoute()', () => {
    it('should validate a valid multi-leg route', () => {
      const route = {
        legs: [
          {
            origin: 'JFK',
            destination: 'ORD',
            departureTime: '2025-08-01T06:00:00Z',
            arrivalTime: '2025-08-01T09:00:00Z',
            airline: 'UA',
            flightNumber: 'UA1234',
            aircraft: '737',
            cabin: 'economy' as const,
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
            cabin: 'economy' as const,
            price: 180,
          },
        ],
        totalPrice: 300,
        passengers: 1,
      };
      expect(validateMultiLegRoute(route)).toBe(true);
    });

    it('should reject route with no legs', () => {
      const invalidRoute = {
        legs: [],
        totalPrice: 0,
        passengers: 1,
      };
      expect(validateMultiLegRoute(invalidRoute)).toBe(false);
    });

    it('should reject route with mismatched destination/origin', () => {
      const invalidRoute = {
        legs: [
          {
            origin: 'JFK',
            destination: 'ORD',
            departureTime: '2025-08-01T06:00:00Z',
            arrivalTime: '2025-08-01T09:00:00Z',
            airline: 'UA',
            flightNumber: 'UA1234',
            aircraft: '737',
            cabin: 'economy' as const,
            price: 120,
          },
          {
            origin: 'LAX',
            destination: 'SFO',
            departureTime: '2025-08-01T11:30:00Z',
            arrivalTime: '2025-08-01T14:00:00Z',
            airline: 'UA',
            flightNumber: 'UA5678',
            aircraft: '777',
            cabin: 'economy' as const,
            price: 180,
          },
        ],
        totalPrice: 300,
        passengers: 1,
      };
      expect(validateMultiLegRoute(invalidRoute)).toBe(false);
    });

    it('should reject route with arrival after departure on same leg', () => {
      const invalidRoute = {
        legs: [
          {
            origin: 'JFK',
            destination: 'ORD',
            departureTime: '2025-08-01T09:00:00Z',
            arrivalTime: '2025-08-01T06:00:00Z',
            airline: 'UA',
            flightNumber: 'UA1234',
            aircraft: '737',
            cabin: 'economy' as const,
            price: 120,
          },
        ],
        totalPrice: 120,
        passengers: 1,
      };
      expect(validateMultiLegRoute(invalidRoute)).toBe(false);
    });

    it('should reject route with too-short connection time', () => {
      const invalidRoute = {
        legs: [
          {
            origin: 'JFK',
            destination: 'ORD',
            departureTime: '2025-08-01T06:00:00Z',
            arrivalTime: '2025-08-01T09:00:00Z',
            airline: 'UA',
            flightNumber: 'UA1234',
            aircraft: '737',
            cabin: 'economy' as const,
            price: 120,
          },
          {
            origin: 'ORD',
            destination: 'LAX',
            departureTime: '2025-08-01T09:30:00Z',
            arrivalTime: '2025-08-01T12:00:00Z',
            airline: 'UA',
            flightNumber: 'UA5678',
            aircraft: '777',
            cabin: 'economy' as const,
            price: 180,
          },
        ],
        totalPrice: 300,
        passengers: 1,
      };
      expect(validateMultiLegRoute(invalidRoute)).toBe(false);
    });
  });

  describe('calculateRouteTotalTime()', () => {
    it('should calculate total travel time including connections', () => {
      const route = {
        legs: [
          {
            origin: 'JFK',
            destination: 'ORD',
            departureTime: '2025-08-01T06:00:00Z',
            arrivalTime: '2025-08-01T09:00:00Z',
            airline: 'UA',
            flightNumber: 'UA1234',
            aircraft: '737',
            cabin: 'economy' as const,
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
            cabin: 'economy' as const,
            price: 180,
          },
        ],
        totalPrice: 300,
        passengers: 1,
      };
      const totalTime = calculateRouteTotalTime(route);
      expect(totalTime).toBe(480); // 8 hours in minutes
    });

    it('should handle multi-leg route with longer connection', () => {
      const route = {
        legs: [
          {
            origin: 'JFK',
            destination: 'ORD',
            departureTime: '2025-08-01T06:00:00Z',
            arrivalTime: '2025-08-01T09:00:00Z',
            airline: 'UA',
            flightNumber: 'UA1234',
            aircraft: '737',
            cabin: 'economy' as const,
            price: 120,
          },
          {
            origin: 'ORD',
            destination: 'DEN',
            departureTime: '2025-08-01T14:00:00Z',
            arrivalTime: '2025-08-01T16:00:00Z',
            airline: 'UA',
            flightNumber: 'UA5678',
            aircraft: '777',
            cabin: 'economy' as const,
            price: 150,
          },
          {
            origin: 'DEN',
            destination: 'LAX',
            departureTime: '2025-08-01T18:00:00Z',
            arrivalTime: '2025-08-01T19:30:00Z',
            airline: 'UA',
            flightNumber: 'UA9999',
            aircraft: '737',
            cabin: 'economy' as const,
            price: 100,
          },
        ],
        totalPrice: 370,
        passengers: 1,
      };
      const totalTime = calculateRouteTotalTime(route);
      expect(totalTime).toBe(810); // 13 hours 30 minutes
    });
  });

  describe('calculateRouteCPP()', () => {
    it('should calculate cost per passenger', () => {
      const route = {
        legs: [
          {
            origin: 'JFK',
            destination: 'ORD',
            departureTime: '2025-08-01T06:00:00Z',
            arrivalTime: '2025-08-01T09:00:00Z',
            airline: 'UA',
            flightNumber: 'UA1234',
            aircraft: '737',
            cabin: 'economy' as const,
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
            cabin: 'economy' as const,
            price: 180,
          },
        ],
        totalPrice: 300,
        passengers: 2,
      };
      const cpp = calculateRouteCPP(route);
      expect(cpp).toBe(150);
    });

    it('should handle single passenger', () => {
      const route = {
        legs: [
          {
            origin: 'JFK',
            destination: 'LAX',
            departureTime: '2025-08-01T06:00:00Z',
            arrivalTime: '2025-08-01T14:00:00Z',
            airline: 'UA',
            flightNumber: 'UA1234',
            aircraft: '777',
            cabin: 'economy' as const,
            price: 450,
          },
        ],
        totalPrice: 450,
        passengers: 1,
      };
      const cpp = calculateRouteCPP(route);
      expect(cpp).toBe(450);
    });

    it('should handle multiple passengers', () => {
      const route = {
        legs: [
          {
            origin: 'JFK',
            destination: 'LAX',
            departureTime: '2025-08-01T06:00:00Z',
            arrivalTime: '2025-08-01T14:00:00Z',
            airline: 'UA',
            flightNumber: 'UA1234',
            aircraft: '777',
            cabin: 'economy' as const,
            price: 450,
          },
        ],
        totalPrice: 1350,
        passengers: 3,
      };
      const cpp = calculateRouteCPP(route);
      expect(cpp).toBe(450);
    });
  });
});
