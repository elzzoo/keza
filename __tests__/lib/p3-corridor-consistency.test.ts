// __tests__/lib/p3-corridor-consistency.test.ts
//
// Regression guard for a real bug found during due-diligence audit: several
// corridors (CDG-JNB, ICN-LAX, NRT-SYD, CDG-BKK) were fully wired into
// HOME_CARRIER_PROGRAMS / ROUTE_AIRLINE_SUPPLEMENTS but their airports (LAX,
// ORD, ICN, JNB) didn't exist in data/destinations.ts — so the corridors could
// never surface on /carte, and the map's DESTINATIONS.length quietly
// undercounted real coverage. This test keeps the 6 P3 corridors specifically
// honest across all three data sources, deterministically (no live API).
//
// NOTE: the same class of gap exists much more broadly — 15+ other airports
// (SFO, HND, FRA, AUH, HKG, KUL, ADD, AMS, KGL, BRU, EZE, BOG, MEX, SJO, DSS,
// ACC, CPT, and more) are referenced in supplements.ts but absent from
// destinations.ts too. That's a separate, larger backlog item (needs real
// lat/lon + price estimates researched per airport, not guessed here) —
// intentionally out of scope for this test so it doesn't block on unrelated
// pre-existing gaps.

import { DESTINATIONS } from "@/data/destinations";
import { HOME_CARRIER_PROGRAMS, ROUTE_AIRLINE_SUPPLEMENTS } from "@/lib/engine/supplements";
import { POPULAR_ROUTES } from "@/data/popularRoutes";

const KNOWN_IATA = new Set(DESTINATIONS.map((d) => d.iata));

describe("P3: corridor data consistency", () => {
  const corridors: [string, string][] = [
    ["CDG", "BKK"],
    ["CDG", "JNB"],
    ["ICN", "LAX"],
    ["ICN", "ORD"],
    ["NRT", "SYD"],
    ["BKK", "LHR"],
  ];

  it("all 4 newly-added airports (LAX, ORD, ICN, JNB) exist in DESTINATIONS", () => {
    expect(KNOWN_IATA.has("LAX")).toBe(true);
    expect(KNOWN_IATA.has("ORD")).toBe(true);
    expect(KNOWN_IATA.has("ICN")).toBe(true);
    expect(KNOWN_IATA.has("JNB")).toBe(true);
  });

  it("includes the 6 P3 corridors in both directions across all three data sources", () => {
    for (const [a, b] of corridors) {
      expect(KNOWN_IATA.has(a)).toBe(true);
      expect(KNOWN_IATA.has(b)).toBe(true);
      expect(HOME_CARRIER_PROGRAMS[`${a}-${b}`] ?? HOME_CARRIER_PROGRAMS[`${b}-${a}`]).toBeDefined();
      expect(ROUTE_AIRLINE_SUPPLEMENTS[`${a}-${b}`] ?? ROUTE_AIRLINE_SUPPLEMENTS[`${b}-${a}`]).toBeDefined();
      expect(
        POPULAR_ROUTES.includes(`${a}-${b}`) || POPULAR_ROUTES.includes(`${b}-${a}`)
      ).toBe(true);
    }
  });
});
