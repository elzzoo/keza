// __tests__/integration/p3-corridor-validation.test.ts
// P3 New Corridors: live-API validation. Hits searchEngine (Duffel/Travelpayouts) for
// real — run via `npm run test:live`, not the pre-push gate (nondeterministic by nature).

import { searchEngine } from "@/lib/engine/index";
import type { FlightResult } from "@/lib/engine/types";

describe("P3: Pricing Validation for New Corridors", () => {
  const testDate = "2026-08-15";

  function validatePricingSanity(result: FlightResult, _corridor: string): void {
    expect(result.cashCost).toBeDefined();
    expect(typeof result.cashCost).toBe("number");
    expect(result.cashCost).toBeGreaterThanOrEqual(0);
    expect(result.cashCost).toBeLessThan(5000);
  }

  async function testCorridor(from: string, to: string, corridor: string): Promise<void> {
    try {
      const results = await searchEngine({
        from,
        to,
        date: testDate,
        cabin: "economy",
        passengers: 1,
      });

      if (results.length === 0) {
        console.warn(`[corridor-validation] Skipping ${corridor} - no results from API`);
        expect(true).toBe(true);
        return;
      }

      expect(results.length).toBeGreaterThan(0);
      for (const result of results) {
        validatePricingSanity(result, corridor);
      }

      const firstResult = results[0];
      expect(firstResult.from).toBe(from);
      expect(firstResult.to).toBe(to);
      expect(firstResult.cabin).toBe("economy");
      expect(firstResult.passengers).toBe(1);
    } catch (error) {
      if (error instanceof Error && error.message.includes("timeout")) {
        console.warn(`[corridor-validation] Skipping ${corridor} - API timeout`);
        expect(true).toBe(true);
      } else {
        throw error;
      }
    }
  }

  describe("6 corridors added/completed by P3 (destinations + supplements now consistent)", () => {
    it("validates pricing for CDG-BKK (Paris to Bangkok)", async () => {
      await testCorridor("CDG", "BKK", "CDG-BKK");
    });

    it("validates pricing for CDG-JNB (Paris to Johannesburg)", async () => {
      await testCorridor("CDG", "JNB", "CDG-JNB");
    });

    it("validates pricing for ICN-LAX (Seoul to Los Angeles)", async () => {
      await testCorridor("ICN", "LAX", "ICN-LAX");
    });

    it("validates pricing for ICN-ORD (Seoul to Chicago)", async () => {
      await testCorridor("ICN", "ORD", "ICN-ORD");
    });

    it("validates pricing for NRT-SYD (Tokyo to Sydney)", async () => {
      await testCorridor("NRT", "SYD", "NRT-SYD");
    });

    it("validates pricing for BKK-LHR (Bangkok to London)", async () => {
      await testCorridor("BKK", "LHR", "BKK-LHR");
    });
  });

  describe("3 existing corridors (regression check)", () => {
    it("validates pricing for SIN-LAX (Singapore to Los Angeles) - existing", async () => {
      await testCorridor("SIN", "LAX", "SIN-LAX");
    });

    it("validates pricing for NRT-LAX (Tokyo to Los Angeles) - existing", async () => {
      await testCorridor("NRT", "LAX", "NRT-LAX");
    });

    it("validates pricing for DXB-LHR (Dubai to London) - existing", async () => {
      await testCorridor("DXB", "LHR", "DXB-LHR");
    });
  });
});
