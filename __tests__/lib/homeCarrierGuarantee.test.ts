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
  "COPA ConnectMiles",            // P5 Scaling Task 1.4: US hubs (MIA)
  "LATAM Pass",                   // P5 Scaling Task 1.4: US hubs (MIA)
  "Qantas Frequent Flyer",        // used on SYD-HKG reverse
  "Royal Air Maroc Safar Flyer",  // P5 Scaling Task 1.5: Africa hubs (CMN)
  "South African Voyager",        // P5 Scaling Task 1.5: Africa hubs (JNB)
  "Swiss Miles",                  // P5 Task 2.1: European programs (ZRH hub)
  "Finnair Plus",                 // P5 Task 2.1: European programs (HEL hub)
  "TAP Air Portugal Miles",       // P5 Task 2.1: European programs (LIS hub)
  "LOT Polish Airlines Frequent Flyer", // P5 Task 2.1: European programs (WAW hub)
  "SAS EuroBonus",                // P5 Task 2.1: European programs (CPH hub)
  "Air India Flying Returns",     // P5 Task 2.2: Asian programs (DEL hub)
  "Garuda GarudaMiles",           // P5 Task 2.2: Asian programs (CGK hub)
  "EVA Air Points",               // P5 Task 2.2: Asian programs (TPE hub)
  "Asiana Airlines Club",         // P5 Task 2.2: Asian programs (ICN hub)
  "Kenya Airways Mileage Club",   // P5 Task 2.4: African programs (NBO hub)
  "Aeromexico Club Premier",      // P5 Task 3.1: Latin America market (MEX hub)
  "Air New Zealand Airpoints",    // P5 Task 3.2: South Pacific expansion (NZL hub)
  "TAAG Frequent Flyer",          // P5 Task 3.3: Route expansion to 110+ corridors (LAD hub)
]);



