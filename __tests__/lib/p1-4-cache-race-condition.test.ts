import { redis } from "@/lib/redis";

describe("P1-4: Cache Race Condition - Atomic SET with NX", () => {
  const testKey = "test:cache:race";
  const testValue = { flights: [{ id: "test", price: 100 }] };

  afterEach(async () => {
    // Cleanup
    await redis.del(testKey).catch(() => {});
  });

  test("redis.set accepts nx option for atomic writes", async () => {
    // First write should succeed (key doesn't exist)
    const result1 = await redis.set(testKey, testValue, { ex: 60, nx: true });
    expect(result1).toBe("OK");

    // Second write should fail (key already exists with nx flag)
    const result2 = await redis.set(testKey, { different: "value" }, { ex: 60, nx: true });
    expect(result2).toBeNull();

    // Verify first value is still in cache
    const cached = await redis.get(testKey);
    expect(cached).toEqual(testValue);
  });

  test("redis.set with xx option updates only if key exists", async () => {
    // Write with xx should fail (key doesn't exist)
    const result1 = await redis.set(testKey, testValue, { ex: 60, xx: true });
    expect(result1).toBeNull();

    // Normal write to create key
    await redis.set(testKey, testValue, { ex: 60 });

    // Update with xx should succeed (key exists)
    const result2 = await redis.set(testKey, { updated: true }, { ex: 60, xx: true });
    expect(result2).toBe("OK");

    const cached = await redis.get(testKey);
    expect(cached).toEqual({ updated: true });
  });

  test("nx flag prevents concurrent writes from clobbering initial value", async () => {
    const value1 = { id: 1, data: "first" };
    const value2 = { id: 2, data: "second" };

    // Simulate two concurrent requests racing to write cache
    const [result1, result2] = await Promise.all([
      redis.set(testKey, value1, { ex: 60, nx: true }),
      redis.set(testKey, value2, { ex: 60, nx: true }),
    ]);

    // One succeeds, one fails
    const successCount = [result1, result2].filter((r) => r === "OK").length;
    const failCount = [result1, result2].filter((r) => r === null).length;

    expect(successCount).toBe(1);
    expect(failCount).toBe(1);

    // The winner's value is what's in cache (deterministic test requires waiting for race)
    const cached = await redis.get(testKey);
    expect(cached).toBeDefined();
    expect([value1, value2]).toContainEqual(cached);
  });

  test("set without nx option overwrites existing values (risky for cache)", async () => {
    const value1 = { id: 1, stale: true };
    const value2 = { id: 2, fresh: true };

    // Normal set (no nx) — both writes will succeed in sequence, overwriting
    await redis.set(testKey, value1, { ex: 60 });
    const result2 = await redis.set(testKey, value2, { ex: 60 });

    expect(result2).toBe("OK");

    // Second value wins
    const cached = await redis.get(testKey);
    expect(cached).toEqual(value2);
  });
});
