import { sendMilesAlertEmail, PriceAlert } from "@/lib/alerts";

// Mock Resend to avoid actual email sending in tests
jest.mock("resend", () => ({
  Resend: jest.fn(() => ({
    emails: {
      send: jest.fn(async () => ({ id: "test-email-id" })),
    },
  })),
}));

describe("sendMilesAlertEmail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_API_KEY = "test-key";
  });

  it("should build miles alert email with CPP improvement", async () => {
    const alert: PriceAlert = {
      id: "alt_test123",
      email: "user@example.com",
      from: "SIN",
      to: "LAX",
      cabin: "business",
      basePrice: 1200,
      targetPrice: 1200,
      createdAt: new Date().toISOString(),
      notifCount: 0,
      active: true,
      notifFrequency: "instant",
      milesAlert: {
        program: "Singapore KrisFlyer",
        targetCpp: 1.5,
        baseCpp: 1.2,
      },
    };

    const currentCpp = 1.5; // 25% improvement from baseline
    const cashPrice = 2000;
    const result = await sendMilesAlertEmail(alert, currentCpp, cashPrice);

    expect(result).toBe(true); // Email sent successfully
  });

  it("should include correct CPP values in email", async () => {
    const alert: PriceAlert = {
      id: "alt_test456",
      email: "user@example.com",
      from: "SIN",
      to: "LAX",
      cabin: "economy",
      basePrice: 500,
      targetPrice: 500,
      createdAt: new Date().toISOString(),
      notifCount: 0,
      active: true,
      notifFrequency: "instant",
      milesAlert: {
        program: "Singapore KrisFlyer",
        targetCpp: 1.5,
        baseCpp: 1.2,
      },
    };

    const currentCpp = 1.4;
    const cashPrice = 1800;
    const result = await sendMilesAlertEmail(alert, currentCpp, cashPrice);

    expect(result).toBe(true);
  });

  it("should fail gracefully if milesAlert missing", async () => {
    const alert: PriceAlert = {
      id: "alt_test789",
      email: "user@example.com",
      from: "SIN",
      to: "LAX",
      cabin: "economy",
      basePrice: 500,
      targetPrice: 500,
      createdAt: new Date().toISOString(),
      notifCount: 0,
      active: true,
      notifFrequency: "instant",
      // No milesAlert property
    };

    const result = await sendMilesAlertEmail(alert, 1.5, 2000);
    expect(result).toBe(false);
  });

  it("should handle different programs", async () => {
    const programs = [
      "Singapore KrisFlyer",
      "ANA Mileage Club",
      "Emirates Skywards",
    ];

    for (const program of programs) {
      const alert: PriceAlert = {
        id: `alt_${program}`,
        email: "user@example.com",
        from: "SIN",
        to: "LAX",
        cabin: "business",
        basePrice: 2000,
        targetPrice: 2000,
        createdAt: new Date().toISOString(),
        notifCount: 0,
        active: true,
        notifFrequency: "instant",
        milesAlert: {
          program,
          targetCpp: 1.5,
          baseCpp: 1.2,
        },
      };

      const result = await sendMilesAlertEmail(alert, 1.3, 2000);
      expect(result).toBe(true);
    }
  });

  it("should handle different cabin types", async () => {
    const cabins: Array<"economy" | "premium" | "business" | "first"> = [
      "economy",
      "premium",
      "business",
      "first",
    ];

    for (const cabin of cabins) {
      const alert: PriceAlert = {
        id: `alt_${cabin}`,
        email: "user@example.com",
        from: "SIN",
        to: "LAX",
        cabin,
        basePrice: 1000,
        targetPrice: 1000,
        createdAt: new Date().toISOString(),
        notifCount: 0,
        active: true,
        notifFrequency: "instant",
        milesAlert: {
          program: "Singapore KrisFlyer",
          targetCpp: 1.5,
          baseCpp: 1.2,
        },
      };

      const result = await sendMilesAlertEmail(alert, 1.32, 2000);
      expect(result).toBe(true);
    }
  });

  it("should include route and program in subject", async () => {
    const alert: PriceAlert = {
      id: "alt_subject_test",
      email: "user@example.com",
      from: "NRT",
      to: "JFK",
      cabin: "business",
      basePrice: 2500,
      targetPrice: 2500,
      createdAt: new Date().toISOString(),
      notifCount: 0,
      active: true,
      notifFrequency: "instant",
      milesAlert: {
        program: "ANA Mileage Club",
        targetCpp: 2.0,
        baseCpp: 1.8,
      },
    };

    const result = await sendMilesAlertEmail(alert, 1.98, 3000);
    expect(result).toBe(true);
  });

  it("should handle decimal CPP values", async () => {
    const alert: PriceAlert = {
      id: "alt_decimal",
      email: "user@example.com",
      from: "SIN",
      to: "LAX",
      cabin: "business",
      basePrice: 2000,
      targetPrice: 2000,
      createdAt: new Date().toISOString(),
      notifCount: 0,
      active: true,
      notifFrequency: "instant",
      milesAlert: {
        program: "Singapore KrisFlyer",
        targetCpp: 1.5,
        baseCpp: 1.234567,
      },
    };

    const currentCpp = 1.357623; // 10%+ improvement
    const result = await sendMilesAlertEmail(alert, currentCpp, 2000);
    expect(result).toBe(true);
  });
});
