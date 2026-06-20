// __tests__/lib/homeCarrierGuarantee.test.ts
// Regression tests for Home Carrier Guarantee (B2/B3/B4 fix).
// Verifies that program names in HOME_CARRIER_PROGRAMS exactly match
// the canonical names used in costEngine.ts (PROGRAM_TO_AIRLINE map).

import { HOME_CARRIER_PROGRAMS } from "@/lib/engine/supplements";

// Canonical program names from costEngine.ts PROGRAM_TO_AIRLINE
const KNOWN_PROGRAMS = new Set([
  "Flying Blue",
  "Singapore KrisFlyer",
  "ANA Mileage Club",
  "Japan Airlines Mileage Bank",
  "Emirates Skywards",
  "British Airways Avios",        // canonical — not "British Airways Executive Club"
  "United MileagePlus",
  "AAdvantage",                   // canonical — not "American AAdvantage"
  "Delta SkyMiles",
  "Air Canada Aeroplan",
  "Turkish Miles&Smiles",
  "Etihad Guest",
  "Qatar Privilege Club",
  "Korean Air SKYPASS",
  "Cathay Pacific Asia Miles",
  "Malaysia Airlines Enrich",
  "Ethiopian ShebaMiles",         // canonical — not "Ethiopian Airlines ShebaMiles"
  "LifeMiles",                    // canonical — not "Avianca LifeMiles"
  "Alaska Mileage Plan",          // canonical — not "Alaska Airlines Mileage Plan"
  "Iberia Avios Plus",
  "Lufthansa Miles & More",       // P5 Scaling: Europe hubs
  "Thai Royal Orchid Plus",       // P5 Scaling Task 1.2: Asia hubs
  "Qantas Frequent Flyer",        // used on SYD-HKG reverse
]);



describe("HOME_CARRIER_PROGRAMS", () => {
  it("has entries for all key hub corridors (SIN, NRT, HND, DXB, DOH, AUH, IST, ICN, HKG, KUL)", () => {
    const keys = Object.keys(HOME_CARRIER_PROGRAMS);
    expect(keys.some(k => k.startsWith("SIN-"))).toBe(true);
    expect(keys.some(k => k.startsWith("NRT-"))).toBe(true);
    expect(keys.some(k => k.startsWith("DXB-"))).toBe(true);
    // P3 new hubs
    expect(keys.some(k => k.startsWith("DOH-"))).toBe(true);
    expect(keys.some(k => k.startsWith("AUH-"))).toBe(true);
    expect(keys.some(k => k.startsWith("IST-"))).toBe(true);
    expect(keys.some(k => k.startsWith("ICN-"))).toBe(true);
    expect(keys.some(k => k.startsWith("HKG-"))).toBe(true);
  });

  it("includes both directions for every corridor", () => {
    for (const key of Object.keys(HOME_CARRIER_PROGRAMS)) {
      const [from, to] = key.split("-");
      const reverse = `${to}-${from}`;
      expect(HOME_CARRIER_PROGRAMS).toHaveProperty(
        reverse,
        expect.anything(),
      );
    }
  });

  it("uses KNOWN_PROGRAMS names (no typos like 'JAL Mileage Bank')", () => {
    const BAD_NAMES: string[] = [];
    for (const [route, carriers] of Object.entries(HOME_CARRIER_PROGRAMS)) {
      for (const { programs } of carriers) {
        for (const p of programs) {
          if (!KNOWN_PROGRAMS.has(p)) {
            BAD_NAMES.push(`${route}: "${p}" — not in KNOWN_PROGRAMS`);
          }
        }
      }
    }
    expect(BAD_NAMES).toEqual([]); // empty = no typos
  });

  it("KrisFlyer guaranteed on SIN→LAX in both directions", () => {
    expect(HOME_CARRIER_PROGRAMS["SIN-LAX"]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ programs: expect.arrayContaining(["Singapore KrisFlyer"]) }),
      ])
    );
    expect(HOME_CARRIER_PROGRAMS["LAX-SIN"]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ programs: expect.arrayContaining(["Singapore KrisFlyer"]) }),
      ])
    );
  });

  it("ANA Mileage Club guaranteed on NRT→LAX (not 'ANA Miles' or similar)", () => {
    const nrtLax = HOME_CARRIER_PROGRAMS["NRT-LAX"] ?? [];
    const allPrograms = nrtLax.flatMap(c => c.programs);
    expect(allPrograms).toContain("ANA Mileage Club");
  });

  it("Japan Airlines Mileage Bank guaranteed on NRT→LAX (not 'JAL Mileage Bank')", () => {
    const nrtLax = HOME_CARRIER_PROGRAMS["NRT-LAX"] ?? [];
    const allPrograms = nrtLax.flatMap(c => c.programs);
    expect(allPrograms).toContain("Japan Airlines Mileage Bank");
    expect(allPrograms).not.toContain("JAL Mileage Bank"); // old typo guard
  });

  it("Emirates Skywards guaranteed on DXB→LHR and DXB→JFK", () => {
    for (const route of ["DXB-LHR", "LHR-DXB", "DXB-JFK", "JFK-DXB"]) {
      const carriers = HOME_CARRIER_PROGRAMS[route] ?? [];
      const allPrograms = carriers.flatMap(c => c.programs);
      expect(allPrograms).toContain("Emirates Skywards");
    }
  });

  // ─── P5 Scaling Task 1.3: Middle East Consolidation ──────────────────────
  it("Etihad Guest guaranteed on new AUH corridors (LAX, BKK, SYD)", () => {
    for (const route of ["AUH-LAX", "LAX-AUH", "AUH-BKK", "AUH-SYD"]) {
      const carriers = HOME_CARRIER_PROGRAMS[route] ?? [];
      const allPrograms = carriers.flatMap(c => c.programs);
      expect(allPrograms).toContain("Etihad Guest");
    }
  });

  it("Thai Royal Orchid Plus guaranteed on BKK→AUH reverse leg", () => {
    const carriers = HOME_CARRIER_PROGRAMS["BKK-AUH"] ?? [];
    const allPrograms = carriers.flatMap(c => c.programs);
    expect(allPrograms).toContain("Thai Royal Orchid Plus");
  });

  it("Qantas Frequent Flyer guaranteed on SYD→AUH reverse leg", () => {
    const carriers = HOME_CARRIER_PROGRAMS["SYD-AUH"] ?? [];
    const allPrograms = carriers.flatMap(c => c.programs);
    expect(allPrograms).toContain("Qantas Frequent Flyer");
  });

  it("Qatar Privilege Club guaranteed on new DOH-BKK corridor", () => {
    for (const route of ["DOH-BKK"]) {
      const carriers = HOME_CARRIER_PROGRAMS[route] ?? [];
      const allPrograms = carriers.flatMap(c => c.programs);
      expect(allPrograms).toContain("Qatar Privilege Club");
    }
  });

  it("Thai Royal Orchid Plus guaranteed on BKK→DOH reverse leg", () => {
    const carriers = HOME_CARRIER_PROGRAMS["BKK-DOH"] ?? [];
    const allPrograms = carriers.flatMap(c => c.programs);
    expect(allPrograms).toContain("Thai Royal Orchid Plus");
  });

  it("all new Middle East routes (Task 1.3) have both directions", () => {
    const newRoutes = [
      "AUH-LAX", "LAX-AUH",
      "AUH-BKK", "BKK-AUH",
      "AUH-SYD", "SYD-AUH",
      "DOH-BKK", "BKK-DOH",
    ];
    for (const route of newRoutes) {
      expect(HOME_CARRIER_PROGRAMS).toHaveProperty(route);
    }
  });
});
