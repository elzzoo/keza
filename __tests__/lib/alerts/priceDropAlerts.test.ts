import { createPriceAlert, checkAndFireAlerts } from "@/lib/alerts/priceDropAlerts";

describe("Price Drop Alerts (P1 - placeholder)", () => {
  const testUserId = "test-user-123";

  it("creates a price alert subscription", async () => {
    const alert = await createPriceAlert(
      testUserId,
      "SIN",
      "LAX",
      new Date("2026-08-01"),
      1500,
      "daily"
    );

    expect(alert.id).toBeDefined();
    expect(alert.userId).toBe(testUserId);
    expect(alert.from).toBe("SIN");
    expect(alert.to).toBe("LAX");
    expect(alert.frequency).toBe("daily");
    expect(alert.active).toBe(true);
  });

  it("checks alerts for price drops", async () => {
    const alert = await createPriceAlert(
      testUserId,
      "SIN",
      "LAX",
      new Date("2026-08-01"),
      1500,
      "daily"
    );

    await checkAndFireAlerts("SIN", "LAX", 1400);
    expect(alert.active).toBe(true);
  });
});
