// __tests__/data/transferBonuses.test.ts
// Tests for getEffectiveRatio() from data/transferBonuses.ts.
// The key invariant: promoRatio without promoValidUntil is treated as indefinitely
// valid (the fix from audit-5 that prevents ignoring the promo entirely).

import { getEffectiveRatio, type TransferBonusRecord } from "@/data/transferBonuses";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns an ISO date string N days from today (positive = future, negative = past) */
function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------
// No promoRatio → always returns baseRatio
// ---------------------------------------------------------------------------

describe("getEffectiveRatio — no promo", () => {
  it("returns baseRatio when promoRatio is absent (1:1 standard)", () => {
    const record: TransferBonusRecord = {
      from: "Amex MR",
      to:   "Flying Blue",
      baseRatio: 1.0,
      transferTime: "instant",
    };
    expect(getEffectiveRatio(record)).toBe(1.0);
  });

  it("returns baseRatio when promoRatio is absent (non-1:1 base)", () => {
    const record: TransferBonusRecord = {
      from: "Chase UR",
      to:   "United MileagePlus",
      baseRatio: 0.8,
      transferTime: "instant",
    };
    expect(getEffectiveRatio(record)).toBe(0.8);
  });
});

// ---------------------------------------------------------------------------
// promoRatio present, no promoValidUntil → treated as indefinitely valid
// (this is the audit-5 fix: an expiry-less promo must NOT be ignored)
// ---------------------------------------------------------------------------

describe("getEffectiveRatio — promoRatio without expiry (indefinitely valid)", () => {
  it("returns promoRatio when promoValidUntil is absent", () => {
    const record: TransferBonusRecord = {
      from: "Amex MR",
      to:   "Flying Blue",
      baseRatio:  1.0,
      promoRatio: 1.3,   // 30 % bonus, no expiry
      transferTime: "instant",
    };
    expect(getEffectiveRatio(record)).toBe(1.3);
  });

  it("promoRatio without expiry beats a higher baseRatio (sanity check)", () => {
    // baseRatio could theoretically be higher in an edge case — promo still wins
    const record: TransferBonusRecord = {
      from: "Capital One Miles",
      to:   "Turkish Miles&Smiles",
      baseRatio:  1.0,
      promoRatio: 1.25,
      transferTime: "instant",
    };
    expect(getEffectiveRatio(record)).toBe(1.25);
  });
});

// ---------------------------------------------------------------------------
// promoRatio present, future promoValidUntil → promo is active
// ---------------------------------------------------------------------------

describe("getEffectiveRatio — active promo (future expiry)", () => {
  it("returns promoRatio when promoValidUntil is in the future", () => {
    const record: TransferBonusRecord = {
      from: "Citi ThankYou",
      to:   "Turkish Miles&Smiles",
      baseRatio:  1.0,
      promoRatio: 1.4,
      promoValidUntil: isoOffset(30), // 30 days from today
      transferTime: "1-3 days",
    };
    expect(getEffectiveRatio(record)).toBe(1.4);
  });

  it("returns promoRatio when promoValidUntil is tomorrow (clearly future)", () => {
    const record: TransferBonusRecord = {
      from: "Chase UR",
      to:   "Emirates Skywards",
      baseRatio:  1.0,
      promoRatio: 1.25,
      promoValidUntil: isoOffset(1), // tomorrow — unambiguously future
      transferTime: "instant",
    };
    expect(getEffectiveRatio(record)).toBe(1.25);
  });
});

// ---------------------------------------------------------------------------
// promoRatio present, expired promoValidUntil → falls back to baseRatio
// ---------------------------------------------------------------------------

describe("getEffectiveRatio — expired promo", () => {
  it("returns baseRatio when promoValidUntil is in the past", () => {
    const record: TransferBonusRecord = {
      from: "Amex MR",
      to:   "Air Canada Aeroplan",
      baseRatio:  1.0,
      promoRatio: 1.5,
      promoValidUntil: isoOffset(-1), // yesterday
      transferTime: "instant",
    };
    expect(getEffectiveRatio(record)).toBe(1.0);
  });

  it("returns baseRatio for a long-expired promo", () => {
    const record: TransferBonusRecord = {
      from: "Capital One Miles",
      to:   "British Airways Avios",
      baseRatio:  1.0,
      promoRatio: 1.35,
      promoValidUntil: "2023-01-01", // well in the past
      transferTime: "instant",
    };
    expect(getEffectiveRatio(record)).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("getEffectiveRatio — edge cases", () => {
  it("promoRatio of 1.0 (no real bonus, but has explicit promo flag) — returns 1.0", () => {
    const record: TransferBonusRecord = {
      from: "Amex MR",
      to:   "Ethiopian ShebaMiles",
      baseRatio:  1.0,
      promoRatio: 1.0,   // technically set but no benefit
      transferTime: "1-3 days",
    };
    // Still returns promoRatio because it is set (even if == baseRatio)
    expect(getEffectiveRatio(record)).toBe(1.0);
  });

  it("high promo ratio (2.0 = double miles) with future expiry", () => {
    const record: TransferBonusRecord = {
      from: "Chase UR",
      to:   "Flying Blue",
      baseRatio:  1.0,
      promoRatio: 2.0,
      promoValidUntil: isoOffset(7),
      transferTime: "instant",
    };
    expect(getEffectiveRatio(record)).toBe(2.0);
  });
});
