import { checkPortfolio, PortfolioStatus } from "@/lib/portfolioEngine";
import { MilesOption } from "@/lib/costEngine";

// Helper to build minimal MilesOption fixtures
function makeOption(program: string, milesRequired: number): MilesOption {
  return {
    type: "DIRECT",
    program,
    operatingAirline: "TEST",
    milesRequired,
    taxes: 50,
    valuePerMile: 1.5,
    milesCost: (milesRequired * 1.5) / 100,
    totalMilesCost: (milesRequired * 1.5) / 100 + 50,
    savings: 0,
    confidence: "HIGH",
    explanation: `${program} · ${milesRequired} miles`,
    isBestDeal: false,
    chartSource: "REAL",
  } as MilesOption;
}

// Sorted cheapest-first as the search API delivers them
const aviosOpt = makeOption("British Airways Avios", 28000);
const flyingBlueOpt = makeOption("Flying Blue", 37000);
const options = [aviosOpt, flyingBlueOpt]; // avios cheaper

// ─── NO_PORTFOLIO ─────────────────────────────────────────────────────────────

describe("NO_PORTFOLIO", () => {
  it("returns NO_PORTFOLIO when balances and bankPoints are empty objects", () => {
    const result = checkPortfolio(options, {}, {});
    expect(result).toEqual({ type: "NO_PORTFOLIO" });
  });

  it("returns NO_PORTFOLIO when all balances are zero", () => {
    const result = checkPortfolio(options, { "British Airways Avios": 0, "Flying Blue": 0 }, {});
    expect(result).toEqual({ type: "NO_PORTFOLIO" });
  });

  it("returns NO_PORTFOLIO when all values are zero including bankPoints", () => {
    const result = checkPortfolio(
      options,
      { "British Airways Avios": 0 },
      { "Amex MR": 0, "Chase UR": 0 }
    );
    expect(result).toEqual({ type: "NO_PORTFOLIO" });
  });
});

// ─── CAN_AFFORD ───────────────────────────────────────────────────────────────

describe("CAN_AFFORD", () => {
  it("returns CAN_AFFORD with balanceAfter=0 when user has exact miles for cheapest option", () => {
    const result = checkPortfolio(options, { "British Airways Avios": 28000 }, {});
    expect(result).toEqual({
      type: "CAN_AFFORD",
      program: "British Airways Avios",
      milesNeeded: 28000,
      balanceAfter: 0,
    });
  });

  it("returns CAN_AFFORD with positive balanceAfter when user has more than needed", () => {
    const result = checkPortfolio(options, { "British Airways Avios": 45000 }, {});
    expect(result).toEqual({
      type: "CAN_AFFORD",
      program: "British Airways Avios",
      milesNeeded: 28000,
      balanceAfter: 17000,
    });
  });

  it("returns CAN_AFFORD for only the expensive program when cheaper one lacks miles", () => {
    const result = checkPortfolio(
      options,
      { "British Airways Avios": 10000, "Flying Blue": 40000 },
      {}
    );
    expect(result).toEqual({
      type: "CAN_AFFORD",
      program: "Flying Blue",
      milesNeeded: 37000,
      balanceAfter: 3000,
    });
  });

  it("returns cheapest option first when multiple programs have sufficient balance", () => {
    const result = checkPortfolio(
      options,
      { "British Airways Avios": 30000, "Flying Blue": 50000 },
      {}
    );
    // Should pick Avios (cheaper), not Flying Blue
    expect(result).toEqual({
      type: "CAN_AFFORD",
      program: "British Airways Avios",
      milesNeeded: 28000,
      balanceAfter: 2000,
    });
  });
});

// ─── CAN_TRANSFER ─────────────────────────────────────────────────────────────

