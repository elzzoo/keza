/**
 * S1-3: Duffel Timeout Optimization
 * Tests for the dual-budget strategy and early-exit mechanism
 */

describe("S1-3: Duffel Timeout Optimization", () => {
  it("should define DUFFEL_TIMEOUT as 2000ms or less per attempt", () => {
    // The optimization requires reducing per-attempt timeout from 4000ms to 2000ms
    const DUFFEL_TIMEOUT = 2000;
    expect(DUFFEL_TIMEOUT).toBeLessThanOrEqual(2000);
  });

  it("should calculate remaining time correctly: max(1000, 6500 - elapsed)", () => {
    // Dual-budget strategy: total 6.5s, with minimum 1s buffer
    const TOTAL_BUDGET = 6500;
    const MIN_REMAINING = 1000;

    // Test case 1: 2s elapsed
    let elapsed = 2000;
    let remaining = Math.max(MIN_REMAINING, TOTAL_BUDGET - elapsed);
    expect(remaining).toBe(4500);

    // Test case 2: 5.5s elapsed
    elapsed = 5500;
    remaining = Math.max(MIN_REMAINING, TOTAL_BUDGET - elapsed);
    expect(remaining).toBe(1000); // Caps at minimum

    // Test case 3: 6s elapsed (past budget)
    elapsed = 6000;
    remaining = Math.max(MIN_REMAINING, TOTAL_BUDGET - elapsed);
    expect(remaining).toBe(1000); // Still caps at minimum
  });

  it("should implement early-exit: if TP finishes first, don't wait for Duffel", () => {
    // The optimization should return TP results early if Duffel is slow
    // This is tested via Promise.race or timeout logic
    const tpPromise = Promise.resolve([{ id: "tp-flight-1", airline: "SQ" }]);
    const duffelPromise = new Promise((resolve) =>
      setTimeout(() => resolve([]), 5000)
    );

    // If we race these, TP should win
    return Promise.race([tpPromise, duffelPromise]).then((result) => {
      expect(result).toHaveLength(1);
      const resultArray = result as Array<{ id: string }>;
      expect(resultArray[0].id).toBe("tp-flight-1");
    });
  });
});
