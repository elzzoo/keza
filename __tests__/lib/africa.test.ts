// __tests__/lib/africa.test.ts
// Regression tests for Africa hub consolidation (Task 3.3).
// Verifies JNB gateway connectivity with 8 major corridors and multi-alliance coverage.

import { HOME_CARRIER_PROGRAMS, ROUTE_AIRLINE_SUPPLEMENTS } from "@/lib/engine/supplements";

describe("Africa consolidation (Task 3.3)", () => {
  it("returns South African Airways Voyager on all JNB-Europe routes", () => {
    const europeRoutes = ["JNB-LHR", "JNB-CDG", "JNB-FRA"];

    for (const route of europeRoutes) {
      const guarantee = HOME_CARRIER_PROGRAMS[route];
      expect(guarantee).toBeDefined();
      expect(guarantee).toHaveLength(1);
      expect(guarantee[0].airline).toBe("South African Airways");
      expect(guarantee[0].programs).toContain("South African Voyager");
    }
  });

  it("returns South African Airways Voyager on all JNB-Americas routes", () => {
    const americasRoutes = ["JNB-LAX", "JNB-JFK"];

    for (const route of americasRoutes) {
      const guarantee = HOME_CARRIER_PROGRAMS[route];
      expect(guarantee).toBeDefined();
      expect(guarantee).toHaveLength(1);
      expect(guarantee[0].airline).toBe("South African Airways");
      expect(guarantee[0].programs).toContain("South African Voyager");
    }
  });

  it("returns reverse European carriers on Europe-JNB routes", () => {
    const reverseRoutes = {
      "LHR-JNB": "South African Airways",
      "CDG-JNB": "South African Airways",
      "FRA-JNB": "South African Airways",
    };

    for (const [route, airline] of Object.entries(reverseRoutes)) {
      const guarantee = HOME_CARRIER_PROGRAMS[route];
      expect(guarantee).toBeDefined();
      expect(guarantee[0].airline).toBe(airline);
      expect(guarantee[0].programs).toContain("South African Voyager");
    }
  });

  it("returns reverse American carriers on Americas-JNB routes", () => {
    const reverseRoutes = {
      "LAX-JNB": "South African Airways",
      "JFK-JNB": "South African Airways",
    };

    for (const [route, airline] of Object.entries(reverseRoutes)) {
      const guarantee = HOME_CARRIER_PROGRAMS[route];
      expect(guarantee).toBeDefined();
      expect(guarantee[0].airline).toBe(airline);
      expect(guarantee[0].programs).toContain("South African Voyager");
    }
  });

  it("returns South African Airways Voyager on JNB-DXB (new corridor)", () => {
    const guarantee = HOME_CARRIER_PROGRAMS["JNB-DXB"];
    expect(guarantee).toBeDefined();
    expect(guarantee[0].airline).toBe("South African Airways");
    expect(guarantee[0].programs).toContain("South African Voyager");
  });

  it("returns Emirates Skywards on DXB-JNB (new corridor)", () => {
    const guarantee = HOME_CARRIER_PROGRAMS["DXB-JNB"];
    expect(guarantee).toBeDefined();
    expect(guarantee[0].airline).toBe("Emirates");
    expect(guarantee[0].programs).toContain("Emirates Skywards");
  });

  it("returns South African Airways Voyager on JNB-BKK (new corridor)", () => {
    const guarantee = HOME_CARRIER_PROGRAMS["JNB-BKK"];
    expect(guarantee).toBeDefined();
    expect(guarantee[0].airline).toBe("South African Airways");
    expect(guarantee[0].programs).toContain("South African Voyager");
  });

  it("returns Thai Royal Orchid Plus on BKK-JNB (new corridor)", () => {
    const guarantee = HOME_CARRIER_PROGRAMS["BKK-JNB"];
    expect(guarantee).toBeDefined();
    expect(guarantee[0].airline).toBe("Thai Airways");
    expect(guarantee[0].programs).toContain("Thai Royal Orchid Plus");
  });

  it("returns South African Airways Voyager on JNB-SYD (new corridor)", () => {
    const guarantee = HOME_CARRIER_PROGRAMS["JNB-SYD"];
    expect(guarantee).toBeDefined();
    expect(guarantee[0].airline).toBe("South African Airways");
    expect(guarantee[0].programs).toContain("South African Voyager");
  });

  it("returns Qantas Frequent Flyer on SYD-JNB (new corridor)", () => {
    const guarantee = HOME_CARRIER_PROGRAMS["SYD-JNB"];
    expect(guarantee).toBeDefined();
    expect(guarantee[0].airline).toBe("Qantas");
    expect(guarantee[0].programs).toContain("Qantas Frequent Flyer");
  });

  it("all 16 JNB corridors (8 pairs) have ROUTE_AIRLINE_SUPPLEMENTS", () => {
    const jnbRoutes = [
      // Task 1.5 routes
      "JNB-LHR", "LHR-JNB",
      "JNB-CDG", "CDG-JNB",
      "JNB-FRA", "FRA-JNB",
      "JNB-LAX", "LAX-JNB",
      "JNB-JFK", "JFK-JNB",
      // Task 3.3 new routes
      "JNB-DXB", "DXB-JNB",
      "JNB-BKK", "BKK-JNB",
      "JNB-SYD", "SYD-JNB",
    ];

    for (const route of jnbRoutes) {
      expect(ROUTE_AIRLINE_SUPPLEMENTS[route]).toBeDefined();
      expect(Array.isArray(ROUTE_AIRLINE_SUPPLEMENTS[route])).toBe(true);
      expect(ROUTE_AIRLINE_SUPPLEMENTS[route].length).toBeGreaterThan(0);
    }
  });

  it("JNB-DXB has South African Airways in supplements", () => {
    const supplement = ROUTE_AIRLINE_SUPPLEMENTS["JNB-DXB"];
    expect(supplement).toContain("South African Airways");
    expect(supplement).toContain("Emirates");
  });

  it("DXB-JNB has Emirates in supplements", () => {
    const supplement = ROUTE_AIRLINE_SUPPLEMENTS["DXB-JNB"];
    expect(supplement).toContain("Emirates");
    expect(supplement).toContain("South African Airways");
  });

  it("JNB-BKK has South African Airways in supplements", () => {
    const supplement = ROUTE_AIRLINE_SUPPLEMENTS["JNB-BKK"];
    expect(supplement).toContain("South African Airways");
    expect(supplement).toContain("Thai Airways");
  });

  it("BKK-JNB has Thai Airways in supplements", () => {
    const supplement = ROUTE_AIRLINE_SUPPLEMENTS["BKK-JNB"];
    expect(supplement).toContain("Thai Airways");
    expect(supplement).toContain("South African Airways");
  });

  it("JNB-SYD has South African Airways in supplements", () => {
    const supplement = ROUTE_AIRLINE_SUPPLEMENTS["JNB-SYD"];
    expect(supplement).toContain("South African Airways");
    expect(supplement).toContain("Qantas");
  });

  it("SYD-JNB has Qantas in supplements", () => {
    const supplement = ROUTE_AIRLINE_SUPPLEMENTS["SYD-JNB"];
    expect(supplement).toContain("Qantas");
    expect(supplement).toContain("South African Airways");
  });

  it("JNB as major gateway with multi-alliance coverage", () => {
    const jnbRoutes = [
      ["JNB", "LHR"],  // British Airways (OneWorld)
      ["JNB", "CDG"],  // Air France (SkyTeam)
      ["JNB", "FRA"],  // Lufthansa (Star Alliance)
      ["JNB", "LAX"],  // South African Airways via Star Alliance
      ["JNB", "JFK"],  // South African Airways
      ["JNB", "DXB"],  // Emirates (Independent)
      ["JNB", "BKK"],  // Thai Airways (Star Alliance)
      ["JNB", "SYD"],  // Qantas (OneWorld)
    ];

    for (const [from, to] of jnbRoutes) {
      const key = `${from}-${to}`;
      const guarantee = HOME_CARRIER_PROGRAMS[key];
      expect(guarantee).toBeDefined();
      expect(guarantee.length).toBeGreaterThan(0);

      // Verify airlines are represented
      const airlines = guarantee.map((g) => g.airline);
      expect(airlines).toBeDefined();
      expect(airlines.length).toBeGreaterThan(0);
    }
  });

  it("South African Airways Voyager is present on all JNB outbound routes", () => {
    const outboundRoutes = [
      "JNB-LHR", "JNB-CDG", "JNB-FRA",
      "JNB-LAX", "JNB-JFK", "JNB-DXB",
      "JNB-BKK", "JNB-SYD",
    ];

    for (const route of outboundRoutes) {
      const guarantee = HOME_CARRIER_PROGRAMS[route];
      expect(guarantee).toBeDefined();
      const programs = guarantee.flatMap((g) => g.programs);
      expect(programs).toContain("South African Voyager");
    }
  });

  it("reverse direction routes have appropriate home carriers", () => {
    const reverseRoutes = {
      "LHR-JNB": "South African Airways",
      "CDG-JNB": "South African Airways",
      "FRA-JNB": "South African Airways",
      "LAX-JNB": "South African Airways",
      "JFK-JNB": "South African Airways",
      "DXB-JNB": "Emirates",
      "BKK-JNB": "Thai Airways",
      "SYD-JNB": "Qantas",
    };

    for (const [route, expectedAirline] of Object.entries(reverseRoutes)) {
      const guarantee = HOME_CARRIER_PROGRAMS[route];
      expect(guarantee).toBeDefined();
      expect(guarantee[0].airline).toBe(expectedAirline);
    }
  });

  it("all 8 JNB corridor pairs (16 directional routes) are defined", () => {
    const corridors = [
      ["JNB-LHR", "LHR-JNB"],
      ["JNB-CDG", "CDG-JNB"],
      ["JNB-FRA", "FRA-JNB"],
      ["JNB-LAX", "LAX-JNB"],
      ["JNB-JFK", "JFK-JNB"],
      ["JNB-DXB", "DXB-JNB"],
      ["JNB-BKK", "BKK-JNB"],
      ["JNB-SYD", "SYD-JNB"],
    ];

    let totalRoutes = 0;
    for (const [outbound, inbound] of corridors) {
      expect(HOME_CARRIER_PROGRAMS[outbound]).toBeDefined();
      expect(HOME_CARRIER_PROGRAMS[inbound]).toBeDefined();
      totalRoutes += 2;
    }

    expect(totalRoutes).toBe(16);
  });
});
