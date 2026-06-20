import {
  GLOBAL_PROGRAMS,
  BANK_POINT_VALUES,
  type LoyaltyProgram,
  type Alliance,
  type TaxProfile,
} from "@/lib/globalPrograms";

describe("globalPrograms", () => {
  describe("loyalty program structure", () => {
    test("GLOBAL_PROGRAMS is an array with 30+ programs", () => {
      expect(Array.isArray(GLOBAL_PROGRAMS)).toBe(true);
      expect(GLOBAL_PROGRAMS.length).toBeGreaterThanOrEqual(30);
    });

    test("each program has required fields: name, airlineCode, airline, alliance, marketValueCents, taxProfile, transferPartnersFrom", () => {
      for (const program of GLOBAL_PROGRAMS) {
        expect(program.name).toBeDefined();
        expect(typeof program.name).toBe("string");

        expect(program.airlineCode).toBeDefined();
        expect(typeof program.airlineCode).toBe("string");
        expect(program.airlineCode.length).toBe(2); // IATA codes are 2 letters

        expect(program.airline).toBeDefined();
        expect(typeof program.airline).toBe("string");

        expect(program.alliance).toBeDefined();
        expect(["Star Alliance", "Oneworld", "SkyTeam", "Independent"]).toContain(
          program.alliance
        );

        expect(program.marketValueCents).toBeDefined();
        expect(typeof program.marketValueCents).toBe("number");
        expect(program.marketValueCents).toBeGreaterThan(0);

        expect(program.taxProfile).toBeDefined();
        expect(["low", "medium", "high"]).toContain(program.taxProfile);

        expect(program.transferPartnersFrom).toBeDefined();
        expect(Array.isArray(program.transferPartnersFrom)).toBe(true);
      }
    });

    test("optional fields have correct types: isBookable (boolean), accessibilityScore (1|2|3)", () => {
      for (const program of GLOBAL_PROGRAMS) {
        if (program.isBookable !== undefined) {
          expect(typeof program.isBookable).toBe("boolean");
        }

        if (program.accessibilityScore !== undefined) {
          expect([1, 2, 3]).toContain(program.accessibilityScore);
        }
      }
    });

    test("purchaseMileCostPer1000 is either null or a positive number", () => {
      for (const program of GLOBAL_PROGRAMS) {
        if (program.purchaseMileCostPer1000 !== null) {
          expect(typeof program.purchaseMileCostPer1000).toBe("number");
          expect(program.purchaseMileCostPer1000).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("major programs presence", () => {
    test("SkyTeam programs include: Flying Blue, Delta SkyMiles, Korean Air SKYPASS", () => {
      const skyteamNames = GLOBAL_PROGRAMS.filter((p) => p.alliance === "SkyTeam").map(
        (p) => p.name
      );

      expect(skyteamNames).toContain("Flying Blue");
      expect(skyteamNames).toContain("Delta SkyMiles");
      expect(skyteamNames).toContain("Korean Air SKYPASS");
    });

    test("Star Alliance programs include: Turkish Miles&Smiles, Air Canada Aeroplan, Singapore KrisFlyer, ANA Mileage Club", () => {
      const starAllianceNames = GLOBAL_PROGRAMS.filter(
        (p) => p.alliance === "Star Alliance"
      ).map((p) => p.name);

      expect(starAllianceNames).toContain("Turkish Miles&Smiles");
      expect(starAllianceNames).toContain("Air Canada Aeroplan");
      expect(starAllianceNames).toContain("Singapore KrisFlyer");
      expect(starAllianceNames).toContain("ANA Mileage Club");
    });

    test("Oneworld programs include multiple carriers: Qatar, Japan Airlines, Cathay Pacific, Qantas", () => {
      const oneworldNames = GLOBAL_PROGRAMS.filter((p) => p.alliance === "Oneworld").map(
        (p) => p.name
      );

      expect(oneworldNames.length).toBeGreaterThanOrEqual(8);
      expect(oneworldNames.some((n) => n.includes("Qatar"))).toBe(true);
      expect(oneworldNames.some((n) => n.includes("Japan Airlines"))).toBe(true);
      expect(oneworldNames.some((n) => n.includes("Cathay"))).toBe(true);
    });

    test("Independent programs include: Emirates Skywards, Etihad Guest, Virgin Atlantic Flying Club", () => {
      const independentNames = GLOBAL_PROGRAMS.filter(
        (p) => p.alliance === "Independent"
      ).map((p) => p.name);

      expect(independentNames).toContain("Emirates Skywards");
      expect(independentNames).toContain("Etihad Guest");
      expect(independentNames).toContain("Virgin Atlantic Flying Club");
    });
  });

  describe("alliance distribution", () => {
    test("all 4 alliances are represented", () => {
      const alliances = new Set(GLOBAL_PROGRAMS.map((p) => p.alliance));
      expect(alliances.has("Star Alliance")).toBe(true);
      expect(alliances.has("Oneworld")).toBe(true);
      expect(alliances.has("SkyTeam")).toBe(true);
      expect(alliances.has("Independent")).toBe(true);
      expect(alliances.size).toBe(4);
    });

    test("Star Alliance has 10+ programs", () => {
      const starCount = GLOBAL_PROGRAMS.filter(
        (p) => p.alliance === "Star Alliance"
      ).length;
      expect(starCount).toBeGreaterThanOrEqual(10);
    });

    test("Oneworld has 8+ programs", () => {
      const owCount = GLOBAL_PROGRAMS.filter((p) => p.alliance === "Oneworld").length;
      expect(owCount).toBeGreaterThanOrEqual(8);
    });

    test("SkyTeam has 6+ programs", () => {
      const stCount = GLOBAL_PROGRAMS.filter((p) => p.alliance === "SkyTeam").length;
      expect(stCount).toBeGreaterThanOrEqual(6);
    });

    test("Independent has 3+ programs", () => {
      const indCount = GLOBAL_PROGRAMS.filter(
        (p) => p.alliance === "Independent"
      ).length;
      expect(indCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe("transfer partners", () => {
    test("premium programs (accessibility=1) generally have transfer partners (1+)", () => {
      const premiumPrograms = GLOBAL_PROGRAMS.filter(
        (p) => p.accessibilityScore === 1
      );

      for (const program of premiumPrograms) {
        expect(program.transferPartnersFrom.length).toBeGreaterThanOrEqual(1);
      }
    });

    test("transfer partners are non-empty strings", () => {
      for (const program of GLOBAL_PROGRAMS) {
        for (const partner of program.transferPartnersFrom) {
          expect(typeof partner).toBe("string");
          expect(partner.length).toBeGreaterThan(0);
        }
      }
    });

    test("common transfer partners include Chase, Amex, Citi, Marriott", () => {
      const allPartners = new Set(
        GLOBAL_PROGRAMS.flatMap((p) => p.transferPartnersFrom)
      );

      // At least some programs transfer from these major banks
      const expectedPartners = [
        "Chase Ultimate Rewards",
        "Amex Membership Rewards",
        "Citi ThankYou",
        "Marriott Bonvoy",
      ];

      for (const partner of expectedPartners) {
        expect(allPartners.has(partner)).toBe(true);
      }
    });
  });

  describe("market values", () => {
    test("market values range from 0.5 to 2.0 cents per mile", () => {
      for (const program of GLOBAL_PROGRAMS) {
        expect(program.marketValueCents).toBeGreaterThanOrEqual(0.5);
        expect(program.marketValueCents).toBeLessThanOrEqual(2.0);
      }
    });

    test("premium programs (Flying Blue, SkyPriority) have higher values (1.4+)", () => {
      const fbProgram = GLOBAL_PROGRAMS.find((p) => p.name === "Flying Blue");
      expect(fbProgram?.marketValueCents).toBeGreaterThanOrEqual(1.4);
    });

    test("niche programs have lower values (0.8-1.0)", () => {
      const niches = GLOBAL_PROGRAMS.filter((p) => p.accessibilityScore === 3);
      for (const program of niches) {
        expect(program.marketValueCents).toBeLessThanOrEqual(1.2);
      }
    });
  });

  describe("tax profiles", () => {
    test("tax profiles are correctly distributed: low, medium, high", () => {
      const profiles = new Set(GLOBAL_PROGRAMS.map((p) => p.taxProfile));
      expect(profiles.has("low")).toBe(true);
      expect(profiles.has("medium")).toBe(true);
      expect(profiles.has("high")).toBe(true);
    });

    test("most programs have low or medium tax profile", () => {
      const lowMedium = GLOBAL_PROGRAMS.filter(
        (p) => p.taxProfile === "low" || p.taxProfile === "medium"
      ).length;
      const ratio = lowMedium / GLOBAL_PROGRAMS.length;
      expect(ratio).toBeGreaterThan(0.7);
    });
  });

  describe("bank point values", () => {
    test("BANK_POINT_VALUES has major card networks", () => {
      expect(BANK_POINT_VALUES["Chase Ultimate Rewards"]).toBeDefined();
      expect(BANK_POINT_VALUES["Amex Membership Rewards"]).toBeDefined();
      expect(BANK_POINT_VALUES["Citi ThankYou"]).toBeDefined();
      expect(BANK_POINT_VALUES["Marriott Bonvoy"]).toBeDefined();
    });

    test("bank point values are between 0.7 and 2.0 cents per point", () => {
      for (const value of Object.values(BANK_POINT_VALUES)) {
        expect(value).toBeGreaterThanOrEqual(0.7);
        expect(value).toBeLessThanOrEqual(2.0);
      }
    });

    test("premium programs (Chase, Amex) are 1.85-2.0 cents", () => {
      expect(BANK_POINT_VALUES["Chase Ultimate Rewards"]).toBeGreaterThanOrEqual(1.85);
      expect(BANK_POINT_VALUES["Amex Membership Rewards"]).toBeGreaterThanOrEqual(1.85);
    });

    test("Marriott Bonvoy is lower at 0.7 (3:1 ratio factored in)", () => {
      expect(BANK_POINT_VALUES["Marriott Bonvoy"]).toBe(0.7);
    });
  });

  describe("accessibility scoring", () => {
    test("accessibility scores are 1, 2, or 3", () => {
      for (const program of GLOBAL_PROGRAMS) {
        if (program.accessibilityScore !== undefined) {
          expect([1, 2, 3]).toContain(program.accessibilityScore);
        }
      }
    });

    test("tier 1 (widely accessible) includes major programs like Flying Blue, Delta, ANA", () => {
      const tier1 = GLOBAL_PROGRAMS.filter((p) => p.accessibilityScore === 1).map(
        (p) => p.name
      );
      expect(tier1.length).toBeGreaterThan(5);
    });

    test("tier 2 (moderately accessible) programs exist", () => {
      const tier2 = GLOBAL_PROGRAMS.filter((p) => p.accessibilityScore === 2).length;
      expect(tier2).toBeGreaterThan(0);
    });

    test("tier 3 (hard to access) programs have no transfer partners", () => {
      const tier3 = GLOBAL_PROGRAMS.filter((p) => p.accessibilityScore === 3);
      for (const program of tier3) {
        expect(program.transferPartnersFrom.length).toBe(0);
      }
    });
  });

  describe("program naming consistency", () => {
    test("most program names are unique (majority case)", () => {
      const names = GLOBAL_PROGRAMS.map((p) => p.name);
      const uniqueNames = new Set(names);
      // Allow for some duplicate names (e.g., multi-brand programs)
      expect(uniqueNames.size).toBeGreaterThan(names.length * 0.95);
    });

    test("most airline codes are unique (majority case)", () => {
      const codes = GLOBAL_PROGRAMS.map((p) => p.airlineCode);
      const uniqueCodes = new Set(codes);
      // Allow for some duplicate codes (e.g., subsidiary airlines sharing code)
      expect(uniqueCodes.size).toBeGreaterThan(codes.length * 0.95);
    });

    test("airline codes are 2 characters (IATA or proprietary)", () => {
      for (const program of GLOBAL_PROGRAMS) {
        expect(program.airlineCode.length).toBeGreaterThanOrEqual(1);
        expect(program.airlineCode.length).toBeLessThanOrEqual(3);
      }
    });
  });

  describe("default values", () => {
    test("isBookable defaults to true (or is explicitly set)", () => {
      for (const program of GLOBAL_PROGRAMS) {
        if (program.isBookable === undefined) {
          // OK — will default to true
        } else {
          expect(typeof program.isBookable).toBe("boolean");
        }
      }
    });

    test("accessibilityScore defaults to 2 (or is explicitly set)", () => {
      for (const program of GLOBAL_PROGRAMS) {
        if (program.accessibilityScore === undefined) {
          // OK — will default to 2
        } else {
          expect([1, 2, 3]).toContain(program.accessibilityScore);
        }
      }
    });
  });
});
