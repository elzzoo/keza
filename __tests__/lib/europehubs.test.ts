// __tests__/lib/europehubs.test.ts
// Regression tests for Europe Hubs (P5 Scaling Task 1.1)
// Verifies that London (LHR), Frankfurt (FRA), and Amsterdam (AMS) hubs
// are properly configured with home carrier guarantees and route supplements.

import { HOME_CARRIER_PROGRAMS, ROUTE_AIRLINE_SUPPLEMENTS } from "@/lib/engine/supplements";

describe("Europe Hub Corridors (Task 1.1)", () => {
  describe("HOME_CARRIER_PROGRAMS — Europe hubs", () => {
    it("includes Lufthansa Miles & More on FRA-LAX and LAX-FRA", () => {
      const fraLax = HOME_CARRIER_PROGRAMS["FRA-LAX"];
      const laxFra = HOME_CARRIER_PROGRAMS["LAX-FRA"];

      expect(fraLax).toBeDefined();
      expect(fraLax).toContainEqual(
        expect.objectContaining({
          airline: "Lufthansa",
          programs: expect.arrayContaining(["Lufthansa Miles & More"]),
        })
      );

      expect(laxFra).toBeDefined();
      expect(laxFra).toContainEqual(
        expect.objectContaining({
          airline: "Lufthansa",
          programs: expect.arrayContaining(["Lufthansa Miles & More"]),
        })
      );
    });

    it("includes Lufthansa on FRA-JFK and JFK-FRA", () => {
      for (const route of ["FRA-JFK", "JFK-FRA"]) {
        const guarantee = HOME_CARRIER_PROGRAMS[route];
        expect(guarantee).toBeDefined();
        const allPrograms = guarantee?.flatMap(c => c.programs) ?? [];
        expect(allPrograms).toContain("Lufthansa Miles & More");
      }
    });

    it("includes Lufthansa on FRA-CDG and CDG-FRA", () => {
      for (const route of ["FRA-CDG", "CDG-FRA"]) {
        const guarantee = HOME_CARRIER_PROGRAMS[route];
        expect(guarantee).toBeDefined();
        const allPrograms = guarantee?.flatMap(c => c.programs) ?? [];
        expect(allPrograms).toContain("Lufthansa Miles & More");
      }
    });

    it("includes Flying Blue on AMS-LAX and LAX-AMS (via KLM)", () => {
      for (const route of ["AMS-LAX", "LAX-AMS"]) {
        const guarantee = HOME_CARRIER_PROGRAMS[route];
        expect(guarantee).toBeDefined();
        expect(guarantee).toContainEqual(
          expect.objectContaining({
            airline: "KLM",
            programs: expect.arrayContaining(["Flying Blue"]),
          })
        );
      }
    });

    it("includes Flying Blue on AMS-CDG and CDG-AMS (via KLM)", () => {
      for (const route of ["AMS-CDG", "CDG-AMS"]) {
        const guarantee = HOME_CARRIER_PROGRAMS[route];
        expect(guarantee).toBeDefined();
        expect(guarantee).toContainEqual(
          expect.objectContaining({
            airline: "KLM",
            programs: expect.arrayContaining(["Flying Blue"]),
          })
        );
      }
    });

    it("includes British Airways Avios on LHR-LAX and LAX-LHR", () => {
      for (const route of ["LHR-LAX", "LAX-LHR"]) {
        const guarantee = HOME_CARRIER_PROGRAMS[route];
        expect(guarantee).toBeDefined();
        expect(guarantee).toContainEqual(
          expect.objectContaining({
            airline: "British Airways",
            programs: expect.arrayContaining(["British Airways Avios"]),
          })
        );
      }
    });

    it("includes British Airways Avios on LHR-JFK and JFK-LHR", () => {
      for (const route of ["LHR-JFK", "JFK-LHR"]) {
        const guarantee = HOME_CARRIER_PROGRAMS[route];
        expect(guarantee).toBeDefined();
        const allPrograms = guarantee?.flatMap(c => c.programs) ?? [];
        expect(allPrograms).toContain("British Airways Avios");
      }
    });

    it("includes British Airways Avios on LHR-SFO and SFO-LHR", () => {
      for (const route of ["LHR-SFO", "SFO-LHR"]) {
        const guarantee = HOME_CARRIER_PROGRAMS[route];
        expect(guarantee).toBeDefined();
        const allPrograms = guarantee?.flatMap(c => c.programs) ?? [];
        expect(allPrograms).toContain("British Airways Avios");
      }
    });

    it("includes Flying Blue on LHR-CDG (Air France) and CDG-LHR", () => {
      const lhrCdg = HOME_CARRIER_PROGRAMS["LHR-CDG"];
      const cdgLhr = HOME_CARRIER_PROGRAMS["CDG-LHR"];

      expect(lhrCdg).toBeDefined();
      expect(lhrCdg).toContainEqual(
        expect.objectContaining({
          airline: "Air France",
          programs: expect.arrayContaining(["Flying Blue"]),
        })
      );

      expect(cdgLhr).toBeDefined();
      expect(cdgLhr).toContainEqual(
        expect.objectContaining({
          airline: "Air France",
          programs: expect.arrayContaining(["Flying Blue"]),
        })
      );
    });

    it("includes Lufthansa on LHR-FRA and FRA-LHR", () => {
      for (const route of ["LHR-FRA", "FRA-LHR"]) {
        const guarantee = HOME_CARRIER_PROGRAMS[route];
        expect(guarantee).toBeDefined();
        const allPrograms = guarantee?.flatMap(c => c.programs) ?? [];
        expect(allPrograms).toContain("Lufthansa Miles & More");
      }
    });

    it("includes Flying Blue on LHR-AMS and AMS-LHR (via KLM)", () => {
      for (const route of ["LHR-AMS", "AMS-LHR"]) {
        const guarantee = HOME_CARRIER_PROGRAMS[route];
        expect(guarantee).toBeDefined();
        expect(guarantee).toContainEqual(
          expect.objectContaining({
            airline: "KLM",
            programs: expect.arrayContaining(["Flying Blue"]),
          })
        );
      }
    });
  });

  describe("ROUTE_AIRLINE_SUPPLEMENTS — Europe hubs", () => {
    it("includes Lufthansa + United on FRA-LAX and LAX-FRA", () => {
      expect(ROUTE_AIRLINE_SUPPLEMENTS["FRA-LAX"]).toEqual(
        expect.arrayContaining(["Lufthansa", "United"])
      );
      expect(ROUTE_AIRLINE_SUPPLEMENTS["LAX-FRA"]).toEqual(
        expect.arrayContaining(["Lufthansa", "United"])
      );
    });

    it("includes Lufthansa + United on FRA-JFK and JFK-FRA", () => {
      expect(ROUTE_AIRLINE_SUPPLEMENTS["FRA-JFK"]).toEqual(
        expect.arrayContaining(["Lufthansa", "United"])
      );
      expect(ROUTE_AIRLINE_SUPPLEMENTS["JFK-FRA"]).toEqual(
        expect.arrayContaining(["Lufthansa", "United"])
      );
    });

    it("includes Lufthansa + Air France on FRA-CDG and CDG-FRA", () => {
      expect(ROUTE_AIRLINE_SUPPLEMENTS["FRA-CDG"]).toEqual(
        expect.arrayContaining(["Lufthansa", "Air France"])
      );
      expect(ROUTE_AIRLINE_SUPPLEMENTS["CDG-FRA"]).toEqual(
        expect.arrayContaining(["Lufthansa", "Air France"])
      );
    });

    it("includes KLM + United on AMS-LAX and LAX-AMS", () => {
      expect(ROUTE_AIRLINE_SUPPLEMENTS["AMS-LAX"]).toEqual(
        expect.arrayContaining(["KLM", "United"])
      );
      expect(ROUTE_AIRLINE_SUPPLEMENTS["LAX-AMS"]).toEqual(
        expect.arrayContaining(["KLM", "United"])
      );
    });

    it("includes KLM + Air France on AMS-CDG and CDG-AMS", () => {
      expect(ROUTE_AIRLINE_SUPPLEMENTS["AMS-CDG"]).toEqual(
        expect.arrayContaining(["KLM", "Air France"])
      );
      expect(ROUTE_AIRLINE_SUPPLEMENTS["CDG-AMS"]).toEqual(
        expect.arrayContaining(["KLM", "Air France"])
      );
    });

    it("includes British Airways + United on LHR-LAX and LAX-LHR", () => {
      expect(ROUTE_AIRLINE_SUPPLEMENTS["LHR-LAX"]).toEqual(
        expect.arrayContaining(["British Airways", "United"])
      );
      expect(ROUTE_AIRLINE_SUPPLEMENTS["LAX-LHR"]).toEqual(
        expect.arrayContaining(["British Airways", "United"])
      );
    });

    it("includes British Airways + United on LHR-JFK and JFK-LHR", () => {
      expect(ROUTE_AIRLINE_SUPPLEMENTS["LHR-JFK"]).toEqual(
        expect.arrayContaining(["British Airways", "United"])
      );
      expect(ROUTE_AIRLINE_SUPPLEMENTS["JFK-LHR"]).toEqual(
        expect.arrayContaining(["British Airways", "United"])
      );
    });

    it("includes British Airways + United on LHR-SFO and SFO-LHR", () => {
      expect(ROUTE_AIRLINE_SUPPLEMENTS["LHR-SFO"]).toEqual(
        expect.arrayContaining(["British Airways", "United"])
      );
      expect(ROUTE_AIRLINE_SUPPLEMENTS["SFO-LHR"]).toEqual(
        expect.arrayContaining(["British Airways", "United"])
      );
    });

    it("includes British Airways + Air France on LHR-CDG and CDG-LHR", () => {
      expect(ROUTE_AIRLINE_SUPPLEMENTS["LHR-CDG"]).toEqual(
        expect.arrayContaining(["British Airways", "Air France"])
      );
      // CDG-LHR may have Air France first
      expect(ROUTE_AIRLINE_SUPPLEMENTS["CDG-LHR"]).toContain("British Airways");
      expect(ROUTE_AIRLINE_SUPPLEMENTS["CDG-LHR"]).toContain("Air France");
    });

    it("includes British Airways + Lufthansa on LHR-FRA and FRA-LHR", () => {
      expect(ROUTE_AIRLINE_SUPPLEMENTS["LHR-FRA"]).toEqual(
        expect.arrayContaining(["British Airways", "Lufthansa"])
      );
      expect(ROUTE_AIRLINE_SUPPLEMENTS["FRA-LHR"]).toEqual(
        expect.arrayContaining(["Lufthansa", "British Airways"])
      );
    });

    it("includes British Airways + KLM on LHR-AMS and AMS-LHR", () => {
      expect(ROUTE_AIRLINE_SUPPLEMENTS["LHR-AMS"]).toEqual(
        expect.arrayContaining(["British Airways", "KLM"])
      );
      expect(ROUTE_AIRLINE_SUPPLEMENTS["AMS-LHR"]).toEqual(
        expect.arrayContaining(["KLM", "British Airways"])
      );
    });

    it("includes British Airways + Singapore Airlines on LHR-SIN and SIN-LHR", () => {
      expect(ROUTE_AIRLINE_SUPPLEMENTS["LHR-SIN"]).toEqual(
        expect.arrayContaining(["British Airways", "Singapore Airlines"])
      );
      expect(ROUTE_AIRLINE_SUPPLEMENTS["SIN-LHR"]).toEqual(
        expect.arrayContaining(["Singapore Airlines", "British Airways"])
      );
    });

    it("includes Emirates on LHR-DXB and DXB-LHR", () => {
      expect(ROUTE_AIRLINE_SUPPLEMENTS["LHR-DXB"]).toEqual(
        expect.arrayContaining(["Emirates"])
      );
      expect(ROUTE_AIRLINE_SUPPLEMENTS["DXB-LHR"]).toEqual(
        expect.arrayContaining(["Emirates"])
      );
    });

    it("includes British Airways + ANA on LHR-NRT and ANA + British Airways on NRT-LHR", () => {
      expect(ROUTE_AIRLINE_SUPPLEMENTS["LHR-NRT"]).toEqual(
        expect.arrayContaining(["British Airways", "All Nippon Airways"])
      );
      expect(ROUTE_AIRLINE_SUPPLEMENTS["NRT-LHR"]).toEqual(
        expect.arrayContaining(["All Nippon Airways", "British Airways"])
      );
    });
  });

  describe("Count verification", () => {
    it("has all 28 directional Europe hub routes", () => {
      const routes = [
        // FRA hub (6 routes = 12 directional)
        "FRA-LAX", "LAX-FRA", "FRA-JFK", "JFK-FRA", "FRA-CDG", "CDG-FRA",
        // AMS hub (4 routes = 8 directional)
        "AMS-LAX", "LAX-AMS", "AMS-CDG", "CDG-AMS",
        // LHR hub (9 routes = 18 directional) — includes SIN/DXB/NRT spokes
        "LHR-LAX", "LAX-LHR", "LHR-JFK", "JFK-LHR", "LHR-SFO", "SFO-LHR",
        "LHR-CDG", "CDG-LHR", "LHR-FRA", "FRA-LHR", "LHR-AMS", "AMS-LHR",
        "LHR-SIN", "SIN-LHR", "LHR-DXB", "DXB-LHR", "LHR-NRT", "NRT-LHR",
      ];

      for (const route of routes) {
        expect(ROUTE_AIRLINE_SUPPLEMENTS[route]).toBeDefined();
      }
    });

    it("has all directional Europe hub routes in HOME_CARRIER_PROGRAMS", () => {
      const routes = [
        // FRA hub
        "FRA-LAX", "LAX-FRA", "FRA-JFK", "JFK-FRA", "FRA-CDG", "CDG-FRA",
        // AMS hub
        "AMS-LAX", "LAX-AMS", "AMS-CDG", "CDG-AMS",
        // LHR hub (excluding DXB/NRT routes that are already covered by their primary hubs)
        "LHR-LAX", "LAX-LHR", "LHR-JFK", "JFK-LHR", "LHR-SFO", "SFO-LHR",
        "LHR-CDG", "CDG-LHR", "LHR-FRA", "FRA-LHR", "LHR-AMS", "AMS-LHR",
      ];

      for (const route of routes) {
        expect(HOME_CARRIER_PROGRAMS[route]).toBeDefined();
      }
    });
  });
});
