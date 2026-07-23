// __tests__/lib/pacific.test.ts
// Comprehensive tests for P5 Task 3.2: South Pacific Expansion (SYD, AKL hubs)
// Verifies Qantas Frequent Flyer and Air New Zealand Airpoints configuration

import { HOME_CARRIER_PROGRAMS, ROUTE_AIRLINE_SUPPLEMENTS } from "@/lib/engine/supplements";
import { PROGRAM_TO_AIRLINE } from "@/lib/costEngine";
import { getMilesRequired } from "@/data/awardCharts";

describe("P5 Task 3.2: South Pacific Expansion (SYD, AKL)", () => {
  // ─── Program Registration ───────────────────────────────────────────────────
  it("Qantas Frequent Flyer is registered in PROGRAM_TO_AIRLINE", () => {
    expect(PROGRAM_TO_AIRLINE["Qantas Frequent Flyer"]).toBe("Qantas");
  });

  it("Air New Zealand Airpoints is registered in PROGRAM_TO_AIRLINE", () => {
    expect(PROGRAM_TO_AIRLINE["Air New Zealand Airpoints"]).toBe("Air New Zealand");
  });

  // Note: OPERATOR_TO_PROGRAM is not exported, so we verify through
  // the home carrier guarantees and award charts instead

  // ─── Home Carrier Guarantees — SYD Routes ──────────────────────────────────
  describe("SYD hub corridors", () => {
    const sydRoutes = [
      { route: "SYD-LAX", expectedProgram: "Qantas Frequent Flyer" },
      { route: "LAX-SYD", expectedProgram: "Qantas Frequent Flyer" },
      { route: "SYD-JFK", expectedProgram: "Qantas Frequent Flyer" },
      { route: "JFK-SYD", expectedProgram: "Qantas Frequent Flyer" },
      { route: "SYD-LHR", expectedProgram: "Qantas Frequent Flyer" },
      { route: "SYD-CDG", expectedProgram: "Qantas Frequent Flyer" },
      { route: "SYD-NRT", expectedProgram: "Qantas Frequent Flyer" },
      { route: "SYD-BKK", expectedProgram: "Qantas Frequent Flyer" },
    ];

    it.each(sydRoutes)("$route has $expectedProgram", ({ route, expectedProgram }) => {
      const carriers = HOME_CARRIER_PROGRAMS[route] ?? [];
      const allPrograms = carriers.flatMap(c => c.programs);
      expect(allPrograms).toContain(expectedProgram);
    });

    it("all SYD routes have ROUTE_AIRLINE_SUPPLEMENTS entries", () => {
      const sydSupplementRoutes = [
        "SYD-LAX", "LAX-SYD", "SYD-JFK", "JFK-SYD",
        "SYD-LHR", "LHR-SYD", "SYD-CDG", "CDG-SYD",
        "SYD-BKK", "BKK-SYD",
      ];
      for (const route of sydSupplementRoutes) {
        expect(ROUTE_AIRLINE_SUPPLEMENTS[route]).toBeDefined();
        expect(Array.isArray(ROUTE_AIRLINE_SUPPLEMENTS[route])).toBe(true);
        expect(ROUTE_AIRLINE_SUPPLEMENTS[route]!.length).toBeGreaterThan(0);
      }
    });

    it("SYD routes include Qantas or partner carriers", () => {
      const sydSupplementRoutes = ["SYD-LAX", "LAX-SYD", "SYD-JFK", "JFK-SYD"];
      for (const route of sydSupplementRoutes) {
        const airlines = ROUTE_AIRLINE_SUPPLEMENTS[route] ?? [];
        expect(airlines).toContain("Qantas");
      }
    });

    it("reverse SYD-LHR route has British Airways", () => {
      const lhrSyd = ROUTE_AIRLINE_SUPPLEMENTS["LHR-SYD"] ?? [];
      expect(lhrSyd).toContain("British Airways");
    });

    it("reverse SYD-CDG route has Air France", () => {
      const cdgSyd = ROUTE_AIRLINE_SUPPLEMENTS["CDG-SYD"] ?? [];
      expect(cdgSyd).toContain("Air France");
    });

    it("reverse SYD-BKK route has Thai Airways", () => {
      const bkkSyd = ROUTE_AIRLINE_SUPPLEMENTS["BKK-SYD"] ?? [];
      expect(bkkSyd).toContain("Thai Airways");
    });
  });

  // ─── Home Carrier Guarantees — AKL Routes ──────────────────────────────────
  describe("AKL hub corridors", () => {
    const aklRoutes = [
      { route: "AKL-LAX", expectedProgram: "Air New Zealand Airpoints" },
      { route: "LAX-AKL", expectedProgram: "Air New Zealand Airpoints" },
      { route: "AKL-SFO", expectedProgram: "Air New Zealand Airpoints" },
      { route: "SFO-AKL", expectedProgram: "Air New Zealand Airpoints" },
      { route: "AKL-LHR", expectedProgram: "Air New Zealand Airpoints" },
    ];

    it.each(aklRoutes)("$route has $expectedProgram", ({ route, expectedProgram }) => {
      const carriers = HOME_CARRIER_PROGRAMS[route] ?? [];
      const allPrograms = carriers.flatMap(c => c.programs);
      expect(allPrograms).toContain(expectedProgram);
    });

    it("all AKL routes have ROUTE_AIRLINE_SUPPLEMENTS entries", () => {
      const aklSupplementRoutes = [
        "AKL-LAX", "LAX-AKL", "AKL-SFO", "SFO-AKL", "AKL-LHR", "LHR-AKL",
      ];
      for (const route of aklSupplementRoutes) {
        expect(ROUTE_AIRLINE_SUPPLEMENTS[route]).toBeDefined();
        expect(Array.isArray(ROUTE_AIRLINE_SUPPLEMENTS[route])).toBe(true);
        expect(ROUTE_AIRLINE_SUPPLEMENTS[route]!.length).toBeGreaterThan(0);
      }
    });

    it("AKL routes include Air New Zealand or partner carriers", () => {
      const aklSupplementRoutes = ["AKL-LAX", "LAX-AKL", "AKL-SFO", "SFO-AKL"];
      for (const route of aklSupplementRoutes) {
        const airlines = ROUTE_AIRLINE_SUPPLEMENTS[route] ?? [];
        expect(airlines).toContain("Air New Zealand");
      }
    });

    it("reverse AKL-LHR route has British Airways", () => {
      const lhrAkl = ROUTE_AIRLINE_SUPPLEMENTS["LHR-AKL"] ?? [];
      expect(lhrAkl).toContain("British Airways");
    });
  });

  // ─── Award Charts ───────────────────────────────────────────────────────────
  describe("Air New Zealand Airpoints award chart", () => {
    it("has economy rates for ASIA→North America", () => {
      // 50,000 miles one-way per pax (SYD/AKL to LAX/SFO)
      const result = getMilesRequired(
        "Air New Zealand Airpoints",
        "ASIA",
        "NORTH_AMERICA",
        "economy",
        "oneway",
        1
      );
      expect(result.miles).toBe(50_000);
      expect(result.source).toBe("REAL");
    });

    it("has business rates for ASIA→Europe", () => {
      // 140,000 miles one-way per pax (SYD/AKL to LHR/CDG)
      const result = getMilesRequired(
        "Air New Zealand Airpoints",
        "ASIA",
        "EUROPE",
        "business",
        "oneway",
        1
      );
      expect(result.miles).toBe(140_000);
      expect(result.source).toBe("REAL");
    });

    it("has economy rates for Asia→Asia regional", () => {
      // 20,000 miles one-way per pax (within South Pacific region)
      const result = getMilesRequired(
        "Air New Zealand Airpoints",
        "ASIA",
        "ASIA",
        "economy",
        "oneway",
        1
      );
      expect(result.miles).toBe(20_000);
      expect(result.source).toBe("REAL");
    });

    it("supports roundtrip calculations (doubles one-way)", () => {
      const oneway = getMilesRequired(
        "Air New Zealand Airpoints",
        "ASIA",
        "NORTH_AMERICA",
        "economy",
        "oneway",
        1
      );
      const roundtrip = getMilesRequired(
        "Air New Zealand Airpoints",
        "ASIA",
        "NORTH_AMERICA",
        "economy",
        "roundtrip",
        1
      );
      expect(roundtrip.miles).toBe(oneway.miles * 2);
    });

    it("scales for multiple passengers", () => {
      const onePax = getMilesRequired(
        "Air New Zealand Airpoints",
        "ASIA",
        "NORTH_AMERICA",
        "economy",
        "oneway",
        1
      );
      const twoPax = getMilesRequired(
        "Air New Zealand Airpoints",
        "ASIA",
        "NORTH_AMERICA",
        "economy",
        "oneway",
        2
      );
      expect(twoPax.miles).toBe(onePax.miles * 2);
    });
  });

  // ─── Symmetry & Consistency ───────────────────────────────────────────────
  describe("Route symmetry", () => {
    it("all SYD routes have reverse counterparts in HOME_CARRIER_PROGRAMS", () => {
      const sydRoutes = [
        "SYD-LAX", "SYD-JFK", "SYD-LHR", "SYD-CDG", "SYD-NRT", "SYD-BKK",
      ];
      for (const route of sydRoutes) {
        const [from, to] = route.split("-");
        const reverse = `${to}-${from}`;
        expect(HOME_CARRIER_PROGRAMS).toHaveProperty(reverse);
      }
    });

    it("all AKL routes have reverse counterparts in HOME_CARRIER_PROGRAMS", () => {
      const aklRoutes = ["AKL-LAX", "AKL-SFO", "AKL-LHR"];
      for (const route of aklRoutes) {
        const [from, to] = route.split("-");
        const reverse = `${to}-${from}`;
        expect(HOME_CARRIER_PROGRAMS).toHaveProperty(reverse);
      }
    });
  });

  // ─── Regression Prevention ───────────────────────────────────────────────────
  describe("No program name typos", () => {
    it("all SYD route programs are correctly spelled", () => {
      const sydRoutes = Object.entries(HOME_CARRIER_PROGRAMS)
        .filter(([k]) => k.startsWith("SYD-") || k.endsWith("-SYD"));

      const badNames: string[] = [];
      for (const [route, carriers] of sydRoutes) {
        for (const { programs } of carriers) {
          for (const p of programs) {
            if (p === "Qantas" || p === "QF" || p === "Frequent Flyer") {
              badNames.push(`${route}: "${p}" is malformed (use "Qantas Frequent Flyer")`);
            }
          }
        }
      }
      expect(badNames).toEqual([]);
    });

    it("all AKL route programs are correctly spelled", () => {
      const aklRoutes = Object.entries(HOME_CARRIER_PROGRAMS)
        .filter(([k]) => k.startsWith("AKL-") || k.endsWith("-AKL"));

      const badNames: string[] = [];
      for (const [route, carriers] of aklRoutes) {
        for (const { programs } of carriers) {
          for (const p of programs) {
            if (p === "Air New Zealand" || p === "ANZ Airpoints" || p === "Airpoints") {
              badNames.push(`${route}: "${p}" is malformed (use "Air New Zealand Airpoints")`);
            }
          }
        }
      }
      expect(badNames).toEqual([]);
    });
  });

  // ─── Network Coverage ───────────────────────────────────────────────────────
  describe("South Pacific hub coverage", () => {
    it("has entries for SYD hub (Sydney)", () => {
      const keys = Object.keys(HOME_CARRIER_PROGRAMS);
      expect(keys.some(k => k.startsWith("SYD-"))).toBe(true);
      expect(keys.some(k => k.endsWith("-SYD"))).toBe(true);
    });

    it("has entries for AKL hub (Auckland/Wellington)", () => {
      const keys = Object.keys(HOME_CARRIER_PROGRAMS);
      expect(keys.some(k => k.startsWith("AKL-"))).toBe(true);
      expect(keys.some(k => k.endsWith("-AKL"))).toBe(true);
    });

    it("SYD hub has at least 6 outbound corridors", () => {
      const sydOutbound = Object.keys(HOME_CARRIER_PROGRAMS).filter(k => k.startsWith("SYD-"));
      expect(sydOutbound.length).toBeGreaterThanOrEqual(6);
    });

    it("AKL hub has at least 3 outbound corridors", () => {
      const aklOutbound = Object.keys(HOME_CARRIER_PROGRAMS).filter(k => k.startsWith("AKL-"));
      expect(aklOutbound.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ─── Integration ────────────────────────────────────────────────────────────
  describe("Integration with existing hubs", () => {
    it("SYD-HKG route already exists from previous phases", () => {
      expect(HOME_CARRIER_PROGRAMS).toHaveProperty("SYD-HKG");
      expect(HOME_CARRIER_PROGRAMS).toHaveProperty("HKG-SYD");
    });

    it("SYD-AUH route already exists from previous phases", () => {
      expect(HOME_CARRIER_PROGRAMS).toHaveProperty("SYD-AUH");
      expect(HOME_CARRIER_PROGRAMS).toHaveProperty("AUH-SYD");
    });

    it("NRT-SYD already exists and includes ANA and Qantas (P3 Expansion)", () => {
      const nrtSyd = HOME_CARRIER_PROGRAMS["NRT-SYD"] ?? [];
      const allPrograms = nrtSyd.flatMap(c => c.programs);
      expect(allPrograms).toContain("ANA Mileage Club");
      expect(allPrograms).toContain("Qantas Frequent Flyer");
    });
  });
});
