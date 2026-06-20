import { IATA_TO_AIRLINE } from "@/lib/iataAirlines";

describe("iataAirlines", () => {
  describe("IATA code mapping", () => {
    test("IATA_TO_AIRLINE has 50+ airlines", () => {
      expect(Object.keys(IATA_TO_AIRLINE).length).toBeGreaterThanOrEqual(50);
    });

    test("all IATA codes are 2 characters", () => {
      for (const code of Object.keys(IATA_TO_AIRLINE)) {
        expect(code.length).toBe(2);
        expect(code).toMatch(/^[A-Z0-9]{2}$/);
      }
    });

    test("all airline names are non-empty strings", () => {
      for (const name of Object.values(IATA_TO_AIRLINE)) {
        expect(typeof name).toBe("string");
        expect(name.length).toBeGreaterThan(0);
      }
    });
  });

  describe("major carriers", () => {
    test("Big 3 US airlines: AA, UA, DL", () => {
      expect(IATA_TO_AIRLINE["AA"]).toBe("American Airlines");
      expect(IATA_TO_AIRLINE["UA"]).toBe("United");
      expect(IATA_TO_AIRLINE["DL"]).toBe("Delta");
    });

    test("European flagship carriers: AF, KL, LH, BA, IB", () => {
      expect(IATA_TO_AIRLINE["AF"]).toBe("Air France");
      expect(IATA_TO_AIRLINE["KL"]).toBe("KLM");
      expect(IATA_TO_AIRLINE["LH"]).toBe("Lufthansa");
      expect(IATA_TO_AIRLINE["BA"]).toBe("British Airways");
      expect(IATA_TO_AIRLINE["IB"]).toBe("Iberia");
    });

    test("Asian flagship carriers: SQ, NH, JAL, CX", () => {
      expect(IATA_TO_AIRLINE["SQ"]).toBe("Singapore Airlines");
      expect(IATA_TO_AIRLINE["NH"]).toBe("All Nippon Airways");
      expect(IATA_TO_AIRLINE["JL"]).toBe("Japan Airlines");
      expect(IATA_TO_AIRLINE["CX"]).toBe("Cathay Pacific");
    });

    test("Middle East carriers: EK, EY, QR, GF", () => {
      expect(IATA_TO_AIRLINE["EK"]).toBe("Emirates");
      expect(IATA_TO_AIRLINE["EY"]).toBe("Etihad");
      expect(IATA_TO_AIRLINE["QR"]).toBe("Qatar Airways");
      expect(IATA_TO_AIRLINE["GF"]).toBe("Gulf Air");
    });

    test("African carriers: ET, SA, WB, KQ, HC", () => {
      expect(IATA_TO_AIRLINE["ET"]).toBe("Ethiopian Airlines");
      expect(IATA_TO_AIRLINE["SA"]).toBe("South African Airways");
      expect(IATA_TO_AIRLINE["WB"]).toBe("RwandAir");
      expect(IATA_TO_AIRLINE["KQ"]).toBe("Kenya Airways");
      expect(IATA_TO_AIRLINE["HC"]).toBe("Air Senegal");
    });
  });

  describe("low-cost carriers", () => {
    test("European LCCs: FR (Ryanair), W6 (Wizz), VY (Vueling)", () => {
      expect(IATA_TO_AIRLINE["FR"]).toBe("Ryanair");
      expect(IATA_TO_AIRLINE["W6"]).toBe("Wizz Air");
      expect(IATA_TO_AIRLINE["VY"]).toBe("Vueling");
    });

    test("LCC: B6 (JetBlue), AS (Alaska Airlines)", () => {
      expect(IATA_TO_AIRLINE["B6"]).toBe("JetBlue");
      expect(IATA_TO_AIRLINE["AS"]).toBe("Alaska Airlines");
    });

    test("Regional/niche LCCs: HV (Transavia), PC (Pegasus)", () => {
      expect(IATA_TO_AIRLINE["HV"]).toBe("Transavia");
      expect(IATA_TO_AIRLINE["PC"]).toBe("Pegasus Airlines");
    });
  });

  describe("alliance alignment", () => {
    test("Star Alliance carriers present: LH, UA, AC, SQ, TK, ET, etc.", () => {
      const starMembers = ["LH", "UA", "AC", "SQ", "TK", "ET", "NH"];
      for (const code of starMembers) {
        expect(IATA_TO_AIRLINE[code]).toBeDefined();
      }
    });

    test("SkyTeam carriers present: AF, KL, DL, KE, MU, CI", () => {
      const skyteamMembers = ["AF", "KL", "DL", "KE", "MU", "CI"];
      for (const code of skyteamMembers) {
        expect(IATA_TO_AIRLINE[code]).toBeDefined();
      }
    });

    test("Oneworld carriers present: BA, AA, QR, JL, CX, QF", () => {
      const oneworldMembers = ["BA", "AA", "QR", "JL", "CX", "QF"];
      for (const code of oneworldMembers) {
        expect(IATA_TO_AIRLINE[code]).toBeDefined();
      }
    });

    test("Independent carriers present: EK, EY, VS", () => {
      const independents = ["EK", "EY", "VS"];
      for (const code of independents) {
        expect(IATA_TO_AIRLINE[code]).toBeDefined();
      }
    });
  });

  describe("special cases", () => {
    test("LATAM: LA → LATAM Airlines", () => {
      expect(IATA_TO_AIRLINE["LA"]).toBe("LATAM Airlines");
    });

    test("Emirates group: EK (Emirates), FZ (flydubai)", () => {
      expect(IATA_TO_AIRLINE["EK"]).toBe("Emirates");
      expect(IATA_TO_AIRLINE["FZ"]).toBe("flydubai");
    });

    test("Iberia group: IB (Iberia), I2 (Iberia Express)", () => {
      expect(IATA_TO_AIRLINE["IB"]).toBe("Iberia");
      expect(IATA_TO_AIRLINE["I2"]).toBe("Iberia Express");
    });

    test("Air France-KLM group: AF (Air France), KL (KLM), HV (Transavia)", () => {
      expect(IATA_TO_AIRLINE["AF"]).toBe("Air France");
      expect(IATA_TO_AIRLINE["KL"]).toBe("KLM");
      expect(IATA_TO_AIRLINE["HV"]).toBe("Transavia");
    });

    test("Wizz Air variants: W6 (main), W9 (Abu Dhabi), W4 (Malta)", () => {
      expect(IATA_TO_AIRLINE["W6"]).toBe("Wizz Air");
      expect(IATA_TO_AIRLINE["W9"]).toBe("Wizz Air Abu Dhabi");
      expect(IATA_TO_AIRLINE["W4"]).toBe("Wizz Air Malta");
    });

    test("3-digit codes: 3O (Air Arabia Maroc), 3U (Sichuan Airlines)", () => {
      expect(IATA_TO_AIRLINE["3O"]).toBe("Air Arabia Maroc");
      expect(IATA_TO_AIRLINE["3U"]).toBe("Sichuan Airlines");
    });
  });

  describe("data consistency", () => {
    test("no duplicate IATA codes (values are unique per code)", () => {
      const codes = Object.keys(IATA_TO_AIRLINE);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    test("airline names don't have leading/trailing spaces", () => {
      for (const name of Object.values(IATA_TO_AIRLINE)) {
        expect(name).toBe(name.trim());
      }
    });

    test("comments in code don't affect mapping structure", () => {
      // Just verify structure is sound
      expect(Object.keys(IATA_TO_AIRLINE).length).toBeGreaterThan(50);
    });
  });

  describe("coverage completeness", () => {
    test("regional airlines from key markets are present", () => {
      const regionalMarkets = {
        BR: "EVA Air", // Taiwan
        CI: "China Airlines", // Taiwan
        VN: "Vietnam Airlines", // Vietnam
        TG: "Thai Airways", // Thailand
        AI: "Air India", // India
      };

      for (const [code, airline] of Object.entries(regionalMarkets)) {
        expect(IATA_TO_AIRLINE[code]).toBe(airline);
      }
    });

    test("African carriers from major hubs are present", () => {
      const africans = ["ET", "SA", "KQ", "WB", "HC"];
      for (const code of africans) {
        expect(IATA_TO_AIRLINE[code]).toBeDefined();
      }
    });

    test("Middle East carriers from major hubs are present", () => {
      const middleEast = ["EK", "EY", "QR", "GF"];
      for (const code of middleEast) {
        expect(IATA_TO_AIRLINE[code]).toBeDefined();
      }
    });
  });
});
