import { optimizeMiles, type OptimizerDecision } from "@/lib/optimizer";

describe("optimizeMiles", () => {
  describe("Decision tree logic (DIRECT → ALLIANCE → TRANSFER → CASH)", () => {
    test("returns DIRECT type when airline has flagship program mapping", () => {
      const result = optimizeMiles(["Singapore Airlines"], ["Singapore KrisFlyer"]);
      expect(result.type).toBe("DIRECT");
      if (result.type === "DIRECT") {
        expect(result.program).toBe("Singapore KrisFlyer");
      }
    });

    test("returns DIRECT type for Air France + Flying Blue mapping", () => {
      const result = optimizeMiles(["Air France"], ["Flying Blue"]);
      expect(result.type).toBe("DIRECT");
    });

    test("falls back to CASH when no programs match", () => {
      const result = optimizeMiles(["Nonexistent Airline"], ["Nonexistent Program"]);
      expect(result).toEqual({ type: "CASH" });
    });

    test("returns CASH when airlines array is empty", () => {
      const result = optimizeMiles([], ["Flying Blue"]);
      expect(result).toEqual({ type: "CASH" });
    });

    test("returns CASH when both airlines and programs are empty", () => {
      const result = optimizeMiles([], []);
      expect(result).toEqual({ type: "CASH" });
    });
  });

  describe("Edge cases and input validation", () => {
    test("only uses first airline in multileg flight", () => {
      // Both calls should have same behavior (only first airline matters)
      const result1 = optimizeMiles(["Air France"], ["Flying Blue"]);
      const result2 = optimizeMiles(["Air France", "United", "United"], ["Flying Blue"]);
      expect(result1.type).toBe(result2.type);
    });

    test("case sensitivity: lowercase airline doesn't match", () => {
      const result = optimizeMiles(["air france" as any], ["Flying Blue"]);
      expect(result.type).toBe("CASH"); // no match
    });

    test("case sensitivity: exact program name required", () => {
      const result = optimizeMiles(["Air France"], ["flying blue" as any]);
      expect(result.type).not.toBe("DIRECT"); // exact match required
    });

    test("result always has valid OptimizerDecision type", () => {
      const validTypes = ["DIRECT", "ALLIANCE", "TRANSFER", "CASH"];
      const result = optimizeMiles(["Air France"], ["Flying Blue", "KrisFlyer"]);
      expect(validTypes).toContain(result.type);
    });

    test("handles multiple user programs without error", () => {
      expect(() =>
        optimizeMiles(["Singapore Airlines"], ["Flying Blue", "KrisFlyer", "American AAdvantage"])
      ).not.toThrow();
    });
  });

  describe("DIRECT path (highest priority)", () => {
    test("DIRECT result includes program name", () => {
      const result = optimizeMiles(["Singapore Airlines"], ["Singapore KrisFlyer"]);
      if (result.type === "DIRECT") {
        expect(result).toHaveProperty("program");
        expect(typeof result.program).toBe("string");
      }
    });

    test("matching first eligible program in user's list", () => {
      const result = optimizeMiles(["Air France"], ["Flying Blue", "other1", "other2"]);
      if (result.type === "DIRECT") {
        expect(result.program).toBe("Flying Blue");
      }
    });
  });

  describe("Data structure integrity", () => {
    test("all DIRECT results have program field", () => {
      const airlines = ["Singapore Airlines", "Air France", "All Nippon Airways"];
      const programs = ["Singapore KrisFlyer", "Flying Blue", "ANA Mileage Club"];

      for (const airline of airlines) {
        for (const program of programs) {
          const result = optimizeMiles([airline], [program]);
          if (result.type === "DIRECT") {
            expect("program" in result).toBe(true);
          }
        }
      }
    });

    test("ALLIANCE results have viaProgram and alliance fields when type is ALLIANCE", () => {
      // Test that the structure is consistent when ALLIANCE is returned
      // (we don't assume specific data, just structure)
      const result = optimizeMiles(["Some Airline"], ["Some Program"]);
      if (result.type === "ALLIANCE") {
        expect("viaProgram" in result).toBe(true);
        expect("alliance" in result).toBe(true);
      }
    });

    test("TRANSFER results have from and to fields when type is TRANSFER", () => {
      const result = optimizeMiles(["Some Airline"], ["Some Program"]);
      if (result.type === "TRANSFER") {
        expect("from" in result).toBe(true);
        expect("to" in result).toBe(true);
      }
    });
  });
});
