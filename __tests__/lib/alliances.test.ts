import { ALLIANCES } from "@/lib/alliances";

describe("alliances", () => {
  describe("alliance membership", () => {
    test("all airlines map to valid alliance names", () => {
      const validAlliances = new Set([
        "SkyTeam",
        "Star Alliance",
        "Oneworld",
        "Independent",
      ]);

      for (const [airline, alliance] of Object.entries(ALLIANCES)) {
        expect(validAlliances.has(alliance)).toBe(true);
      }
    });

    test("major carriers are present: Air France, United, Qatar Airways, Emirates", () => {
      expect(ALLIANCES["Air France"]).toBe("SkyTeam");
      expect(ALLIANCES["United"]).toBe("Star Alliance");
      expect(ALLIANCES["Qatar Airways"]).toBe("Oneworld");
      expect(ALLIANCES["Emirates"]).toBe("Independent");
    });

    test("SkyTeam has China Eastern, Korean Air, KLM, Delta", () => {
      expect(ALLIANCES["China Eastern"]).toBe("SkyTeam");
      expect(ALLIANCES["Korean Air"]).toBe("SkyTeam");
      expect(ALLIANCES["KLM"]).toBe("SkyTeam");
      expect(ALLIANCES["Delta"]).toBe("SkyTeam");
    });

    test("Star Alliance has Singapore Airlines, Lufthansa, Turkish, ANA", () => {
      expect(ALLIANCES["Singapore Airlines"]).toBe("Star Alliance");
      expect(ALLIANCES["Lufthansa"]).toBe("Star Alliance");
      expect(ALLIANCES["Turkish Airlines"]).toBe("Star Alliance");
      expect(ALLIANCES["All Nippon Airways"]).toBe("Star Alliance");
    });

    test("Oneworld has British Airways, American, Japan Airlines, Cathay", () => {
      expect(ALLIANCES["British Airways"]).toBe("Oneworld");
      expect(ALLIANCES["American Airlines"]).toBe("Oneworld");
      expect(ALLIANCES["Japan Airlines"]).toBe("Oneworld");
      expect(ALLIANCES["Cathay Pacific"]).toBe("Oneworld");
    });

    test("Independent carriers: Virgin Atlantic, Etihad, RwandAir, Air Senegal", () => {
      expect(ALLIANCES["Virgin Atlantic"]).toBe("Independent");
      expect(ALLIANCES["Etihad"]).toBe("Independent");
      expect(ALLIANCES["RwandAir"]).toBe("Independent");
      expect(ALLIANCES["Air Senegal"]).toBe("Independent");
    });
  });

  describe("coverage and consistency", () => {
    test("all entries are non-empty strings", () => {
      for (const [airline, alliance] of Object.entries(ALLIANCES)) {
        expect(typeof airline).toBe("string");
        expect(airline.length).toBeGreaterThan(0);
        expect(typeof alliance).toBe("string");
        expect(alliance.length).toBeGreaterThan(0);
      }
    });

    test("no duplicate airline entries (each airline appears once)", () => {
      const airlines = Object.keys(ALLIANCES);
      const uniqueAirlines = new Set(airlines);
      expect(airlines.length).toBe(uniqueAirlines.size);
    });

    test("SkyTeam has significant coverage (15+)", () => {
      const skyteamAirlines = Object.values(ALLIANCES).filter(
        (a) => a === "SkyTeam"
      );
      expect(skyteamAirlines.length).toBeGreaterThanOrEqual(15);
    });

    test("Star Alliance has significant coverage (20+)", () => {
      const starAirlines = Object.values(ALLIANCES).filter(
        (a) => a === "Star Alliance"
      );
      expect(starAirlines.length).toBeGreaterThanOrEqual(20);
    });

    test("Oneworld has significant coverage (15+)", () => {
      const oneworldAirlines = Object.values(ALLIANCES).filter(
        (a) => a === "Oneworld"
      );
      expect(oneworldAirlines.length).toBeGreaterThanOrEqual(15);
    });

    test("Independent carriers exist (5+)", () => {
      const independentAirlines = Object.values(ALLIANCES).filter(
        (a) => a === "Independent"
      );
      expect(independentAirlines.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("regional and affiliate mappings", () => {
    test("Lufthansa Group subsidiaries are Star Alliance: Brussels Airlines, Austrian, Eurowings", () => {
      expect(ALLIANCES["Brussels Airlines"]).toBe("Star Alliance");
      expect(ALLIANCES["Austrian Airlines"]).toBe("Star Alliance");
      expect(ALLIANCES["Eurowings"]).toBe("Star Alliance");
    });

    test("Air France-KLM group: Transavia and HOP are SkyTeam", () => {
      expect(ALLIANCES["Transavia"]).toBe("SkyTeam");
      expect(ALLIANCES["Transavia France"]).toBe("SkyTeam");
      expect(ALLIANCES["HOP! Air France"]).toBe("SkyTeam");
    });

    test("IAG group (BA/Iberia): Iberia Express and Vueling are Oneworld", () => {
      expect(ALLIANCES["Iberia Express"]).toBe("Oneworld");
      expect(ALLIANCES["Vueling"]).toBe("Oneworld");
      expect(ALLIANCES["Level"]).toBe("Oneworld");
    });

    test("LATAM variants all map to Oneworld", () => {
      const latamVariants = [
        "LATAM Airlines",
        "LATAM Brasil",
        "LATAM Chile",
        "LATAM Argentina",
        "LATAM Perú",
        "LATAM Colombia",
        "LATAM",
      ];

      for (const variant of latamVariants) {
        expect(ALLIANCES[variant]).toBe("Oneworld");
      }
    });

    test("China Southern and affiliates: XiamenAir is SkyTeam", () => {
      expect(ALLIANCES["China Southern"]).toBe("SkyTeam");
      expect(ALLIANCES["XiamenAir"]).toBe("SkyTeam");
    });

    test("Emirates group: flydubai is Independent (same as Emirates)", () => {
      expect(ALLIANCES["Emirates"]).toBe("Independent");
      expect(ALLIANCES["flydubai"]).toBe("Independent");
    });
  });

  describe("carrier-specific notes", () => {
    test("Etihad mapped twice: Etihad and Etihad Airways both point to Independent", () => {
      expect(ALLIANCES["Etihad"]).toBe("Independent");
      expect(ALLIANCES["Etihad Airways"]).toBe("Independent");
    });

    test("Saudi Arabia carriers: Saudia and Saudi Arabian Airlines both SkyTeam", () => {
      expect(ALLIANCES["Saudia"]).toBe("SkyTeam");
      expect(ALLIANCES["Saudi Arabian Airlines"]).toBe("SkyTeam");
    });

    test("China: China Airlines (CI) is SkyTeam", () => {
      expect(ALLIANCES["China Airlines"]).toBe("SkyTeam");
    });

    test("recent Star Alliance entrants: Starlux and Philippine Airlines present", () => {
      expect(ALLIANCES["Starlux Airlines"]).toBe("Star Alliance");
      expect(ALLIANCES["Philippine Airlines"]).toBe("Star Alliance");
    });
  });

  describe("data structure integrity", () => {
    test("ALLIANCES is a Record<string, string>", () => {
      expect(typeof ALLIANCES).toBe("object");
      expect(ALLIANCES).not.toBeNull();
      expect(Array.isArray(ALLIANCES)).toBe(false);
    });

    test("total count of airlines is substantial (70+)", () => {
      const count = Object.keys(ALLIANCES).length;
      expect(count).toBeGreaterThanOrEqual(70);
    });

    test("alliance name distribution is balanced across 4 alliances", () => {
      const distribution = {
        SkyTeam: 0,
        "Star Alliance": 0,
        Oneworld: 0,
        Independent: 0,
      };

      for (const alliance of Object.values(ALLIANCES)) {
        if (alliance in distribution) {
          distribution[alliance as keyof typeof distribution]++;
        }
      }

      // Each alliance should have meaningful representation
      for (const count of Object.values(distribution)) {
        expect(count).toBeGreaterThan(0);
      }
    });
  });
});
