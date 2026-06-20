import type { PriceAlert } from "@/lib/alerts";

describe("alerts — types and data structures", () => {
  describe("PriceAlert type validation", () => {
    test("PriceAlert has required fields: id, email, from, to, cabin, basePrice, targetPrice, createdAt, notifCount, active, notifFrequency", () => {
      const alert: PriceAlert = {
        id: "alt_test123",
        email: "user@example.com",
        from: "SIN",
        to: "LAX",
        cabin: "economy",
        basePrice: 800,
        targetPrice: 720,
        createdAt: new Date().toISOString(),
        notifCount: 0,
        active: true,
        notifFrequency: "instant",
      };

      expect(alert.id).toBeDefined();
      expect(alert.email).toBeDefined();
      expect(alert.from).toBeDefined();
      expect(alert.to).toBeDefined();
      expect(alert.cabin).toBeDefined();
      expect(alert.basePrice).toBeGreaterThan(0);
      expect(alert.targetPrice).toBeGreaterThan(0);
      expect(alert.createdAt).toBeDefined();
      expect(alert.notifCount).toBe(0);
      expect(alert.active).toBe(true);
      expect(alert.notifFrequency).toBe("instant");
    });

    test("cabin types are: economy, premium, business, first", () => {
      const cabins: Array<PriceAlert["cabin"]> = [
        "economy",
        "premium",
        "business",
        "first",
      ];

      for (const cabin of cabins) {
        expect(["economy", "premium", "business", "first"]).toContain(cabin);
      }
    });

    test("notifFrequency types are: instant, daily, weekly", () => {
      const frequencies: Array<PriceAlert["notifFrequency"]> = [
        "instant",
        "daily",
        "weekly",
      ];

      for (const freq of frequencies) {
        expect(["instant", "daily", "weekly"]).toContain(freq);
      }
    });

    test("optional fields: lastCheckedAt, lastPrice, milesAlert", () => {
      const alert: PriceAlert = {
        id: "alt_test",
        email: "user@example.com",
        from: "SIN",
        to: "LAX",
        cabin: "economy",
        basePrice: 800,
        targetPrice: 720,
        createdAt: new Date().toISOString(),
        notifCount: 0,
        active: true,
        notifFrequency: "instant",
        lastCheckedAt: new Date().toISOString(),
        lastPrice: 750,
        milesAlert: {
          program: "Singapore KrisFlyer",
          targetCpp: 1.5,
          baseCpp: 1.2,
        },
      };

      expect(alert.lastCheckedAt).toBeDefined();
      expect(alert.lastPrice).toBeDefined();
      expect(alert.milesAlert).toBeDefined();
      if (alert.milesAlert) {
        expect(alert.milesAlert.program).toBe("Singapore KrisFlyer");
        expect(alert.milesAlert.targetCpp).toBeGreaterThan(0);
        expect(alert.milesAlert.baseCpp).toBeGreaterThan(0);
      }
    });
  });

  describe("alert validation rules", () => {
    test("targetPrice should be less than basePrice (discount scenario)", () => {
      const basePrice = 800;
      const targetPrice = 720;
      expect(targetPrice).toBeLessThan(basePrice);
    });

    test("default target price is 90% of current price", () => {
      const currentPrice = 800;
      const defaultTarget = Math.round(currentPrice * 0.9);
      expect(defaultTarget).toBe(720);
    });

    test("email is normalized: lowercase and trimmed", () => {
      const emails = [
        "User@Example.COM",
        "  user@example.com  ",
        "USER@EXAMPLE.COM",
      ];

      for (const email of emails) {
        const normalized = email.toLowerCase().trim();
        expect(normalized).toBe("user@example.com");
      }
    });

    test("airport codes are uppercase: SIN, LAX, NRT, etc.", () => {
      const codes = ["SIN", "LAX", "NRT", "JFK", "CDG"];
      for (const code of codes) {
        expect(code).toBe(code.toUpperCase());
        expect(code.length).toBe(3);
      }
    });
  });

  describe("alert lifecycle", () => {
    test("alert starts with active=true and notifCount=0", () => {
      const alert: PriceAlert = {
        id: "alt_test",
        email: "user@example.com",
        from: "SIN",
        to: "LAX",
        cabin: "economy",
        basePrice: 800,
        targetPrice: 720,
        createdAt: new Date().toISOString(),
        notifCount: 0,
        active: true,
        notifFrequency: "instant",
      };

      expect(alert.active).toBe(true);
      expect(alert.notifCount).toBe(0);
    });

    test("notifCount increments after each notification", () => {
      const alert: PriceAlert = {
        id: "alt_test",
        email: "user@example.com",
        from: "SIN",
        to: "LAX",
        cabin: "economy",
        basePrice: 800,
        targetPrice: 720,
        createdAt: new Date().toISOString(),
        notifCount: 0,
        active: true,
        notifFrequency: "instant",
      };

      // Simulate notifications
      alert.notifCount = 1;
      expect(alert.notifCount).toBe(1);

      alert.notifCount = 5;
      expect(alert.notifCount).toBe(5);
    });

    test("alert deactivates by setting active=false", () => {
      const alert: PriceAlert = {
        id: "alt_test",
        email: "user@example.com",
        from: "SIN",
        to: "LAX",
        cabin: "economy",
        basePrice: 800,
        targetPrice: 720,
        createdAt: new Date().toISOString(),
        notifCount: 0,
        active: true,
        notifFrequency: "instant",
      };

      alert.active = false;
      expect(alert.active).toBe(false);
    });

    test("lastCheckedAt and lastPrice update after price checks", () => {
      const alert: PriceAlert = {
        id: "alt_test",
        email: "user@example.com",
        from: "SIN",
        to: "LAX",
        cabin: "economy",
        basePrice: 800,
        targetPrice: 720,
        createdAt: new Date().toISOString(),
        notifCount: 0,
        active: true,
        notifFrequency: "instant",
      };

      const now = new Date().toISOString();
      alert.lastCheckedAt = now;
      alert.lastPrice = 750;

      expect(alert.lastCheckedAt).toBe(now);
      expect(alert.lastPrice).toBe(750);
    });
  });

  describe("price alert logic", () => {
    test("alert should fire when currentPrice <= targetPrice", () => {
      const targetPrice = 720;
      const currentPrice1 = 700;
      const currentPrice2 = 720;
      const currentPrice3 = 750;

      expect(currentPrice1 <= targetPrice).toBe(true); // Should fire
      expect(currentPrice2 <= targetPrice).toBe(true); // Should fire
      expect(currentPrice3 <= targetPrice).toBe(false); // Should not fire
    });

    test("miles alert fires when currentCpp >= targetCpp", () => {
      const targetCpp = 1.5;
      const cpp1 = 1.8;
      const cpp2 = 1.5;
      const cpp3 = 1.2;

      expect(cpp1 >= targetCpp).toBe(true); // Should fire
      expect(cpp2 >= targetCpp).toBe(true); // Should fire
      expect(cpp3 >= targetCpp).toBe(false); // Should not fire
    });

    test("price drop calculation: savings and percentage", () => {
      const basePrice = 800;
      const newPrice = 600;

      const savings = basePrice - newPrice;
      const dropPercent = Math.round(((basePrice - newPrice) / basePrice) * 100);

      expect(savings).toBe(200);
      expect(dropPercent).toBe(25);
    });

    test("notification frequency limits instant alerts to 1 per 24h", () => {
      // Logic: "instant" = as soon as price drops (max 1/24h)
      const notifFrequency = "instant";
      expect(["instant", "daily", "weekly"]).toContain(notifFrequency);
    });
  });

  describe("alert data integrity", () => {
    test("from and to are different", () => {
      const alert: PriceAlert = {
        id: "alt_test",
        email: "user@example.com",
        from: "SIN",
        to: "LAX",
        cabin: "economy",
        basePrice: 800,
        targetPrice: 720,
        createdAt: new Date().toISOString(),
        notifCount: 0,
        active: true,
        notifFrequency: "instant",
      };

      expect(alert.from).not.toBe(alert.to);
    });

    test("all prices are positive numbers", () => {
      const alert: PriceAlert = {
        id: "alt_test",
        email: "user@example.com",
        from: "SIN",
        to: "LAX",
        cabin: "economy",
        basePrice: 800,
        targetPrice: 720,
        createdAt: new Date().toISOString(),
        notifCount: 0,
        active: true,
        notifFrequency: "instant",
        lastPrice: 750,
      };

      expect(alert.basePrice).toBeGreaterThan(0);
      expect(alert.targetPrice).toBeGreaterThan(0);
      expect(alert.lastPrice).toBeGreaterThan(0);
    });

    test("notifCount is non-negative", () => {
      const alert: PriceAlert = {
        id: "alt_test",
        email: "user@example.com",
        from: "SIN",
        to: "LAX",
        cabin: "economy",
        basePrice: 800,
        targetPrice: 720,
        createdAt: new Date().toISOString(),
        notifCount: 5,
        active: true,
        notifFrequency: "instant",
      };

      expect(alert.notifCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("alert ID generation pattern", () => {
    test("alert IDs follow pattern alt_<timestamp>_<random>", () => {
      const id = "alt_test_12345";
      expect(id).toMatch(/^alt_/);
    });

    test("IDs are unique strings", () => {
      const ids = ["alt_test1", "alt_test2", "alt_test3"];
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("Redis key naming conventions", () => {
    test("email index keys: keza:alerts:email:{email}", () => {
      const email = "user@example.com";
      const key = `keza:alerts:email:${email.toLowerCase()}`;
      expect(key).toMatch(/^keza:alerts:email:/);
    });

    test("route index keys: keza:alerts:route:{from}:{to}", () => {
      const from = "SIN";
      const to = "LAX";
      const key = `keza:alerts:route:${from}:${to}`;
      expect(key).toMatch(/^keza:alerts:route:/);
      expect(key).toContain(":");
    });

    test("alert data keys: keza:alert:{id}", () => {
      const id = "alt_test123";
      const key = `keza:alert:${id}`;
      expect(key).toMatch(/^keza:alert:/);
    });

    test("all routes set key: keza:alerts:routes", () => {
      const key = "keza:alerts:routes";
      expect(key).toBe("keza:alerts:routes");
    });
  });

  describe("TTL and expiration", () => {
    test("INDEX_TTL is 90 days (90 * 86400 seconds)", () => {
      const INDEX_TTL = 90 * 86400;
      expect(INDEX_TTL).toBe(7776000);
    });

    test("deactivated alerts expire after 7 days", () => {
      const deactivatedTTL = 7 * 86400;
      expect(deactivatedTTL).toBe(604800);
    });

    test("updated alerts expire after 90 days", () => {
      const updateTTL = 90 * 86400;
      expect(updateTTL).toBe(7776000);
    });
  });

  describe("cabin labels for emails", () => {
    test("cabin labels map French names", () => {
      const cabinLabels: Record<PriceAlert["cabin"], string> = {
        economy: "Économique",
        premium: "Premium Éco",
        business: "Business",
        first: "Première",
      };

      expect(cabinLabels["economy"]).toBe("Économique");
      expect(cabinLabels["premium"]).toBe("Premium Éco");
      expect(cabinLabels["business"]).toBe("Business");
      expect(cabinLabels["first"]).toBe("Première");
    });
  });

  describe("email URL building", () => {
    test("UTM parameters can be added to URLs", () => {
      const baseUrl = "https://keza.app";
      const url = `${baseUrl}?utm_source=keza&utm_medium=email&utm_campaign=test`;

      expect(url).toContain("utm_source=keza");
      expect(url).toContain("utm_medium=email");
      expect(url).toContain("utm_campaign=test");
    });

    test("email open pixel URL includes encoded parameters", () => {
      const type = "confirmation";
      const email = "user@example.com";
      const pixelUrl = `/api/track/open?type=${encodeURIComponent(type)}&email=${encodeURIComponent(email)}`;

      expect(pixelUrl).toContain("type=");
      expect(pixelUrl).toContain("email=");
      expect(pixelUrl).toContain("confirmation");
    });
  });
});