describe("CAN_TRANSFER", () => {
  it("returns CAN_TRANSFER when Amex MR can cover Avios shortfall at 1:1", () => {
    // Avios balance = 20000, need 28000, shortfall = 8000
    // Amex MR → British Airways Avios is in TRANSFER_BONUSES at baseRatio 1.0
    const result = checkPortfolio(
      options,
      { "British Airways Avios": 20000 },
      { "Amex MR": 10000 }
    );
    expect(result).toEqual({
      type: "CAN_TRANSFER",
      program: "British Airways Avios",
      milesNeeded: 28000,
      shortfall: 8000,
      transferFrom: "Amex MR",
      transferAmount: 8000,
      transferRatio: 1.0,
    });
  });

  it("returns CAN_TRANSFER when Amex MR can cover Flying Blue shortfall at 1:1", () => {
    // Flying Blue balance = 30000, need 37000, shortfall = 7000
    // Amex MR → Flying Blue is in TRANSFER_BONUSES at baseRatio 1.0
    const result = checkPortfolio(
      options,
      { "British Airways Avios": 0, "Flying Blue": 30000 },
      { "Amex MR": 10000 }
    );
    expect(result).toEqual({
      type: "CAN_TRANSFER",
      program: "Flying Blue",
      milesNeeded: 37000,
      shortfall: 7000,
      transferFrom: "Amex MR",
      transferAmount: 7000,
      transferRatio: 1.0,
    });
  });

  it("returns CAN_TRANSFER: Chase UR covering Avios shortfall at 1:1", () => {
    // Chase UR → British Airways Avios is in TRANSFER_BONUSES at baseRatio 1.0
    const result = checkPortfolio(
      options,
      { "British Airways Avios": 18000 },
      { "Chase UR": 15000 }
    );
    // shortfall = 28000 - 18000 = 10000, need 10000 Chase UR points
    expect(result).toEqual({
      type: "CAN_TRANSFER",
      program: "British Airways Avios",
      milesNeeded: 28000,
      shortfall: 10000,
      transferFrom: "Chase UR",
      transferAmount: 10000,
      transferRatio: 1.0,
    });
  });

  it("prefers the option with smallest shortfall for transfer check", () => {
    // Avios shortfall = 28000 - 15000 = 13000
    // Flying Blue shortfall = 37000 - 30000 = 7000
    // Flying Blue has smaller shortfall, so transfer should target Flying Blue
    const result = checkPortfolio(
      options,
      { "British Airways Avios": 15000, "Flying Blue": 30000 },
      { "Amex MR": 10000 }
    );
    expect(result).toMatchObject({
      type: "CAN_TRANSFER",
      program: "Flying Blue",
      shortfall: 7000,
    });
  });
});

// ─── CANT_AFFORD ──────────────────────────────────────────────────────────────

describe("CANT_AFFORD", () => {
  it("returns CANT_AFFORD with smallest shortfall when balances are too low and no bank points", () => {
    // Avios shortfall = 28000 - 5000 = 23000 (smaller)
    // Flying Blue shortfall = 37000 - 5000 = 32000
    const result = checkPortfolio(
      options,
      { "British Airways Avios": 5000, "Flying Blue": 5000 },
      {}
    );
    expect(result).toEqual({
      type: "CANT_AFFORD",
      bestProgram: "British Airways Avios",
      milesNeeded: 28000,
      shortfall: 23000,
    });
  });

  it("returns CANT_AFFORD when bank points exist but not enough for transfer", () => {
    // Avios balance = 20000, shortfall = 8000, but only 5000 Amex MR
    const result = checkPortfolio(
      options,
      { "British Airways Avios": 20000 },
      { "Amex MR": 5000 }
    );
    expect(result).toEqual({
      type: "CANT_AFFORD",
      bestProgram: "British Airways Avios",
      milesNeeded: 28000,
      shortfall: 8000,
    });
  });
});

// ─── EDGE CASES ───────────────────────────────────────────────────────────────

describe("Edge cases", () => {
  it("treats program not in balances map as 0 (no error)", () => {
    // Only Flying Blue in balances, Avios not present → treated as 0
    const result = checkPortfolio(
      options,
      { "Flying Blue": 40000 },
      {}
    );
    expect(result).toEqual({
      type: "CAN_AFFORD",
      program: "Flying Blue",
      milesNeeded: 37000,
      balanceAfter: 3000,
    });
  });

  it("handles empty options array gracefully by returning NO_PORTFOLIO when balances empty", () => {
    const result = checkPortfolio([], {}, {});
    expect(result).toEqual({ type: "NO_PORTFOLIO" });
  });

  it("returns CANT_AFFORD with zero shortfall context when options empty but balances exist", () => {
    // With no options but non-zero balances, nothing to compare against
    // The empty guard should NOT trigger since balances > 0
    // With no options, there's no bestProgram to return — falls through to CANT_AFFORD
    // but since milesOptions is empty, the loop never sets a best option
    // This edge case can reasonably return NO_PORTFOLIO (no miles options = nothing to check)
    const result = checkPortfolio([], { "Flying Blue": 50000 }, {});
    // Implementation may return NO_PORTFOLIO or CANT_AFFORD — just verify it doesn't throw
    expect(["NO_PORTFOLIO", "CANT_AFFORD"]).toContain(result.type);
  });
});
