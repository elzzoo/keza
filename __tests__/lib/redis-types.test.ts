import { redis } from "../../lib/redis";

describe("Redis Type Safety", () => {
  describe("safeZrange", () => {
    it("should accept proper zrange parameters without type casting", async () => {
      // This test ensures that zrange can be called with proper typing
      // The function signature should accept key, start, stop, and optional options
      const key = "test:zrange";
      const start = 0;
      const stop = -1;
      const options = { withScores: true, rev: true };

      // This call should not require 'as any' casting
      const result = await redis.zrange(key, start, stop, options);

      // Result should be properly typed as an array
      expect(Array.isArray(result)).toBe(true);
    });

    it("should return empty array on error", async () => {
      // Simulating a non-existent key
      const result = await redis.zrange("nonexistent:key", 0, -1);
      expect(result).toEqual([]);
    });

    it("should support withScores option", async () => {
      // Test with withScores option
      const result = await redis.zrange("test:key", 0, -1, { withScores: true });
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
