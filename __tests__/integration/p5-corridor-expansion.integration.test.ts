import { HOME_CARRIER_PROGRAMS, ROUTE_AIRLINE_SUPPLEMENTS } from "@/lib/engine/supplements";

describe("P5 Corridor Expansion - Full Regression Suite (50+ corridors)", () => {
  // All 50+ corridors: 31 existing + 19+ new from Tasks 1.1–1.5
  // Existing 31 from P0-P3 (core hub routes)
  const existingCorridors = [
    "SIN-LAX",
    "LAX-SIN",
    "SIN-JFK",
    "JFK-SIN",
    "NRT-LAX",
    "LAX-NRT",
    "NRT-JFK",
    "JFK-NRT",
    "DXB-LHR",
    "LHR-DXB",
    "DXB-JFK",
    "JFK-DXB",
    "CDG-BKK",
    "BKK-CDG",
    "CDG-JNB",
    "JNB-CDG",
    "AUH-LHR",
    "LHR-AUH",
    "DOH-JFK",
    "JFK-DOH",
    "ICN-LAX",
    "LAX-ICN",
    "CMN-JFK",
    "JFK-CMN",
    "NBO-CDG",
    "CDG-NBO",
    "ADD-LHR",
    "LHR-ADD",
    "JNB-LAX",
    "LAX-JNB",
    "HKG-LAX",
  ];

  // New corridors from P5 Task 1.1 (Europe Hub Expansion)
  const europeanCorridors = [
    "FRA-LAX",
    "LAX-FRA",
    "FRA-JFK",
    "JFK-FRA",
    "FRA-CDG",
    "CDG-FRA",
    "AMS-LAX",
    "LAX-AMS",
    "AMS-CDG",
    "CDG-AMS",
    "LHR-LAX",
    "LAX-LHR",
    "LHR-JFK",
    "JFK-LHR",
    "LHR-SFO",
    "SFO-LHR",
    "LHR-CDG",
    "CDG-LHR",
    "LHR-FRA",
    "FRA-LHR",
    "LHR-AMS",
    "AMS-LHR",
  ];

  // New corridors from P5 Task 1.2 (Asia Hub Expansion)
  const asiaCorridors = [
    "HKG-JFK",
    "JFK-HKG",
    "BKK-LAX",
    "LAX-BKK",
    "BKK-NRT",
    "NRT-BKK",
    "KUL-LAX",
    "LAX-KUL",
    "KUL-LHR",
    "LHR-KUL",
  ];

  // New corridors from P5 Task 1.3 (Middle East Expansion)
  const middleEastCorridors = [
    "AUH-LAX",
    "LAX-AUH",
    "AUH-BKK",
    "BKK-AUH",
    "AUH-SYD",
    "SYD-AUH",
    "DOH-LAX",
    "LAX-DOH",
    "DOH-BKK",
    "BKK-DOH",
  ];

  // New corridors from P5 Task 1.4 (US Hub Expansion)
  const usHubCorridors = [
    "MIA-GRU",
    "GRU-MIA",
    "MIA-EZE",
    "EZE-MIA",
    "MIA-BOG",
    "BOG-MIA",
    "MIA-LHR",
    "LHR-MIA",
    "MIA-CDG",
    "CDG-MIA",
    "MIA-SFO",
    "SFO-MIA",
    "ORD-LHR",
    "LHR-ORD",
    "ORD-CDG",
    "CDG-ORD",
    "ORD-FRA",
    "FRA-ORD",
    "ORD-NRT",
    "NRT-ORD",
  ];

  // New corridors from P5 Task 1.5 (Africa Hub Expansion)
  const africaCorridors = [
    "ADD-AMS",
    "AMS-ADD",
    "NBO-FRA",
    "FRA-NBO",
    "CMN-CDG",
    "CDG-CMN",
    "CMN-LAX",
    "LAX-CMN",
    "CMN-LHR",
    "LHR-CMN",
    "JNB-LHR",
    "LHR-JNB",
    "JNB-FRA",
    "FRA-JNB",
    "JNB-JFK",
    "JFK-JNB",
  ];

  const allCorridors = [
    ...existingCorridors,
    ...europeanCorridors,
    ...asiaCorridors,
    ...middleEastCorridors,
    ...usHubCorridors,
    ...africaCorridors,
  ];

  // Test 1: All corridors are defined in supplements
  describe("Corridor Coverage in Supplements", () => {
    it("all 50+ corridors have home carrier or route supplement definitions", () => {
      const undefinedCorridors: string[] = [];

      for (const corridor of allCorridors) {
        const hasHomeCarrier = corridor in HOME_CARRIER_PROGRAMS;
        const hasRouteSupp = corridor in ROUTE_AIRLINE_SUPPLEMENTS;

        // A corridor should have at least home carrier OR route supplement
        // (Though most have home carrier guarantees)
        if (!hasHomeCarrier && !hasRouteSupp) {
          undefinedCorridors.push(corridor);
        }
      }

      expect(undefinedCorridors).toHaveLength(0);
    });
  });

  // Test 2: Home carrier programs are properly defined
  describe("Home Carrier Program Coverage", () => {
    it("home carrier programs exist for key hub corridors", () => {
      const keyHubCorridors = [
        "SIN-LAX", // Singapore Airlines KrisFlyer
        "NRT-LAX", // ANA Mileage Club + JAL Mileage Bank
        "DXB-LHR", // Emirates Skywards
        "AUH-LHR", // Etihad Guest
        "DOH-JFK", // Qatar Privilege Club
        "ICN-LAX", // Korean Air SKYPASS
        "FRA-LAX", // Lufthansa Miles & More
        "LHR-LAX", // British Airways Avios
        "BKK-LAX", // Thai Airways Royal Orchid Plus
        "JNB-LHR", // South African Voyager
      ];

      for (const corridor of keyHubCorridors) {
        expect(corridor in HOME_CARRIER_PROGRAMS).toBe(true);

        const programs = HOME_CARRIER_PROGRAMS[corridor];
        expect(Array.isArray(programs)).toBe(true);
        expect(programs.length).toBeGreaterThan(0);

        // Each program entry should have airline and programs array
        for (const entry of programs) {
          expect(entry.airline).toBeDefined();
          expect(typeof entry.airline).toBe("string");
          expect(entry.programs).toBeDefined();
          expect(Array.isArray(entry.programs)).toBe(true);
          expect(entry.programs.length).toBeGreaterThan(0);
        }
      }
    });
  });

  // Test 3: Route airline supplements are consistent
  describe("Route Airline Supplements", () => {
    it("route supplements define valid airline names", () => {
      // Sample some supplemented routes
      const sampledRoutes = Object.keys(ROUTE_AIRLINE_SUPPLEMENTS).slice(0, 10);

      for (const route of sampledRoutes) {
        const airlines = ROUTE_AIRLINE_SUPPLEMENTS[route];
        expect(Array.isArray(airlines)).toBe(true);
        expect(airlines.length).toBeGreaterThan(0);

        // All should be non-empty strings
        for (const airline of airlines) {
          expect(typeof airline).toBe("string");
          expect(airline.length).toBeGreaterThan(0);
        }
      }
    });
  });

  // Test 4: Verify corridor naming consistency
  describe("Corridor Naming Convention", () => {
    it("all corridors follow IATA-IATA format (uppercase)", () => {
      const iataPattern = /^[A-Z]{3}-[A-Z]{3}$/;
      const malformedCorridors: string[] = [];

      for (const corridor of allCorridors) {
        if (!iataPattern.test(corridor)) {
          malformedCorridors.push(corridor);
        }
      }

      expect(malformedCorridors).toHaveLength(0);
    });

    it("all corridor codes are 3-letter IATA codes", () => {
      for (const corridor of allCorridors) {
        const [from, to] = corridor.split("-");
        expect(from.length).toBe(3);
        expect(to.length).toBe(3);
        expect(from).toMatch(/^[A-Z]{3}$/);
        expect(to).toMatch(/^[A-Z]{3}$/);
      }
    });
  });

  // Test 5: No duplicate corridors within category
  describe("Corridor Uniqueness", () => {
    it("no duplicate corridors within category sets", () => {
      const corridorSets = [
        existingCorridors,
        europeanCorridors,
        asiaCorridors,
        middleEastCorridors,
        usHubCorridors,
        africaCorridors,
      ];

      for (const corridors of corridorSets) {
        const uniqueCount = new Set(corridors).size;
        expect(uniqueCount).toBe(corridors.length);
      }
    });

    it("no overlaps between different category sets", () => {
      const totalUnique = new Set(allCorridors).size;
      const totalCombined = allCorridors.length;

      expect(totalUnique).toBe(totalCombined);
    });
  });

  // Test 6: Corridor count summary
  describe("Total Coverage", () => {
    it("covers all 50+ corridors (31 existing + 19+ new)", () => {
      expect(existingCorridors.length).toBe(31);
      expect(europeanCorridors.length).toBe(22);
      expect(asiaCorridors.length).toBe(10);
      expect(middleEastCorridors.length).toBe(10);
      expect(usHubCorridors.length).toBe(20);
      expect(africaCorridors.length).toBe(16);

      // Total should be 50+
      const totalCoverage =
        existingCorridors.length +
        europeanCorridors.length +
        asiaCorridors.length +
        middleEastCorridors.length +
        usHubCorridors.length +
        africaCorridors.length;

      expect(totalCoverage).toBeGreaterThanOrEqual(50);
      expect(totalCoverage).toBe(109); // Exact count
    });

    it("breaks down correctly across task phases", () => {
      // Phase breakdown:
      // P0-P3: 31 existing
      // P5 T1.1 (Europe): 22 new
      // P5 T1.2 (Asia): 10 new
      // P5 T1.3 (ME): 10 new
      // P5 T1.4 (US): 20 new
      // P5 T1.5 (Africa): 16 new
      const phaseExpectations = [
        { phase: "P0-P3 (existing)", count: 31 },
        { phase: "P5 Task 1.1 (Europe)", count: 22 },
        { phase: "P5 Task 1.2 (Asia)", count: 10 },
        { phase: "P5 Task 1.3 (Middle East)", count: 10 },
        { phase: "P5 Task 1.4 (US Hub)", count: 20 },
        { phase: "P5 Task 1.5 (Africa)", count: 16 },
      ];

      const actualsMap = new Map([
        ["P0-P3 (existing)", existingCorridors.length],
        ["P5 Task 1.1 (Europe)", europeanCorridors.length],
        ["P5 Task 1.2 (Asia)", asiaCorridors.length],
        ["P5 Task 1.3 (Middle East)", middleEastCorridors.length],
        ["P5 Task 1.4 (US Hub)", usHubCorridors.length],
        ["P5 Task 1.5 (Africa)", africaCorridors.length],
      ]);

      for (const expectation of phaseExpectations) {
        expect(actualsMap.get(expectation.phase)).toBe(expectation.count);
      }
    });
  });

  // Test 7: Home carrier guarantee covers signature programs
  describe("Home Carrier Guarantees", () => {
    it("signature programs are guaranteed on their hub corridors", () => {
      const signatureProgramHubs = [
        {
          program: "Singapore KrisFlyer",
          corridors: ["SIN-LAX", "LAX-SIN", "SIN-JFK", "JFK-SIN"],
        },
        {
          program: "ANA Mileage Club",
          corridors: ["NRT-LAX", "LAX-NRT", "NRT-JFK", "JFK-NRT"],
        },
        {
          program: "Emirates Skywards",
          corridors: ["DXB-LHR", "LHR-DXB", "DXB-JFK", "JFK-DXB"],
        },
        {
          program: "Qatar Privilege Club",
          corridors: ["DOH-JFK", "JFK-DOH"],
        },
        {
          program: "Cathay Pacific Asia Miles",
          corridors: ["HKG-LAX", "LAX-HKG", "HKG-JFK", "JFK-HKG"],
        },
      ];

      for (const hub of signatureProgramHubs) {
        for (const corridor of hub.corridors) {
          expect(corridor in HOME_CARRIER_PROGRAMS).toBe(true);

          const programs = HOME_CARRIER_PROGRAMS[corridor];
          const hasProgram = programs.some((p) =>
            p.programs.includes(hub.program)
          );

          expect(hasProgram).toBe(true);
        }
      }
    });
  });
});
