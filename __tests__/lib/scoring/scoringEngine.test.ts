import {
  calculateCabinSignal,
  calculateAccessibilitySignal,
  calculatePriceSignal,
  calculateConnectionsSignal,
  calculateLayoverSignal,
  calculateCarrierSignal,
  type SignalContext,
} from '@/lib/scoring/signals';
import { scoreFlights, type ScoringResult } from '@/lib/scoring/scoringEngine';
import type { FlightResult, Cabin } from '@/lib/engine/types';

// Helper to create a mock FlightResult
function createMockFlight(overrides?: Partial<FlightResult>): FlightResult {
  const defaultFlight: FlightResult = {
    from: 'SIN',
    to: 'LAX',
    price: 1200,
    airlines: ['SQ'],
    stops: 0,
    duration: 900, // 15 hours in minutes for SIN-LAX
    tripType: 'oneway',
    cabin: 'economy',
    passengers: 1,
    cashCost: 1200,
    milesCost: 0,
    savings: 0,
    recommendation: 'USE_CASH',
    bestOption: null,
    milesOptions: [],
    explanation: 'Test flight',
    displayMessage: 'Test',
    disclaimer: 'Test disclaimer',
    optimization: { method: 'default' },
    searchId: 'test-search-123',
  };
  return { ...defaultFlight, ...overrides };
}

describe('Scoring Engine - Cabin Signal', () => {
  it('calculates cabin signal: Economy=20', () => {
    const ctx: SignalContext = {
      flight: createMockFlight({ cabin: 'economy' }),
      userProgram: 'KrisFlyer',
      bookingDate: new Date(),
    };
    const score = calculateCabinSignal(ctx);
    expect(score).toBe(20);
  });

  it('calculates cabin signal: Premium Economy=50', () => {
    const ctx: SignalContext = {
      flight: createMockFlight({ cabin: 'premium' }),
      userProgram: 'KrisFlyer',
      bookingDate: new Date(),
    };
    const score = calculateCabinSignal(ctx);
    expect(score).toBe(50);
  });

  it('calculates cabin signal: Business=80', () => {
    const ctx: SignalContext = {
      flight: createMockFlight({ cabin: 'business' }),
      userProgram: 'KrisFlyer',
      bookingDate: new Date(),
    };
    const score = calculateCabinSignal(ctx);
    expect(score).toBe(80);
  });

  it('calculates cabin signal: First=100', () => {
    const ctx: SignalContext = {
      flight: createMockFlight({ cabin: 'first' }),
      userProgram: 'KrisFlyer',
      bookingDate: new Date(),
    };
    const score = calculateCabinSignal(ctx);
    expect(score).toBe(100);
  });
});

