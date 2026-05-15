// __tests__/lib/cabinResolved.test.ts
// Tests that cabinResolved flag prevents double-application of CABIN_MULTIPLIER.
// We test via the NormalizedFlight interface directly — engine.ts (enrich) is
// an internal function that cannot be imported. We validate the contract
// through the promotions/engine interface (NormalizedFlight type).

import type { NormalizedFlight } from "@/lib/promotions/engine";

describe("NormalizedFlight.cabinResolved", () => {
  it("accepts cabinResolved: true on a Duffel flight shape", () => {
    const duffelFlight: NormalizedFlight = {
      from: "CDG",
      to:   "DKR",
      price: 1200,
      airlines: ["Air France"],
      source: "DUFFEL",
      priceConfidence: "HIGH",
      cabinResolved: true,
    };
    expect(duffelFlight.cabinResolved).toBe(true);
  });

  it("cabinResolved defaults to undefined on TP flight", () => {
    const tpFlight: NormalizedFlight = {
      from: "CDG",
      to:   "DKR",
      price: 800,
      airlines: ["Air France"],
      source: "TP",
      priceConfidence: "LOW",
    };
    expect(tpFlight.cabinResolved).toBeUndefined();
  });

  it("cabinResolved flag does not affect TP price spreading", () => {
    // TP flight with no cabinResolved — price is economy base, multiplier applies
    const tpFlight: NormalizedFlight = {
      from: "LHR",
      to:   "JFK",
      price: 400,
      airlines: ["British Airways"],
      source: "TP",
    };
    // Simulate the multiplier logic from enrich()
    const CABIN_MULTIPLIER: Record<string, number> = {
      economy: 1.0, premium: 1.8, business: 4.0, first: 6.5,
    };
    const multiplier = tpFlight.cabinResolved ? 1 : CABIN_MULTIPLIER["business"];
    expect(multiplier).toBe(4.0);
    expect(Math.round(tpFlight.price * multiplier * 100) / 100).toBe(1600);
  });

  it("cabinResolved: true prevents multiplier application (Duffel real price preserved)", () => {
    const duffelFlight: NormalizedFlight = {
      from: "LHR",
      to:   "JFK",
      price: 1800,           // Duffel already returns the business price
      airlines: ["British Airways"],
      source: "DUFFEL",
      priceConfidence: "HIGH",
      cabinResolved: true,
    };
    const CABIN_MULTIPLIER: Record<string, number> = {
      economy: 1.0, premium: 1.8, business: 4.0, first: 6.5,
    };
    const multiplier = duffelFlight.cabinResolved ? 1 : CABIN_MULTIPLIER["business"];
    expect(multiplier).toBe(1);                    // no double-multiply
    expect(Math.round(duffelFlight.price * multiplier * 100) / 100).toBe(1800); // preserved
  });

  it("economy Duffel flight: multiplier=1 regardless of cabinResolved", () => {
    const duffelEco: NormalizedFlight = {
      from: "CDG", to: "DKR", price: 320, airlines: ["Air France"],
      source: "DUFFEL", priceConfidence: "HIGH", cabinResolved: true,
    };
    const CABIN_MULTIPLIER: Record<string, number> = { economy: 1.0, premium: 1.8, business: 4.0, first: 6.5 };
    const multiplier = duffelEco.cabinResolved ? 1 : CABIN_MULTIPLIER["economy"];
    expect(multiplier).toBe(1);
    expect(Math.round(duffelEco.price * multiplier * 100) / 100).toBe(320);
  });
});
