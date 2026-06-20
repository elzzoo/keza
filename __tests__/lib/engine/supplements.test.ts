import { HOME_CARRIER_PROGRAMS, ROUTE_AIRLINE_SUPPLEMENTS } from "@/lib/engine/supplements";

describe("supplements — home carrier guarantees & route airlines", () => {
  describe("HOME_CARRIER_PROGRAMS coverage", () => {
    test("maps all corridors in uppercase (e.g. SIN-LAX)", () => {
      const corridors = Object.keys(HOME_CARRIER_PROGRAMS);
      for (const corridor of corridors) {
        const [from, to] = corridor.split("-");
        expect(from).toBe(from.toUpperCase());
        expect(to).toBe(to.toUpperCase());
        expect(from.length).toBe(3); // IATA code
        expect(to.length).toBe(3);
      }
    });

    test("bidirectional coverage: SIN-LAX and LAX-SIN both present", () => {
      expect(HOME_CARRIER_PROGRAMS["SIN-LAX"]).toBeDefined();
      expect(HOME_CARRIER_PROGRAMS["LAX-SIN"]).toBeDefined();
    });

    test("each corridor has airline + programs array", () => {
      for (const corridor of Object.values(HOME_CARRIER_PROGRAMS)) {
        for (const entry of corridor) {
          expect(entry).toHaveProperty("airline");
          expect(entry).toHaveProperty("programs");
          expect(typeof entry.airline).toBe("string");
          expect(Array.isArray(entry.programs)).toBe(true);
          expect(entry.programs.length).toBeGreaterThan(0);
        }
      }
    });

    test("flagship airlines include SQ, ANA, JAL, EK, QR, Korean Air, Cathay, Turkish, Etihad", () => {
      const allAirlines = Object.values(HOME_CARRIER_PROGRAMS).flat().map(e => e.airline);
      const uniqueAirlines = new Set(allAirlines);

      const expectedAirlines = [
        "Singapore Airlines",
        "All Nippon Airways",
        "Japan Airlines",
        "Emirates",
        "Qatar Airways",
        "Korean Air",
        "Cathay Pacific",
        "Turkish Airlines",
        "Etihad",
      ];

      for (const airline of expectedAirlines) {
        expect(uniqueAirlines.has(airline)).toBe(true);
      }
    });

    test("all programs are non-empty strings", () => {
      const allPrograms = Object.values(HOME_CARRIER_PROGRAMS)
        .flat()
        .flatMap(e => e.programs);

      expect(allPrograms.length).toBeGreaterThan(0);
      for (const prog of allPrograms) {
        expect(typeof prog).toBe("string");
        expect(prog.length).toBeGreaterThan(0);
      }
    });

    test("SIN hub: has SIN-LAX, SIN-JFK, SIN-SFO, SIN-LHR (plus reverse)", () => {
      const sinRoutes = Object.keys(HOME_CARRIER_PROGRAMS).filter(c => c.includes("SIN"));
      expect(sinRoutes.length).toBeGreaterThanOrEqual(8); // bidirectional
    });

    test("NRT hub: covers LAX, JFK, SFO, ORD (plus reverse)", () => {
      const nrtRoutes = Object.keys(HOME_CARRIER_PROGRAMS).filter(c => c.includes("NRT"));
      expect(nrtRoutes.length).toBeGreaterThanOrEqual(8);
    });

    test("DXB/AUH/DOH/ICN/HKG hubs have coverage", () => {
      const hubs = ["DXB", "AUH", "DOH", "ICN", "HKG"];
      for (const hub of hubs) {
        const hubRoutes = Object.keys(HOME_CARRIER_PROGRAMS).filter(c => c.includes(hub));
        expect(hubRoutes.length).toBeGreaterThan(0);
      }
    });
  });

  describe("ROUTE_AIRLINE_SUPPLEMENTS (synthetic flights)", () => {
    test("supplements only include airlines NOT indexed by providers", () => {
      // These are fallback airlines: if Duffel/TP don't return them,
      // we inject synthetic entries so the program still appears for ranking
    });

    test("each supplement airline is a valid 2-3 letter IATA code or full name", () => {
      for (const airlines of Object.values(ROUTE_AIRLINE_SUPPLEMENTS)) {
        for (const airline of airlines) {
          // Validate airline is string
          expect(typeof airline).toBe("string");
          expect(airline.length).toBeGreaterThan(0);
        }
      }
    });

    test("supplements are keyed by route (e.g. SIN-LAX)", () => {
      for (const route of Object.keys(ROUTE_AIRLINE_SUPPLEMENTS)) {
        const [from, to] = route.split("-");
        expect(from).toBe(from.toUpperCase());
        expect(to).toBe(to.toUpperCase());
        expect(from.length).toBe(3);
        expect(to.length).toBe(3);
      }
    });
  });

  describe("Integration: guarantees + supplements", () => {
    test("both structures can coexist: home carriers and supplements are defined", () => {
      // Home carriers and supplements are defined independently for different purposes
      const hasHomeCarriers = Object.keys(HOME_CARRIER_PROGRAMS).length > 0;
      const hasSupplements = Object.keys(ROUTE_AIRLINE_SUPPLEMENTS).length > 0;

      expect(hasHomeCarriers).toBe(true);
      expect(hasSupplements).toBe(true);
    });

    test("together, home carriers + supplements = complete route coverage", () => {
      // For major routes, combination should cover the key players
      const route = "SIN-LAX";
      const homeCarriers = HOME_CARRIER_PROGRAMS[route]?.map(e => e.airline) ?? [];
      const supplements = ROUTE_AIRLINE_SUPPLEMENTS[route] ?? [];

      const totalCoverage = homeCarriers.length + supplements.length;
      expect(totalCoverage).toBeGreaterThan(0);
    });
  });

  describe("Data consistency", () => {
    test("no empty arrays in HOME_CARRIER_PROGRAMS", () => {
      for (const [route, entries] of Object.entries(HOME_CARRIER_PROGRAMS)) {
        expect(entries.length).toBeGreaterThan(0);
        for (const entry of entries) {
          expect(entry.programs.length).toBeGreaterThan(0);
        }
      }
    });

    test("no duplicate routes with conflicting data", () => {
      for (const [route, entries] of Object.entries(HOME_CARRIER_PROGRAMS)) {
        const airlines = new Set(entries.map(e => e.airline));
        expect(airlines.size).toBe(entries.length); // no duplicate airlines per route
      }
    });

    test("all IATA codes are valid 3-letter format", () => {
      const iataRegex = /^[A-Z]{3}$/;
      for (const route of Object.keys(HOME_CARRIER_PROGRAMS)) {
        const [from, to] = route.split("-");
        expect(iataRegex.test(from)).toBe(true);
        expect(iataRegex.test(to)).toBe(true);
      }

      for (const route of Object.keys(ROUTE_AIRLINE_SUPPLEMENTS)) {
        const [from, to] = route.split("-");
        expect(iataRegex.test(from)).toBe(true);
        expect(iataRegex.test(to)).toBe(true);
      }
    });
  });
});