describe('Scoring Engine - Accessibility Signal', () => {
  it('calculates accessibility signal for exclusive program', () => {
    const ctx: SignalContext = {
      flight: createMockFlight({ airlines: ['SQ'] }),
      userProgram: 'KrisFlyer',
      bookingDate: new Date(),
    };
    const score = calculateAccessibilitySignal(ctx);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('accessibility signal is between 0 and 100', () => {
    const ctx: SignalContext = {
      flight: createMockFlight(),
      userProgram: 'AirFrance',
      bookingDate: new Date(),
    };
    const score = calculateAccessibilitySignal(ctx);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('Scoring Engine - Price Signal', () => {
  it('price signal is between 0 and 100', () => {
    const ctx: SignalContext = {
      flight: createMockFlight({ price: 1000 }),
      userProgram: 'KrisFlyer',
      bookingDate: new Date(),
    };
    const score = calculatePriceSignal(ctx);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('lower prices get higher signal scores', () => {
    const cheapFlight = createMockFlight({ price: 800 });
    const expensiveFlight = createMockFlight({ price: 2000 });

    const cheapCtx: SignalContext = {
      flight: cheapFlight,
      userProgram: 'KrisFlyer',
      bookingDate: new Date(),
    };
    const expensiveCtx: SignalContext = {
      flight: expensiveFlight,
      userProgram: 'KrisFlyer',
      bookingDate: new Date(),
    };

    const cheapScore = calculatePriceSignal(cheapCtx);
    const expensiveScore = calculatePriceSignal(expensiveCtx);

    expect(cheapScore).toBeGreaterThan(expensiveScore);
  });
});

describe('Scoring Engine - Connections Signal', () => {
  it('calculates connections signal: Direct=100', () => {
    const ctx: SignalContext = {
      flight: createMockFlight({ stops: 0 }),
      userProgram: 'KrisFlyer',
      bookingDate: new Date(),
    };
    const score = calculateConnectionsSignal(ctx);
    expect(score).toBe(100);
  });

  it('calculates connections signal: 1-stop=70', () => {
    const ctx: SignalContext = {
      flight: createMockFlight({ stops: 1 }),
      userProgram: 'KrisFlyer',
      bookingDate: new Date(),
    };
    const score = calculateConnectionsSignal(ctx);
    expect(score).toBe(70);
  });

  it('calculates connections signal: 2+stops=40', () => {
    const ctx: SignalContext = {
      flight: createMockFlight({ stops: 2 }),
      userProgram: 'KrisFlyer',
      bookingDate: new Date(),
    };
    const score = calculateConnectionsSignal(ctx);
    expect(score).toBe(40);
  });

  it('handles 3+ stops as 40', () => {
    const ctx: SignalContext = {
      flight: createMockFlight({ stops: 5 }),
      userProgram: 'KrisFlyer',
      bookingDate: new Date(),
    };
    const score = calculateConnectionsSignal(ctx);
    expect(score).toBe(40);
  });
});

describe('Scoring Engine - Layover Signal', () => {
  it('calculates layover signal: <2h=100', () => {
    const ctx: SignalContext = {
      flight: createMockFlight({ duration: 60 }), // 1 hour in minutes
      userProgram: 'KrisFlyer',
      bookingDate: new Date(),
    };
    const score = calculateLayoverSignal(ctx);
    expect(score).toBe(100);
  });

  it('calculates layover signal: 2-4h=80', () => {
    const ctx: SignalContext = {
      flight: createMockFlight({ duration: 180 }), // 3 hours in minutes
      userProgram: 'KrisFlyer',
      bookingDate: new Date(),
    };
    const score = calculateLayoverSignal(ctx);
    expect(score).toBe(80);
  });

  it('calculates layover signal: 4-8h=50', () => {
    const ctx: SignalContext = {
      flight: createMockFlight({ duration: 360 }), // 6 hours in minutes
      userProgram: 'KrisFlyer',
      bookingDate: new Date(),
    };
    const score = calculateLayoverSignal(ctx);
    expect(score).toBe(50);
  });

  it('calculates layover signal: 8h+=20', () => {
    const ctx: SignalContext = {
      flight: createMockFlight({ duration: 600 }), // 10 hours in minutes
      userProgram: 'KrisFlyer',
      bookingDate: new Date(),
    };
    const score = calculateLayoverSignal(ctx);
    expect(score).toBe(20);
  });
});

describe('Scoring Engine - Carrier Signal', () => {
  it('carrier signal is between 0 and 100', () => {
    const ctx: SignalContext = {
      flight: createMockFlight({ airlines: ['SQ'] }),
      userProgram: 'KrisFlyer',
      bookingDate: new Date(),
    };
    const score = calculateCarrierSignal(ctx);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('handles multiple airlines', () => {
    const ctx: SignalContext = {
      flight: createMockFlight({ airlines: ['SQ', 'BA', 'LH'] }),
      userProgram: 'KrisFlyer',
      bookingDate: new Date(),
    };
    const score = calculateCarrierSignal(ctx);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('Scoring Engine - Overall Scoring', () => {
  it('scoreFlights returns flights with scoringResult', async () => {
    const flights = [
      createMockFlight({ stops: 0, cabin: 'business', price: 1000 }),
      createMockFlight({ stops: 1, cabin: 'economy', price: 1500 }),
    ];

    const scored = await scoreFlights(flights, 'KrisFlyer', new Date());

    expect(scored).toHaveLength(2);
    expect(scored[0]).toHaveProperty('scoringResult');
    expect(scored[1]).toHaveProperty('scoringResult');
  });

  it('overall score is between 0 and 100', async () => {
    const flights = [createMockFlight()];
    const scored = await scoreFlights(flights, 'KrisFlyer', new Date());

    expect(scored[0].scoringResult.overallScore).toBeGreaterThanOrEqual(0);
    expect(scored[0].scoringResult.overallScore).toBeLessThanOrEqual(100);
  });

  it('scoring result includes breakdown of all 6 signals', async () => {
    const flights = [createMockFlight()];
    const scored = await scoreFlights(flights, 'KrisFlyer', new Date());

    const breakdown = scored[0].scoringResult.breakdown;
    expect(breakdown).toHaveProperty('cabin');
    expect(breakdown).toHaveProperty('accessibility');
    expect(breakdown).toHaveProperty('price');
    expect(breakdown).toHaveProperty('connections');
    expect(breakdown).toHaveProperty('layover');
    expect(breakdown).toHaveProperty('carrier');
  });

  it('higher overall score for direct business flight', async () => {
    const directBusiness = createMockFlight({ stops: 0, cabin: 'business', price: 1000 });
    const multiStopEconomy = createMockFlight({ stops: 2, cabin: 'economy', price: 500 });

    const scored = await scoreFlights([directBusiness, multiStopEconomy], 'KrisFlyer', new Date());

    expect(scored[0].scoringResult.overallScore).toBeGreaterThan(scored[1].scoringResult.overallScore);
  });

  it('all breakdown scores are between 0-100', async () => {
    const flights = [
      createMockFlight({ stops: 0, cabin: 'first', price: 5000, duration: 1500 }), // 25 hours in minutes
      createMockFlight({ stops: 3, cabin: 'economy', price: 200, duration: 480 }), // 8 hours in minutes
    ];

    const scored = await scoreFlights(flights, 'KrisFlyer', new Date());

    scored.forEach(flight => {
      const { breakdown } = flight.scoringResult;
      Object.values(breakdown).forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });
  });

  it('maintains flight properties after scoring', async () => {
    const originalFlight = createMockFlight({ from: 'SIN', to: 'LAX', price: 1200 });
    const scored = await scoreFlights([originalFlight], 'KrisFlyer', new Date());

    expect(scored[0].from).toBe('SIN');
    expect(scored[0].to).toBe('LAX');
    expect(scored[0].price).toBe(1200);
  });

  it('includes reasoning in scoring result', async () => {
    const flights = [createMockFlight()];
    const scored = await scoreFlights(flights, 'KrisFlyer', new Date());

    expect(scored[0].scoringResult.reasoning).toBeDefined();
    expect(scored[0].scoringResult.reasoning.length).toBeGreaterThan(0);
  });
});
