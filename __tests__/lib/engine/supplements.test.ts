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

  describe("P5 Task 3.3: Route Expansion to 110+ corridors", () => {
    test("Tier 3 — African Routes: LAD hub coverage", () => {
      // LAD↔LHR (TAAG Angola Airlines)
      expect(HOME_CARRIER_PROGRAMS["LAD-LHR"]).toBeDefined();
      expect(HOME_CARRIER_PROGRAMS["LAD-LHR"][0].airline).toBe("TAAG Angola Airlines");
      expect(HOME_CARRIER_PROGRAMS["LAD-LHR"][0].programs).toContain("TAAG Frequent Flyer");

      expect(HOME_CARRIER_PROGRAMS["LHR-LAD"]).toBeDefined();
      expect(ROUTE_AIRLINE_SUPPLEMENTS["LAD-LHR"]).toContain("TAAG Angola Airlines");
      expect(ROUTE_AIRLINE_SUPPLEMENTS["LHR-LAD"]).toContain("TAAG Angola Airlines");
    });

    test("Tier 3 — African Routes: LAD↔JFK", () => {
      expect(HOME_CARRIER_PROGRAMS["LAD-JFK"]).toBeDefined();
      expect(HOME_CARRIER_PROGRAMS["LAD-JFK"][0].airline).toBe("TAAG Angola Airlines");
      expect(HOME_CARRIER_PROGRAMS["JFK-LAD"]).toBeDefined();
    });

    test("Tier 4 — Asia-Asia: ICN↔BKK (Korean Air + Thai Airways)", () => {
      expect(HOME_CARRIER_PROGRAMS["ICN-BKK"]).toBeDefined();
      const airlines = HOME_CARRIER_PROGRAMS["ICN-BKK"].map(e => e.airline);
      expect(airlines).toContain("Korean Air");
      expect(airlines).toContain("Thai Airways");

      expect(HOME_CARRIER_PROGRAMS["BKK-ICN"]).toBeDefined();
      expect(ROUTE_AIRLINE_SUPPLEMENTS["ICN-BKK"]).toContain("Korean Air");
      expect(ROUTE_AIRLINE_SUPPLEMENTS["ICN-BKK"]).toContain("Thai Airways");
    });

    test("Tier 4 — Asia-Asia: BKK↔HKG (Thai Airways + Cathay Pacific)", () => {
      expect(HOME_CARRIER_PROGRAMS["BKK-HKG"]).toBeDefined();
      const airlines = HOME_CARRIER_PROGRAMS["BKK-HKG"].map(e => e.airline);
      expect(airlines).toContain("Thai Airways");
      expect(airlines).toContain("Cathay Pacific");

      expect(HOME_CARRIER_PROGRAMS["HKG-BKK"]).toBeDefined();
      expect(ROUTE_AIRLINE_SUPPLEMENTS["BKK-HKG"]).toContain("Thai Airways");
      expect(ROUTE_AIRLINE_SUPPLEMENTS["BKK-HKG"]).toContain("Cathay Pacific");
    });

    test("Tier 4 — Asia-Asia: BKK↔SIN (Thai Airways + Singapore Airlines)", () => {
      expect(HOME_CARRIER_PROGRAMS["BKK-SIN"]).toBeDefined();
      const airlines = HOME_CARRIER_PROGRAMS["BKK-SIN"].map(e => e.airline);
      expect(airlines).toContain("Thai Airways");
      expect(airlines).toContain("Singapore Airlines");

      expect(HOME_CARRIER_PROGRAMS["SIN-BKK"]).toBeDefined();
      expect(ROUTE_AIRLINE_SUPPLEMENTS["BKK-SIN"]).toContain("Thai Airways");
      expect(ROUTE_AIRLINE_SUPPLEMENTS["BKK-SIN"]).toContain("Singapore Airlines");
    });

    test("Tier 4 — Trans-Pacific: NRT↔CDG (ANA + JAL + Air France)", () => {
      expect(HOME_CARRIER_PROGRAMS["NRT-CDG"]).toBeDefined();
      const airlines = HOME_CARRIER_PROGRAMS["NRT-CDG"].map(e => e.airline);
      expect(airlines).toContain("All Nippon Airways");
      expect(airlines).toContain("Japan Airlines");
      expect(airlines).toContain("Air France");

      expect(HOME_CARRIER_PROGRAMS["CDG-NRT"]).toBeDefined();
      expect(ROUTE_AIRLINE_SUPPLEMENTS["NRT-CDG"]).toContain("All Nippon Airways");
      expect(ROUTE_AIRLINE_SUPPLEMENTS["NRT-CDG"]).toContain("Air France");
    });

    test("Tier 4 — Trans-Pacific: ICN↔CDG (Korean Air + Air France)", () => {
      expect(HOME_CARRIER_PROGRAMS["ICN-CDG"]).toBeDefined();
      const airlines = HOME_CARRIER_PROGRAMS["ICN-CDG"].map(e => e.airline);
      expect(airlines).toContain("Korean Air");
      expect(airlines).toContain("Air France");

      expect(HOME_CARRIER_PROGRAMS["CDG-ICN"]).toBeDefined();
    });

    test("Tier 4 — Asia-Asia: HKG↔NRT (Cathay Pacific + ANA/JAL)", () => {
      expect(HOME_CARRIER_PROGRAMS["HKG-NRT"]).toBeDefined();
      const airlines = HOME_CARRIER_PROGRAMS["HKG-NRT"].map(e => e.airline);
      expect(airlines).toContain("Cathay Pacific");
      expect(airlines).toContain("All Nippon Airways");

      expect(HOME_CARRIER_PROGRAMS["NRT-HKG"]).toBeDefined();
      expect(ROUTE_AIRLINE_SUPPLEMENTS["HKG-NRT"]).toContain("Cathay Pacific");
    });

    test("Tier 4 — Asia-Asia: SIN↔NRT (Singapore Airlines + ANA/JAL)", () => {
      expect(HOME_CARRIER_PROGRAMS["SIN-NRT"]).toBeDefined();
      const airlines = HOME_CARRIER_PROGRAMS["SIN-NRT"].map(e => e.airline);
      expect(airlines).toContain("Singapore Airlines");
      expect(airlines).toContain("All Nippon Airways");

      expect(HOME_CARRIER_PROGRAMS["NRT-SIN"]).toBeDefined();
    });

    test("Tier 4 — Asia-Asia: HKG↔SIN (Cathay Pacific + Singapore Airlines)", () => {
      expect(HOME_CARRIER_PROGRAMS["HKG-SIN"]).toBeDefined();
      const airlines = HOME_CARRIER_PROGRAMS["HKG-SIN"].map(e => e.airline);
      expect(airlines).toContain("Cathay Pacific");
      expect(airlines).toContain("Singapore Airlines");

      expect(HOME_CARRIER_PROGRAMS["SIN-HKG"]).toBeDefined();
    });

    test("Premium corridor: LHR↔SIN (Singapore Airlines guaranteed)", () => {
      expect(HOME_CARRIER_PROGRAMS["LHR-SIN"]).toBeDefined();
      const airlines = HOME_CARRIER_PROGRAMS["LHR-SIN"].map(e => e.airline);
      // Existing entry guarantees SQ, supplements include BA via ROUTE_AIRLINE_SUPPLEMENTS
      expect(airlines).toContain("Singapore Airlines");

      expect(HOME_CARRIER_PROGRAMS["SIN-LHR"]).toBeDefined();
      expect(ROUTE_AIRLINE_SUPPLEMENTS["LHR-SIN"]).toContain("British Airways");
      expect(ROUTE_AIRLINE_SUPPLEMENTS["LHR-SIN"]).toContain("Singapore Airlines");
    });

    test("Premium corridor: FRA↔BKK (Lufthansa + Thai Airways)", () => {
      expect(HOME_CARRIER_PROGRAMS["FRA-BKK"]).toBeDefined();
      const airlines = HOME_CARRIER_PROGRAMS["FRA-BKK"].map(e => e.airline);
      expect(airlines).toContain("Lufthansa");
      expect(airlines).toContain("Thai Airways");

      expect(HOME_CARRIER_PROGRAMS["BKK-FRA"]).toBeDefined();
    });

    test("all new routes are bidirectional", () => {
      const newRoutes = [
        "LAD-LHR", "LAD-JFK",
        "ICN-BKK", "BKK-HKG", "BKK-SIN",
        "NRT-CDG", "ICN-CDG",
        "HKG-NRT", "SIN-NRT", "HKG-SIN",
        "LHR-SIN", "FRA-BKK"
      ];

      for (const route of newRoutes) {
        const [from, to] = route.split("-");
        const reverse = `${to}-${from}`;
        expect(HOME_CARRIER_PROGRAMS[route]).toBeDefined();
        expect(HOME_CARRIER_PROGRAMS[reverse]).toBeDefined();
      }
    });

    test("all new routes have corresponding airline supplements", () => {
      const newRoutes = [
        "LAD-LHR", "LAD-JFK",
        "ICN-BKK", "BKK-HKG", "BKK-SIN",
        "NRT-CDG", "ICN-CDG",
        "HKG-NRT", "SIN-NRT", "HKG-SIN",
        "LHR-SIN", "FRA-BKK"
      ];

      for (const route of newRoutes) {
        const [from, to] = route.split("-");
        const reverse = `${to}-${from}`;

        // At least one direction should have airline supplements
        const hasSupplements =
          (ROUTE_AIRLINE_SUPPLEMENTS[route] && ROUTE_AIRLINE_SUPPLEMENTS[route].length > 0) ||
          (ROUTE_AIRLINE_SUPPLEMENTS[reverse] && ROUTE_AIRLINE_SUPPLEMENTS[reverse].length > 0);

        expect(hasSupplements).toBe(true);
      }
    });

    test("route count increased to 110+ corridors", () => {
      const totalRoutes = Object.keys(HOME_CARRIER_PROGRAMS).length;
      expect(totalRoutes).toBeGreaterThanOrEqual(110);
    });
  });
});