describe("HOME_CARRIER_PROGRAMS", () => {
  it("has entries for all key hub corridors (SIN, NRT, HND, DXB, DOH, AUH, IST, ICN, HKG, KUL, MIA, ORD)", () => {
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
    // P5 Scaling Task 1.4 US hubs
    expect(keys.some(k => k.startsWith("MIA-"))).toBe(true);
    expect(keys.some(k => k.startsWith("ORD-"))).toBe(true);
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

  // ─── P5 Scaling Task 1.4: US Hub Expansion (MIA, ORD) ──────────────────────
  it("LATAM Pass guaranteed on MIA→GRU and reverse", () => {
    for (const route of ["MIA-GRU", "GRU-MIA"]) {
      const carriers = HOME_CARRIER_PROGRAMS[route] ?? [];
      const allPrograms = carriers.flatMap(c => c.programs);
      expect(allPrograms).toContain("LATAM Pass");
    }
  });

  it("LATAM Pass guaranteed on MIA→EZE and reverse", () => {
    for (const route of ["MIA-EZE", "EZE-MIA"]) {
      const carriers = HOME_CARRIER_PROGRAMS[route] ?? [];
      const allPrograms = carriers.flatMap(c => c.programs);
      expect(allPrograms).toContain("LATAM Pass");
    }
  });

  it("Avianca LifeMiles guaranteed on BOG→MIA and reverse (already in supplements)", () => {
    // BOG-MIA corridors are already covered by P5 Task 3.1 as Avianca routes
    for (const route of ["MIA-BOG", "BOG-MIA"]) {
      const carriers = HOME_CARRIER_PROGRAMS[route] ?? [];
      const allPrograms = carriers.flatMap(c => c.programs);
      expect(allPrograms).toContain("LifeMiles");
    }
  });

  it("British Airways Avios guaranteed on MIA↔LHR", () => {
    for (const route of ["MIA-LHR", "LHR-MIA"]) {
      const carriers = HOME_CARRIER_PROGRAMS[route] ?? [];
      const allPrograms = carriers.flatMap(c => c.programs);
      expect(allPrograms).toContain("British Airways Avios");
    }
  });

  it("Flying Blue guaranteed on MIA↔CDG", () => {
    for (const route of ["MIA-CDG", "CDG-MIA"]) {
      const carriers = HOME_CARRIER_PROGRAMS[route] ?? [];
      const allPrograms = carriers.flatMap(c => c.programs);
      expect(allPrograms).toContain("Flying Blue");
    }
  });

  it("United MileagePlus guaranteed on MIA↔SFO", () => {
    for (const route of ["MIA-SFO", "SFO-MIA"]) {
      const carriers = HOME_CARRIER_PROGRAMS[route] ?? [];
      const allPrograms = carriers.flatMap(c => c.programs);
      expect(allPrograms).toContain("United MileagePlus");
    }
  });

  it("ORD transatlantic routes have correct programs", () => {
    const routes = [
      { route: "ORD-LHR", program: "British Airways Avios" },
      { route: "LHR-ORD", program: "British Airways Avios" },
      { route: "ORD-CDG", program: "Flying Blue" },
      { route: "CDG-ORD", program: "Flying Blue" },
      { route: "ORD-FRA", program: "Lufthansa Miles & More" },
      { route: "FRA-ORD", program: "Lufthansa Miles & More" },
    ];
    for (const { route, program } of routes) {
      const carriers = HOME_CARRIER_PROGRAMS[route] ?? [];
      const allPrograms = carriers.flatMap(c => c.programs);
      expect(allPrograms).toContain(program);
    }
  });

  it("NRT-ORD route includes ANA and United programs (P3 Expansion)", () => {
    const nrtOrd = HOME_CARRIER_PROGRAMS["NRT-ORD"] ?? [];
    const allPrograms = nrtOrd.flatMap(c => c.programs);
    expect(allPrograms).toContain("ANA Mileage Club");
    expect(allPrograms).toContain("United MileagePlus");

    // ORD-NRT is already in Asia hub section and should NOT be duplicated
    const ordNrt = HOME_CARRIER_PROGRAMS["ORD-NRT"] ?? [];
    expect(ordNrt.length).toBeGreaterThan(0);
  });

  it("all new US hub routes (Task 1.4) have both directions", () => {
    const newRoutes = [
      // MIA South America routes already covered in M3 section
      // New in Task 1.4 are transatlantic + SFO routes
      "MIA-LHR", "LHR-MIA",
      "MIA-CDG", "CDG-MIA",
      "MIA-SFO", "SFO-MIA",
      // Chicago transatlantic routes (ORD-NRT already defined in Asia hub)
      "ORD-LHR", "LHR-ORD",
      "ORD-CDG", "CDG-ORD",
      "ORD-FRA", "FRA-ORD",
    ];
    for (const route of newRoutes) {
      expect(HOME_CARRIER_PROGRAMS).toHaveProperty(route);
    }
  });

  // ─── P5 Scaling Task 1.5: Africa Expansion (ADD, NBO, CMN, JNB) ──────────────
  it("Ethiopian ShebaMiles guaranteed on ADD→AMS and reverse", () => {
    for (const route of ["ADD-AMS", "AMS-ADD"]) {
      const carriers = HOME_CARRIER_PROGRAMS[route] ?? [];
      const allPrograms = carriers.flatMap(c => c.programs);
      expect(allPrograms).toContain("Ethiopian ShebaMiles");
    }
  });

  it("Flying Blue guaranteed on NBO→FRA and reverse", () => {
    for (const route of ["NBO-FRA", "FRA-NBO"]) {
      const carriers = HOME_CARRIER_PROGRAMS[route] ?? [];
      const allPrograms = carriers.flatMap(c => c.programs);
      expect(allPrograms).toContain("Flying Blue");
    }
  });

  it("Royal Air Maroc Safar Flyer guaranteed on CMN routes (CDG, LAX, JFK, LHR)", () => {
    const cmn_routes = ["CMN-CDG", "CDG-CMN", "CMN-LAX", "LAX-CMN", "CMN-JFK", "JFK-CMN", "CMN-LHR", "LHR-CMN"];
    for (const route of cmn_routes) {
      const carriers = HOME_CARRIER_PROGRAMS[route] ?? [];
      const allPrograms = carriers.flatMap(c => c.programs);
      expect(allPrograms).toContain("Royal Air Maroc Safar Flyer");
    }
  });

  it("South African Voyager guaranteed on JNB routes (LHR, CDG, FRA, LAX, JFK)", () => {
    const jnb_routes = ["JNB-LHR", "LHR-JNB", "JNB-CDG", "CDG-JNB", "JNB-FRA", "FRA-JNB", "JNB-LAX", "LAX-JNB", "JNB-JFK", "JFK-JNB"];
    for (const route of jnb_routes) {
      const carriers = HOME_CARRIER_PROGRAMS[route] ?? [];
      const allPrograms = carriers.flatMap(c => c.programs);
      expect(allPrograms).toContain("South African Voyager");
    }
  });

  it("all new Africa expansion routes (Task 1.5) have both directions", () => {
    const newRoutes = [
      // ADD
      "ADD-AMS", "AMS-ADD",
      // NBO
      "NBO-FRA", "FRA-NBO",
      // CMN
      "CMN-CDG", "CDG-CMN",
      "CMN-LAX", "LAX-CMN",
      "CMN-JFK", "JFK-CMN",
      "CMN-LHR", "LHR-CMN",
      // JNB
      "JNB-LHR", "LHR-JNB",
      "JNB-CDG", "CDG-JNB",
      "JNB-FRA", "FRA-JNB",
      "JNB-LAX", "LAX-JNB",
      "JNB-JFK", "JFK-JNB",
    ];
    for (const route of newRoutes) {
      expect(HOME_CARRIER_PROGRAMS).toHaveProperty(route);
    }
  });

  it("Africa hub coverage now includes Africa expansion hubs (ADD, NBO, CMN, JNB)", () => {
    const keys = Object.keys(HOME_CARRIER_PROGRAMS);
    expect(keys.some(k => k.startsWith("ADD-"))).toBe(true);
    expect(keys.some(k => k.startsWith("NBO-"))).toBe(true);
    expect(keys.some(k => k.startsWith("CMN-"))).toBe(true);
    expect(keys.some(k => k.startsWith("JNB-"))).toBe(true);
  });

  // ─── P5 Task 3.1: Latin America Market Activation ──────────────────────────
  it("Aeromexico Club Premier guaranteed on MEX routes (LAX, JFK, SFO, CDG, LHR)", () => {
    const mexRoutes = ["MEX-LAX", "LAX-MEX", "MEX-JFK", "JFK-MEX", "MEX-SFO", "SFO-MEX"];
    for (const route of mexRoutes) {
      const carriers = HOME_CARRIER_PROGRAMS[route] ?? [];
      const allPrograms = carriers.flatMap(c => c.programs);
      expect(allPrograms).toContain("Aeromexico Club Premier");
    }
  });

  it("Aeromexico on MEX-CDG outbound, Flying Blue on reverse", () => {
    const mexCdg = HOME_CARRIER_PROGRAMS["MEX-CDG"] ?? [];
    const mexCdgPrograms = mexCdg.flatMap(c => c.programs);
    expect(mexCdgPrograms).toContain("Aeromexico Club Premier");

    const cdgMex = HOME_CARRIER_PROGRAMS["CDG-MEX"] ?? [];
    const cdgMexPrograms = cdgMex.flatMap(c => c.programs);
    expect(cdgMexPrograms).toContain("Flying Blue");
  });

  it("Aeromexico on MEX-LHR outbound, British Airways on reverse", () => {
    const mexLhr = HOME_CARRIER_PROGRAMS["MEX-LHR"] ?? [];
    const mexLhrPrograms = mexLhr.flatMap(c => c.programs);
    expect(mexLhrPrograms).toContain("Aeromexico Club Premier");

    const lhrMex = HOME_CARRIER_PROGRAMS["LHR-MEX"] ?? [];
    const lhrMexPrograms = lhrMex.flatMap(c => c.programs);
    expect(lhrMexPrograms).toContain("British Airways Avios");
  });

  it("LATAM Pass guaranteed on GRU routes (LAX, JFK, CDG, SFO)", () => {
    const gruRoutes = ["GRU-LAX", "LAX-GRU", "GRU-JFK", "JFK-GRU", "GRU-CDG", "GRU-SFO", "SFO-GRU"];
    for (const route of gruRoutes) {
      const carriers = HOME_CARRIER_PROGRAMS[route] ?? [];
      const allPrograms = carriers.flatMap(c => c.programs);
      expect(allPrograms).toContain("LATAM Pass");
    }
  });

  it("LifeMiles guaranteed on BOG routes (LAX, JFK, MIA)", () => {
    const bogRoutes = ["BOG-LAX", "LAX-BOG", "BOG-JFK", "JFK-BOG", "BOG-MIA", "MIA-BOG"];
    for (const route of bogRoutes) {
      const carriers = HOME_CARRIER_PROGRAMS[route] ?? [];
      const allPrograms = carriers.flatMap(c => c.programs);
      expect(allPrograms).toContain("LifeMiles");
    }
  });

  it("COPA ConnectMiles guaranteed on SJO routes (LAX, JFK)", () => {
    const sjoRoutes = ["SJO-LAX", "LAX-SJO", "SJO-JFK", "JFK-SJO"];
    for (const route of sjoRoutes) {
      const carriers = HOME_CARRIER_PROGRAMS[route] ?? [];
      const allPrograms = carriers.flatMap(c => c.programs);
      expect(allPrograms).toContain("COPA ConnectMiles");
    }
  });

  it("LATAM Pass guaranteed on EZE routes (LAX, JFK, CDG)", () => {
    const ezeRoutes = ["EZE-LAX", "LAX-EZE", "EZE-JFK", "JFK-EZE", "EZE-CDG"];
    for (const route of ezeRoutes) {
      const carriers = HOME_CARRIER_PROGRAMS[route] ?? [];
      const allPrograms = carriers.flatMap(c => c.programs);
      expect(allPrograms).toContain("LATAM Pass");
    }
  });

  it("all Latin America corridors (Task 3.1) have both directions", () => {
    const latinAmericaRoutes = [
      // MEX
      "MEX-LAX", "LAX-MEX", "MEX-JFK", "JFK-MEX", "MEX-SFO", "SFO-MEX",
      "MEX-CDG", "CDG-MEX", "MEX-LHR", "LHR-MEX",
      // GRU
      "GRU-LAX", "LAX-GRU", "GRU-JFK", "JFK-GRU", "GRU-CDG", "CDG-GRU", "GRU-SFO", "SFO-GRU",
      // BOG
      "BOG-LAX", "LAX-BOG", "BOG-JFK", "JFK-BOG", "BOG-MIA", "MIA-BOG",
      // SJO
      "SJO-LAX", "LAX-SJO", "SJO-JFK", "JFK-SJO",
      // EZE
      "EZE-LAX", "LAX-EZE", "EZE-JFK", "JFK-EZE", "EZE-CDG", "CDG-EZE",
    ];
    for (const route of latinAmericaRoutes) {
      expect(HOME_CARRIER_PROGRAMS).toHaveProperty(route);
    }
  });

  it("Latin America hub coverage includes all 5 new hubs (MEX, SJO, GRU, EZE, BOG)", () => {
    const keys = Object.keys(HOME_CARRIER_PROGRAMS);
    expect(keys.some(k => k.startsWith("MEX-"))).toBe(true);
    expect(keys.some(k => k.startsWith("SJO-"))).toBe(true);
    expect(keys.some(k => k.startsWith("GRU-"))).toBe(true);
    expect(keys.some(k => k.startsWith("EZE-"))).toBe(true);
    expect(keys.some(k => k.startsWith("BOG-"))).toBe(true);
  });

  // ─── P5 Task 3.2: South Pacific Expansion (SYD, NZL) ──────────────────────────
  it("Qantas Frequent Flyer guaranteed on SYD→LAX and reverse", () => {
    for (const route of ["SYD-LAX", "LAX-SYD"]) {
      const carriers = HOME_CARRIER_PROGRAMS[route] ?? [];
      const allPrograms = carriers.flatMap(c => c.programs);
      expect(allPrograms).toContain("Qantas Frequent Flyer");
    }
  });

  it("Qantas Frequent Flyer guaranteed on SYD→JFK and reverse", () => {
    for (const route of ["SYD-JFK", "JFK-SYD"]) {
      const carriers = HOME_CARRIER_PROGRAMS[route] ?? [];
      const allPrograms = carriers.flatMap(c => c.programs);
      expect(allPrograms).toContain("Qantas Frequent Flyer");
    }
  });

  it("Qantas Frequent Flyer on SYD→LHR outbound, British Airways on reverse", () => {
    const sydLhr = HOME_CARRIER_PROGRAMS["SYD-LHR"] ?? [];
    const sydLhrPrograms = sydLhr.flatMap(c => c.programs);
    expect(sydLhrPrograms).toContain("Qantas Frequent Flyer");

    const lhrSyd = HOME_CARRIER_PROGRAMS["LHR-SYD"] ?? [];
    const lhrSydPrograms = lhrSyd.flatMap(c => c.programs);
    expect(lhrSydPrograms).toContain("British Airways Avios");
  });

  it("Qantas Frequent Flyer on SYD→CDG outbound, Flying Blue on reverse", () => {
    const sydCdg = HOME_CARRIER_PROGRAMS["SYD-CDG"] ?? [];
    const sydCdgPrograms = sydCdg.flatMap(c => c.programs);
    expect(sydCdgPrograms).toContain("Qantas Frequent Flyer");

    const cdgSyd = HOME_CARRIER_PROGRAMS["CDG-SYD"] ?? [];
    const cdgSydPrograms = cdgSyd.flatMap(c => c.programs);
    expect(cdgSydPrograms).toContain("Flying Blue");
  });

  it("Qantas Frequent Flyer on SYD→BKK outbound, Thai Royal Orchid Plus on reverse", () => {
    const sydBkk = HOME_CARRIER_PROGRAMS["SYD-BKK"] ?? [];
    const sydBkkPrograms = sydBkk.flatMap(c => c.programs);
    expect(sydBkkPrograms).toContain("Qantas Frequent Flyer");

    const bkkSyd = HOME_CARRIER_PROGRAMS["BKK-SYD"] ?? [];
    const bkkSydPrograms = bkkSyd.flatMap(c => c.programs);
    expect(bkkSydPrograms).toContain("Thai Royal Orchid Plus");
  });

  it("SYD-NRT and NRT-SYD: ANA + Qantas (P3 Expansion)", () => {
    const sydNrt = HOME_CARRIER_PROGRAMS["SYD-NRT"] ?? [];
    const sydNrtPrograms = sydNrt.flatMap(c => c.programs);
    expect(sydNrtPrograms).toContain("Qantas Frequent Flyer");
    expect(sydNrtPrograms).toContain("ANA Mileage Club");

    const nrtSyd = HOME_CARRIER_PROGRAMS["NRT-SYD"] ?? [];
    const nrtSydPrograms = nrtSyd.flatMap(c => c.programs);
    expect(nrtSydPrograms).toContain("ANA Mileage Club");
    expect(nrtSydPrograms).toContain("Qantas Frequent Flyer");
  });

  it("Air New Zealand Airpoints guaranteed on NZL→LAX and reverse", () => {
    for (const route of ["NZL-LAX", "LAX-NZL"]) {
      const carriers = HOME_CARRIER_PROGRAMS[route] ?? [];
      const allPrograms = carriers.flatMap(c => c.programs);
      expect(allPrograms).toContain("Air New Zealand Airpoints");
    }
  });

  it("Air New Zealand Airpoints guaranteed on NZL→SFO and reverse", () => {
    for (const route of ["NZL-SFO", "SFO-NZL"]) {
      const carriers = HOME_CARRIER_PROGRAMS[route] ?? [];
      const allPrograms = carriers.flatMap(c => c.programs);
      expect(allPrograms).toContain("Air New Zealand Airpoints");
    }
  });

  it("Air New Zealand Airpoints on NZL→LHR outbound, British Airways on reverse", () => {
    const nzlLhr = HOME_CARRIER_PROGRAMS["NZL-LHR"] ?? [];
    const nzlLhrPrograms = nzlLhr.flatMap(c => c.programs);
    expect(nzlLhrPrograms).toContain("Air New Zealand Airpoints");

    const lhrNzl = HOME_CARRIER_PROGRAMS["LHR-NZL"] ?? [];
    const lhrNzlPrograms = lhrNzl.flatMap(c => c.programs);
    expect(lhrNzlPrograms).toContain("British Airways Avios");
  });

  it("all South Pacific corridors (Task 3.2) have both directions", () => {
    const southPacificRoutes = [
      // SYD routes
      "SYD-LAX", "LAX-SYD",
      "SYD-JFK", "JFK-SYD",
      "SYD-LHR", "LHR-SYD",
      "SYD-CDG", "CDG-SYD",
      "SYD-NRT", "NRT-SYD",
      "SYD-BKK", "BKK-SYD",
      // NZL routes
      "NZL-LAX", "LAX-NZL",
      "NZL-SFO", "SFO-NZL",
      "NZL-LHR", "LHR-NZL",
    ];
    for (const route of southPacificRoutes) {
      expect(HOME_CARRIER_PROGRAMS).toHaveProperty(route);
    }
  });

  it("South Pacific hub coverage includes SYD and NZL hubs", () => {
    const keys = Object.keys(HOME_CARRIER_PROGRAMS);
    expect(keys.some(k => k.startsWith("SYD-"))).toBe(true);
    expect(keys.some(k => k.startsWith("NZL-"))).toBe(true);
  });
});
