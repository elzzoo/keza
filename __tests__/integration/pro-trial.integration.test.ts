import { grantTrialIfNew, getTrialStatus } from "@/lib/lemonsqueezy";
import { checkProAccess } from "@/lib/proAccess";
import { redis } from "@/lib/redis";

describe("Pro Trial Integration", () => {
  const testEmail = `trial-test-${Date.now()}@example.com`;

  afterAll(async () => {
    // Cleanup
    await redis.del(`keza:pro:trial:${testEmail.toLowerCase()}`);
    await redis.del(`keza:pro:${testEmail.toLowerCase()}`);
  });

  it("grants trial on first login", async () => {
    const granted = await grantTrialIfNew(testEmail);
    expect(granted).toBe(true);
  });

  it("does not re-grant trial to same user", async () => {
    const granted = await grantTrialIfNew(testEmail);
    expect(granted).toBe(false);
  });

  it("returns active Pro access status with trial", async () => {
    const status = await checkProAccess(testEmail);
    expect(status.hasTrial).toBe(true);
    expect(status.isActive).toBe(true);
    expect(status.daysLeft).toBeLessThanOrEqual(7);
  });

  it("trial status includes expiry date", async () => {
    const trial = await getTrialStatus(testEmail);
    expect(trial).not.toBeNull();
    expect(trial!.expiresAt).toBeDefined();
  });
});
