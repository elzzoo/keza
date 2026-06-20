// __tests__/lib/asiahubs.test.ts
// Regression tests for Asia Hubs (P5 Scaling Task 1.2)
// Verifies that Hong Kong (HKG), Bangkok (BKK), and Kuala Lumpur (KUL) hubs
// are properly configured with home carrier guarantees and route supplements.
// Total: 9 route pairs (22 directional routes) with Cathay Pacific Asia Miles,
// Thai Royal Orchid Plus, and Malaysia Airlines Enrich.

import { HOME_CARRIER_PROGRAMS, ROUTE_AIRLINE_SUPPLEMENTS } from "@/lib/engine/supplements";

describe("Asia Hub Corridors (Task 1.2)", () => {
  describe("HOME_CARRIER_PROGRAMS — HKG hub (Cathay Pacific Asia Miles)", () => {
    it("includes Cathay Pacific Asia Miles on HKG-LAX and LAX-HKG", () => {
      for (const route of ["HKG-LAX", "LAX-HKG"]) {
        const guarantee = HOME_CARRIER_PROGRAMS[route];
        expect(guarantee).toBeDefined();
        expect(guarantee).toContainEqual(
          expect.objectContaining({
            airline: "Cathay Pacific",
            programs: expect.arrayContaining(["Cathay Pacific Asia Miles"]),
          })
        );
      }
    });

    it("includes Cathay Pacific Asia Miles on HKG-JFK and JFK-HKG", () => {
      for (const route of ["HKG-JFK", "JFK-HKG"]) {
        const guarantee = HOME_CARRIER_PROGRAMS[route];
        expect(guarantee).toBeDefined();
        expect(guarantee).toContainEqual(
          expect.objectContaining({
            airline: "Cathay Pacific",
            programs: expect.arrayContaining(["Cathay Pacific Asia Miles"]),
          })
        );
      }
    });

    it("includes Cathay Pacific Asia Miles on HKG-SFO and SFO-HKG", () => {
      for (const route of ["HKG-SFO", "SFO-HKG"]) {
        const guarantee = HOME_CARRIER_PROGRAMS[route];
        expect(guarantee).toBeDefined();
        expect(guarantee).toContainEqual(
          expect.objectContaining({
            airline: "Cathay Pacific",
            programs: expect.arrayContaining(["Cathay Pacific Asia Miles"]),
          })
        );
      }
    });

    it("includes Cathay Pacific Asia Miles on HKG-LHR and LHR-HKG (pre-existing)", () => {
      for (const route of ["HKG-LHR", "LHR-HKG"]) {
        const guarantee = HOME_CARRIER_PROGRAMS[route];
        expect(guarantee).toBeDefined();
        expect(guarantee).toContainEqual(
          expect.objectContaining({
            airline: "Cathay Pacific",
            programs: expect.arrayContaining(["Cathay Pacific Asia Miles"]),
          })
        );
      }
    });

    it("includes Cathay Pacific on HKG-SYD; Qantas on SYD-HKG (reverse)", () => {
      const hkgSyd = HOME_CARRIER_PROGRAMS["HKG-SYD"];
      const sydHkg = HOME_CARRIER_PROGRAMS["SYD-HKG"];

      expect(hkgSyd).toContainEqual(
        expect.objectContaining({
          airline: "Cathay Pacific",
          programs: expect.arrayContaining(["Cathay Pacific Asia Miles"]),
        })
      );

      expect(sydHkg).toContainEqual(
        expect.objectContaining({
          airline: "Qantas",
          programs: expect.arrayContaining(["Qantas Frequent Flyer"]),
        })
      );
    });
  });

  describe("HOME_CARRIER_PROGRAMS — BKK hub (Thai Royal Orchid Plus)", () => {
    it("includes Thai Airways on BKK-LAX and LAX-BKK", () => {
      for (const route of ["BKK-LAX", "LAX-BKK"]) {
        const guarantee = HOME_CARRIER_PROGRAMS[route];
        expect(guarantee).toBeDefined();
        expect(guarantee).toContainEqual(
          expect.objectContaining({
            airline: "Thai Airways",
            programs: expect.arrayContaining(["Thai Royal Orchid Plus"]),
          })
        );
      }
    });

    it("includes Thai Airways on BKK-CDG; Air France on CDG-BKK (reverse)", () => {
      const bkkCdg = HOME_CARRIER_PROGRAMS["BKK-CDG"];
      const cdgBkk = HOME_CARRIER_PROGRAMS["CDG-BKK"];

      expect(bkkCdg).toContainEqual(
        expect.objectContaining({
          airline: "Thai Airways",
          programs: expect.arrayContaining(["Thai Royal Orchid Plus"]),
        })
      );

      expect(cdgBkk).toContainEqual(
        expect.objectContaining({
          airline: "Air France",
          programs: expect.arrayContaining(["Flying Blue"]),
        })
      );
    });

    it("includes Thai Airways on BKK-NRT; Japan Airlines on NRT-BKK (reverse)", () => {
      const bkkNrt = HOME_CARRIER_PROGRAMS["BKK-NRT"];
      const nrtBkk = HOME_CARRIER_PROGRAMS["NRT-BKK"];

      expect(bkkNrt).toContainEqual(
        expect.objectContaining({
          airline: "Thai Airways",
          programs: expect.arrayContaining(["Thai Royal Orchid Plus"]),
        })
      );

      expect(nrtBkk).toContainEqual(
        expect.objectContaining({
          airline: "Japan Airlines",
          programs: expect.arrayContaining(["Japan Airlines Mileage Bank"]),
        })
      );
    });
  });

  describe("HOME_CARRIER_PROGRAMS — KUL hub (Malaysia Airlines Enrich, pre-existing)", () => {
    it("includes Malaysia Airlines on KUL-LAX and LAX-KUL", () => {
      for (const route of ["KUL-LAX", "LAX-KUL"]) {
        const guarantee = HOME_CARRIER_PROGRAMS[route];
        expect(guarantee).toBeDefined();
        expect(guarantee).toContainEqual(
          expect.objectContaining({
            airline: "Malaysia Airlines",
            programs: expect.arrayContaining(["Malaysia Airlines Enrich"]),
          })
        );
      }
    });

    it("includes Malaysia Airlines on KUL-LHR and LHR-KUL", () => {
      for (const route of ["KUL-LHR", "LHR-KUL"]) {
        const guarantee = HOME_CARRIER_PROGRAMS[route];
        expect(guarantee).toBeDefined();
        expect(guarantee).toContainEqual(
          expect.objectContaining({
            airline: "Malaysia Airlines",
            programs: expect.arrayContaining(["Malaysia Airlines Enrich"]),
          })
        );
      }
    });
  });

  describe("ROUTE_AIRLINE_SUPPLEMENTS — Asia hubs", () => {
    it("includes Cathay Pacific on HKG routes (extended with SFO)", () => {
      const routes = ["HKG-LAX", "LAX-HKG", "HKG-JFK", "JFK-HKG", "HKG-SFO", "SFO-HKG", "HKG-SYD"];
      for (const route of routes) {
        expect(ROUTE_AIRLINE_SUPPLEMENTS[route]).toContain("Cathay Pacific");
      }
    });

    it("includes Qantas on SYD-HKG", () => {
      expect(ROUTE_AIRLINE_SUPPLEMENTS["SYD-HKG"]).toContain("Qantas");
    });

    it("includes Thai Airways on BKK-LAX and LAX-BKK", () => {
      expect(ROUTE_AIRLINE_SUPPLEMENTS["BKK-LAX"]).toContain("Thai Airways");
      expect(ROUTE_AIRLINE_SUPPLEMENTS["LAX-BKK"]).toContain("Thai Airways");
    });

    it("includes Thai Airways on BKK-CDG and CDG-BKK", () => {
      expect(ROUTE_AIRLINE_SUPPLEMENTS["BKK-CDG"]).toContain("Thai Airways");
      expect(ROUTE_AIRLINE_SUPPLEMENTS["CDG-BKK"]).toContain("Thai Airways");
    });

    it("includes Thai Airways on BKK-NRT and NRT-BKK", () => {
      expect(ROUTE_AIRLINE_SUPPLEMENTS["BKK-NRT"]).toContain("Thai Airways");
      expect(ROUTE_AIRLINE_SUPPLEMENTS["NRT-BKK"]).toContain("Thai Airways");
    });

    it("includes Malaysia Airlines on KUL routes", () => {
      const routes = ["KUL-LAX", "LAX-KUL", "KUL-LHR", "LHR-KUL"];
      for (const route of routes) {
        expect(ROUTE_AIRLINE_SUPPLEMENTS[route]).toContain("Malaysia Airlines");
      }
    });
  });

  describe("Count verification", () => {
    it("returns all 22 Asia hub directional routes in ROUTE_AIRLINE_SUPPLEMENTS", () => {
      const routes = [
        // HKG (6 pairs = 12 directional: LAX, JFK, SFO, LHR, CDG, SYD)
        "HKG-LAX", "LAX-HKG", "HKG-JFK", "JFK-HKG", "HKG-SFO", "SFO-HKG",
        "HKG-LHR", "LHR-HKG", "HKG-CDG", "CDG-HKG", "HKG-SYD", "SYD-HKG",
        // BKK (3 pairs = 6 directional: LAX, CDG, NRT)
        "BKK-LAX", "LAX-BKK", "BKK-CDG", "CDG-BKK", "BKK-NRT", "NRT-BKK",
        // KUL (2 pairs = 4 directional: LAX, LHR)
        "KUL-LAX", "LAX-KUL", "KUL-LHR", "LHR-KUL",
      ];

      for (const route of routes) {
        expect(ROUTE_AIRLINE_SUPPLEMENTS[route]).toBeDefined();
      }
    });

    it("returns all 9 route pairs in HOME_CARRIER_PROGRAMS", () => {
      const routes = [
        // HKG (6)
        "HKG-LAX", "LAX-HKG", "HKG-JFK", "JFK-HKG", "HKG-SFO", "SFO-HKG",
        "HKG-LHR", "LHR-HKG", "HKG-CDG", "CDG-HKG", "HKG-SYD", "SYD-HKG",
        // BKK (3)
        "BKK-LAX", "LAX-BKK", "BKK-CDG", "CDG-BKK", "BKK-NRT", "NRT-BKK",
        // KUL (2)
        "KUL-LAX", "LAX-KUL", "KUL-LHR", "LHR-KUL",
      ];

      for (const route of routes) {
        expect(HOME_CARRIER_PROGRAMS[route]).toBeDefined();
      }
    });
  });
});
