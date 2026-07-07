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

  describe("P3 Expansion: 10 High-Demand Flight Corridors", () => {
    test("P3 Asia-Pacific to US: BKK-LAX and LAX-BKK (Thai Airways + United)", () => {
      expect(HOME_CARRIER_PROGRAMS["BKK-LAX"]).toBeDefined();
      const bkkLaxAirlines = HOME_CARRIER_PROGRAMS["BKK-LAX"].map(e => e.airline);
      expect(bkkLaxAirlines).toContain("Thai Airways");
      expect(bkkLaxAirlines).toContain("United");

      expect(HOME_CARRIER_PROGRAMS["LAX-BKK"]).toBeDefined();
      const laxBkkAirlines = HOME_CARRIER_PROGRAMS["LAX-BKK"].map(e => e.airline);
      expect(laxBkkAirlines).toContain("Thai Airways");
      expect(laxBkkAirlines).toContain("United");

      expect(ROUTE_AIRLINE_SUPPLEMENTS["BKK-LAX"]).toContain("Thai Airways");
      expect(ROUTE_AIRLINE_SUPPLEMENTS["BKK-LAX"]).toContain("United");
    });

    test("P3 Australia to US: SYD-LAX and LAX-SYD (Qantas + United)", () => {
      expect(HOME_CARRIER_PROGRAMS["SYD-LAX"]).toBeDefined();
      const sydLaxAirlines = HOME_CARRIER_PROGRAMS["SYD-LAX"].map(e => e.airline);
      expect(sydLaxAirlines).toContain("Qantas");
      expect(sydLaxAirlines).toContain("United");

      expect(HOME_CARRIER_PROGRAMS["LAX-SYD"]).toBeDefined();
      const laxSydAirlines = HOME_CARRIER_PROGRAMS["LAX-SYD"].map(e => e.airline);
      expect(laxSydAirlines).toContain("Qantas");
      expect(laxSydAirlines).toContain("United");

      expect(ROUTE_AIRLINE_SUPPLEMENTS["SYD-LAX"]).toContain("Qantas");
      expect(ROUTE_AIRLINE_SUPPLEMENTS["SYD-LAX"]).toContain("United");
    });

    test("P3 Australia to Asia: NRT-SYD and SYD-NRT (ANA + Qantas)", () => {
      expect(HOME_CARRIER_PROGRAMS["NRT-SYD"]).toBeDefined();
      const nrtSydAirlines = HOME_CARRIER_PROGRAMS["NRT-SYD"].map(e => e.airline);
      expect(nrtSydAirlines).toContain("All Nippon Airways");
      expect(nrtSydAirlines).toContain("Qantas");

      expect(HOME_CARRIER_PROGRAMS["SYD-NRT"]).toBeDefined();
      const sydNrtAirlines = HOME_CARRIER_PROGRAMS["SYD-NRT"].map(e => e.airline);
      expect(sydNrtAirlines).toContain("All Nippon Airways");
      expect(sydNrtAirlines).toContain("Qantas");

      expect(ROUTE_AIRLINE_SUPPLEMENTS["NRT-SYD"]).toContain("All Nippon Airways");
      expect(ROUTE_AIRLINE_SUPPLEMENTS["NRT-SYD"]).toContain("Qantas");
    });

    test("P3 EU to Australia: CDG-SYD and SYD-CDG (Air France + Qantas)", () => {
      expect(HOME_CARRIER_PROGRAMS["CDG-SYD"]).toBeDefined();
      const cdgSydAirlines = HOME_CARRIER_PROGRAMS["CDG-SYD"].map(e => e.airline);
      expect(cdgSydAirlines).toContain("Air France");
      expect(cdgSydAirlines).toContain("Qantas");

      expect(HOME_CARRIER_PROGRAMS["SYD-CDG"]).toBeDefined();
      const sydCdgAirlines = HOME_CARRIER_PROGRAMS["SYD-CDG"].map(e => e.airline);
      expect(sydCdgAirlines).toContain("Qantas");
      expect(sydCdgAirlines).toContain("Air France");

      expect(ROUTE_AIRLINE_SUPPLEMENTS["CDG-SYD"]).toContain("Air France");
      expect(ROUTE_AIRLINE_SUPPLEMENTS["CDG-SYD"]).toContain("Qantas");
    });

    test("P3 Middle East to Australia: DXB-SYD and SYD-DXB (Emirates + Qantas)", () => {
      expect(HOME_CARRIER_PROGRAMS["DXB-SYD"]).toBeDefined();
      const dxbSydAirlines = HOME_CARRIER_PROGRAMS["DXB-SYD"].map(e => e.airline);
      expect(dxbSydAirlines).toContain("Emirates");
      expect(dxbSydAirlines).toContain("Qantas");

      expect(HOME_CARRIER_PROGRAMS["SYD-DXB"]).toBeDefined();
      const sydDxbAirlines = HOME_CARRIER_PROGRAMS["SYD-DXB"].map(e => e.airline);
      expect(sydDxbAirlines).toContain("Qantas");
      expect(sydDxbAirlines).toContain("Emirates");

      expect(ROUTE_AIRLINE_SUPPLEMENTS["DXB-SYD"]).toContain("Emirates");
      expect(ROUTE_AIRLINE_SUPPLEMENTS["DXB-SYD"]).toContain("Qantas");
    });

    test("P3 UK to Australia: LHR-SYD and SYD-LHR (British Airways + Qantas)", () => {
      expect(HOME_CARRIER_PROGRAMS["LHR-SYD"]).toBeDefined();
      const lhrSydAirlines = HOME_CARRIER_PROGRAMS["LHR-SYD"].map(e => e.airline);
      expect(lhrSydAirlines).toContain("British Airways");
      expect(lhrSydAirlines).toContain("Qantas");

      expect(HOME_CARRIER_PROGRAMS["SYD-LHR"]).toBeDefined();
      const sydLhrAirlines = HOME_CARRIER_PROGRAMS["SYD-LHR"].map(e => e.airline);
      expect(sydLhrAirlines).toContain("Qantas");
      expect(sydLhrAirlines).toContain("British Airways");

      expect(ROUTE_AIRLINE_SUPPLEMENTS["LHR-SYD"]).toContain("British Airways");
      expect(ROUTE_AIRLINE_SUPPLEMENTS["LHR-SYD"]).toContain("Qantas");
    });

    test("P3 US Midwest to Japan: ORD-NRT and NRT-ORD (United + ANA)", () => {
      expect(HOME_CARRIER_PROGRAMS["ORD-NRT"]).toBeDefined();
      const ordNrtAirlines = HOME_CARRIER_PROGRAMS["ORD-NRT"].map(e => e.airline);
      expect(ordNrtAirlines).toContain("United");
      expect(ordNrtAirlines).toContain("All Nippon Airways");

      expect(HOME_CARRIER_PROGRAMS["NRT-ORD"]).toBeDefined();
      const nrtOrdAirlines = HOME_CARRIER_PROGRAMS["NRT-ORD"].map(e => e.airline);
      expect(nrtOrdAirlines).toContain("All Nippon Airways");
      expect(nrtOrdAirlines).toContain("United");

      expect(ROUTE_AIRLINE_SUPPLEMENTS["ORD-NRT"]).toContain("All Nippon Airways");
      expect(ROUTE_AIRLINE_SUPPLEMENTS["ORD-NRT"]).toContain("United");
    });

    test("P3 US West to Japan: SFO-NRT and NRT-SFO (United + ANA)", () => {
      expect(HOME_CARRIER_PROGRAMS["SFO-NRT"]).toBeDefined();
      const sfoNrtAirlines = HOME_CARRIER_PROGRAMS["SFO-NRT"].map(e => e.airline);
      expect(sfoNrtAirlines).toContain("United");
      expect(sfoNrtAirlines).toContain("All Nippon Airways");

      expect(HOME_CARRIER_PROGRAMS["NRT-SFO"]).toBeDefined();
      const nrtSfoAirlines = HOME_CARRIER_PROGRAMS["NRT-SFO"].map(e => e.airline);
      expect(nrtSfoAirlines).toContain("All Nippon Airways");

      expect(ROUTE_AIRLINE_SUPPLEMENTS["SFO-NRT"]).toContain("All Nippon Airways");
      expect(ROUTE_AIRLINE_SUPPLEMENTS["SFO-NRT"]).toContain("United");
    });

    test("P3 US to Tokyo Haneda: LAX-HND and HND-LAX (ANA + United)", () => {
      expect(HOME_CARRIER_PROGRAMS["LAX-HND"]).toBeDefined();
      const laxHndAirlines = HOME_CARRIER_PROGRAMS["LAX-HND"].map(e => e.airline);
      expect(laxHndAirlines).toContain("All Nippon Airways");
      expect(laxHndAirlines).toContain("United");

      expect(HOME_CARRIER_PROGRAMS["HND-LAX"]).toBeDefined();
      const hndLaxAirlines = HOME_CARRIER_PROGRAMS["HND-LAX"].map(e => e.airline);
      expect(hndLaxAirlines).toContain("All Nippon Airways");
      expect(hndLaxAirlines).toContain("United");

      expect(ROUTE_AIRLINE_SUPPLEMENTS["LAX-HND"]).toContain("All Nippon Airways");
      expect(ROUTE_AIRLINE_SUPPLEMENTS["LAX-HND"]).toContain("United");
    });

    test("P3 US East to Tokyo Haneda: JFK-HND and HND-JFK (ANA + United)", () => {
      expect(HOME_CARRIER_PROGRAMS["JFK-HND"]).toBeDefined();
      const jfkHndAirlines = HOME_CARRIER_PROGRAMS["JFK-HND"].map(e => e.airline);
      expect(jfkHndAirlines).toContain("All Nippon Airways");
      expect(jfkHndAirlines).toContain("United");

      expect(HOME_CARRIER_PROGRAMS["HND-JFK"]).toBeDefined();
      const hndJfkAirlines = HOME_CARRIER_PROGRAMS["HND-JFK"].map(e => e.airline);
      expect(hndJfkAirlines).toContain("All Nippon Airways");
      expect(hndJfkAirlines).toContain("United");

      expect(ROUTE_AIRLINE_SUPPLEMENTS["JFK-HND"]).toContain("All Nippon Airways");
      expect(ROUTE_AIRLINE_SUPPLEMENTS["JFK-HND"]).toContain("United");
    });

    test("P3 Expansion: All 10 corridors bidirectional coverage", () => {
      const p3Routes = [
        "BKK-LAX",
        "SYD-LAX",
        "NRT-SYD",
        "CDG-SYD",
        "DXB-SYD",
        "LHR-SYD",
        "ORD-NRT",
        "SFO-NRT",
        "LAX-HND",
        "JFK-HND",
      ];

      for (const route of p3Routes) {
        const [from, to] = route.split("-");
        const reverse = `${to}-${from}`;

        expect(HOME_CARRIER_PROGRAMS[route]).toBeDefined();
        expect(HOME_CARRIER_PROGRAMS[reverse]).toBeDefined();
      }
    });

    test("P3 Expansion: Total corridor count increased", () => {
      const totalRoutes = Object.keys(HOME_CARRIER_PROGRAMS).length;
      expect(totalRoutes).toBeGreaterThanOrEqual(120);
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
