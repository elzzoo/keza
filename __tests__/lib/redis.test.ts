// __tests__/lib/redis.test.ts
// Tests for Redis error logging with logRedisError.

const mockLogRedisError = jest.fn();

jest.mock("@/lib/logger", () => ({
  logError: jest.fn(),
  logWarn: jest.fn(),
  logRedisError: (...args: unknown[]) => mockLogRedisError(...args),
}));

// Mock the Upstash Redis client
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisDel = jest.fn();
const mockRedisSadd = jest.fn();
const mockRedisSmembers = jest.fn();
const mockRedisSrem = jest.fn();
const mockRedisIncr = jest.fn();
const mockRedisIncrby = jest.fn();
const mockRedisExpire = jest.fn();
const mockRedisLrange = jest.fn();
const mockRedisLpush = jest.fn();
const mockRedisLtrim = jest.fn();
const mockRedisZadd = jest.fn();
const mockRedisZrange = jest.fn();
const mockRedisZrank = jest.fn();
const mockRedisZscore = jest.fn();
const mockRedisZcard = jest.fn();
const mockRedisHgetall = jest.fn();
const mockRedisHset = jest.fn();
const mockRedisExists = jest.fn();
const mockRedisMget = jest.fn();
const mockRedisTtl = jest.fn();

jest.mock("@upstash/redis", () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: mockRedisGet,
    set: mockRedisSet,
    del: mockRedisDel,
    sadd: mockRedisSadd,
    smembers: mockRedisSmembers,
    srem: mockRedisSrem,
    incr: mockRedisIncr,
    incrby: mockRedisIncrby,
    expire: mockRedisExpire,
    lrange: mockRedisLrange,
    lpush: mockRedisLpush,
    ltrim: mockRedisLtrim,
    zadd: mockRedisZadd,
    zrange: mockRedisZrange,
    zrank: mockRedisZrank,
    zscore: mockRedisZscore,
    zcard: mockRedisZcard,
    hgetall: mockRedisHgetall,
    hset: mockRedisHset,
    exists: mockRedisExists,
    mget: mockRedisMget,
    ttl: mockRedisTtl,
  })),
}));

// Must import after mocks are set up
import { redis } from "@/lib/redis";

beforeEach(() => {
  jest.clearAllMocks();
  // Set environment variables for redis initialization
  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test_token";
});

describe("redis error logging with logRedisError", () => {
  describe("GET operations", () => {
    it("logs error when redis.get fails", async () => {
      const testError = new Error("Connection refused");
      mockRedisGet.mockRejectedValueOnce(testError);

      const result = await redis.get("test_key");

      expect(result).toBeNull();
      expect(mockLogRedisError).toHaveBeenCalledWith("GET", "test_key", testError);
    });

    it("logs error with operation and key context", async () => {
      const testError = new Error("Timeout");
      mockRedisGet.mockRejectedValueOnce(testError);

      await redis.get("cache:profile:user123");

      expect(mockLogRedisError).toHaveBeenCalledWith(
        "GET",
        "cache:profile:user123",
        testError
      );
    });

    it("returns null when redis.get fails", async () => {
      mockRedisGet.mockRejectedValueOnce(new Error("Network error"));

      const result = await redis.get("key");

      expect(result).toBeNull();
    });

    it("succeeds normally when there is no error", async () => {
      mockRedisGet.mockResolvedValueOnce("cached_value");

      const result = await redis.get("key");

      expect(result).toBe("cached_value");
      expect(mockLogRedisError).not.toHaveBeenCalled();
    });
  });

  describe("SET operations", () => {
    it("logs error when redis.set fails", async () => {
      const testError = new Error("Out of memory");
      mockRedisSet.mockRejectedValueOnce(testError);

      const result = await redis.set("test_key", { data: "value" });

      expect(result).toBe("ERROR");
      expect(mockLogRedisError).toHaveBeenCalledWith("SET", "test_key", testError);
    });

    it("returns ERROR string when redis.set fails", async () => {
      mockRedisSet.mockRejectedValueOnce(new Error("Write failed"));

      const result = await redis.set("key", "value");

      expect(result).toBe("ERROR");
    });

    it("logs error with options when provided", async () => {
      const testError = new Error("TTL error");
      mockRedisSet.mockRejectedValueOnce(testError);

      await redis.set("key", "value", { ex: 3600 });

      expect(mockLogRedisError).toHaveBeenCalledWith("SET", "key", testError);
    });

    it("succeeds normally when there is no error", async () => {
      mockRedisSet.mockResolvedValueOnce("OK");

      const result = await redis.set("key", "value");

      expect(result).toBe("OK");
      expect(mockLogRedisError).not.toHaveBeenCalled();
    });
  });

  describe("DEL operations", () => {
    it("logs error when redis.del fails", async () => {
      const testError = new Error("Delete failed");
      mockRedisDel.mockRejectedValueOnce(testError);

      const result = await redis.del("key1", "key2");

      expect(result).toBe(0);
      expect(mockLogRedisError).toHaveBeenCalledWith("DEL", "key1,key2", testError);
    });

    it("returns 0 when redis.del fails", async () => {
      mockRedisDel.mockRejectedValueOnce(new Error("Error"));

      const result = await redis.del("key");

      expect(result).toBe(0);
    });

    it("logs multiple keys in error context", async () => {
      const testError = new Error("Failed");
      mockRedisDel.mockRejectedValueOnce(testError);

      await redis.del("key1", "key2", "key3");

      expect(mockLogRedisError).toHaveBeenCalledWith("DEL", "key1,key2,key3", testError);
    });
  });

  describe("SADD operations", () => {
    it("logs error when redis.sadd fails", async () => {
      const testError = new Error("Set add failed");
      mockRedisSadd.mockRejectedValueOnce(testError);

      const result = await redis.sadd("set_key", "member1", "member2");

      expect(result).toBe(0);
      expect(mockLogRedisError).toHaveBeenCalledWith("SADD", "set_key", testError);
    });

    it("returns 0 when redis.sadd fails", async () => {
      mockRedisSadd.mockRejectedValueOnce(new Error("Error"));

      const result = await redis.sadd("key", "value");

      expect(result).toBe(0);
    });
  });

  describe("SMEMBERS operations", () => {
    it("logs error when redis.smembers fails", async () => {
      const testError = new Error("Set members read failed");
      mockRedisSmembers.mockRejectedValueOnce(testError);

      const result = await redis.smembers("set_key");

      expect(result).toEqual([]);
      expect(mockLogRedisError).toHaveBeenCalledWith("SMEMBERS", "set_key", testError);
    });

    it("returns empty array when redis.smembers fails", async () => {
      mockRedisSmembers.mockRejectedValueOnce(new Error("Error"));

      const result = await redis.smembers("key");

      expect(result).toEqual([]);
    });
  });

  describe("SREM operations", () => {
    it("logs error when redis.srem fails", async () => {
      const testError = new Error("Set remove failed");
      mockRedisSrem.mockRejectedValueOnce(testError);

      const result = await redis.srem("set_key", "member1", "member2");

      expect(result).toBe(0);
      expect(mockLogRedisError).toHaveBeenCalledWith("SREM", "set_key", testError);
    });

    it("returns 0 when redis.srem fails", async () => {
      mockRedisSrem.mockRejectedValueOnce(new Error("Error"));

      const result = await redis.srem("key", "member");

      expect(result).toBe(0);
    });
  });

  describe("INCR operations", () => {
    it("logs error when redis.incr fails", async () => {
      const testError = new Error("Increment failed");
      mockRedisIncr.mockRejectedValueOnce(testError);

      const result = await redis.incr("counter_key");

      expect(result).toBe(0);
      expect(mockLogRedisError).toHaveBeenCalledWith("INCR", "counter_key", testError);
    });

    it("returns 0 when redis.incr fails", async () => {
      mockRedisIncr.mockRejectedValueOnce(new Error("Error"));

      const result = await redis.incr("key");

      expect(result).toBe(0);
    });
  });

  describe("INCRBY operations", () => {
    it("logs error when redis.incrby fails", async () => {
      const testError = new Error("Increment by failed");
      mockRedisIncrby.mockRejectedValueOnce(testError);

      const result = await redis.incrby("counter_key", 5);

      expect(result).toBe(0);
      expect(mockLogRedisError).toHaveBeenCalledWith("INCRBY", "counter_key", testError);
    });

    it("returns 0 when redis.incrby fails", async () => {
      mockRedisIncrby.mockRejectedValueOnce(new Error("Error"));

      const result = await redis.incrby("key", 10);

      expect(result).toBe(0);
    });
  });

  describe("EXPIRE operations", () => {
    it("logs error when redis.expire fails", async () => {
      const testError = new Error("Expire failed");
      mockRedisExpire.mockRejectedValueOnce(testError);

      const result = await redis.expire("key", 3600);

      expect(result).toBe(0);
      expect(mockLogRedisError).toHaveBeenCalledWith("EXPIRE", "key", testError);
    });

    it("returns 0 when redis.expire fails", async () => {
      mockRedisExpire.mockRejectedValueOnce(new Error("Error"));

      const result = await redis.expire("key", 60);

      expect(result).toBe(0);
    });
  });

  describe("LRANGE operations", () => {
    it("logs error when redis.lrange fails", async () => {
      const testError = new Error("List range failed");
      mockRedisLrange.mockRejectedValueOnce(testError);

      const result = await redis.lrange("list_key", 0, -1);

      expect(result).toEqual([]);
      expect(mockLogRedisError).toHaveBeenCalledWith("LRANGE", "list_key", testError);
    });

    it("returns empty array when redis.lrange fails", async () => {
      mockRedisLrange.mockRejectedValueOnce(new Error("Error"));

      const result = await redis.lrange("key", 0, 10);

      expect(result).toEqual([]);
    });
  });

  describe("LPUSH operations", () => {
    it("logs error when redis.lpush fails", async () => {
      const testError = new Error("List push failed");
      mockRedisLpush.mockRejectedValueOnce(testError);

      const result = await redis.lpush("list_key", "value1", "value2");

      expect(result).toBe(0);
      expect(mockLogRedisError).toHaveBeenCalledWith("LPUSH", "list_key", testError);
    });

    it("returns 0 when redis.lpush fails", async () => {
      mockRedisLpush.mockRejectedValueOnce(new Error("Error"));

      const result = await redis.lpush("key", "value");

      expect(result).toBe(0);
    });
  });

  describe("LTRIM operations", () => {
    it("logs error when redis.ltrim fails", async () => {
      const testError = new Error("List trim failed");
      mockRedisLtrim.mockRejectedValueOnce(testError);

      const result = await redis.ltrim("list_key", 0, 100);

      expect(result).toBe("ERROR");
      expect(mockLogRedisError).toHaveBeenCalledWith("LTRIM", "list_key", testError);
    });

    it("returns ERROR string when redis.ltrim fails", async () => {
      mockRedisLtrim.mockRejectedValueOnce(new Error("Error"));

      const result = await redis.ltrim("key", 0, 10);

      expect(result).toBe("ERROR");
    });
  });

  describe("ZADD operations", () => {
    it("logs error when redis.zadd fails", async () => {
      const testError = new Error("Sorted set add failed");
      mockRedisZadd.mockRejectedValueOnce(testError);

      const result = await (redis.zadd as any)("zset_key", 1, "member1", 2, "member2");

      expect(result).toBe(0);
      expect(mockLogRedisError).toHaveBeenCalledWith("ZADD", "zset_key", testError);
    });

    it("returns 0 when redis.zadd fails", async () => {
      mockRedisZadd.mockRejectedValueOnce(new Error("Error"));

      const result = await (redis.zadd as any)("key", 1, "member");

      expect(result).toBe(0);
    });
  });

  describe("ZRANGE operations", () => {
    it("logs error when redis.zrange fails", async () => {
      const testError = new Error("Sorted set range failed");
      mockRedisZrange.mockRejectedValueOnce(testError);

      const result = await redis.zrange("zset_key", 0, -1);

      expect(result).toEqual([]);
      expect(mockLogRedisError).toHaveBeenCalledWith("ZRANGE", "zset_key", testError);
    });

    it("returns empty array when redis.zrange fails", async () => {
      mockRedisZrange.mockRejectedValueOnce(new Error("Error"));

      const result = await redis.zrange("key", 0, 10);

      expect(result).toEqual([]);
    });
  });

  describe("ZRANK operations", () => {
    it("logs error when redis.zrank fails", async () => {
      const testError = new Error("Sorted set rank failed");
      mockRedisZrank.mockRejectedValueOnce(testError);

      const result = await redis.zrank("zset_key", "member");

      expect(result).toBeNull();
      expect(mockLogRedisError).toHaveBeenCalledWith("ZRANK", "zset_key", testError);
    });

    it("returns null when redis.zrank fails", async () => {
      mockRedisZrank.mockRejectedValueOnce(new Error("Error"));

      const result = await redis.zrank("key", "member");

      expect(result).toBeNull();
    });
  });

  describe("ZSCORE operations", () => {
    it("logs error when redis.zscore fails", async () => {
      const testError = new Error("Sorted set score failed");
      mockRedisZscore.mockRejectedValueOnce(testError);

      const result = await redis.zscore("zset_key", "member");

      expect(result).toBeNull();
      expect(mockLogRedisError).toHaveBeenCalledWith("ZSCORE", "zset_key", testError);
    });

    it("returns null when redis.zscore fails", async () => {
      mockRedisZscore.mockRejectedValueOnce(new Error("Error"));

      const result = await redis.zscore("key", "member");

      expect(result).toBeNull();
    });
  });

  describe("ZCARD operations", () => {
    it("logs error when redis.zcard fails", async () => {
      const testError = new Error("Sorted set card failed");
      mockRedisZcard.mockRejectedValueOnce(testError);

      const result = await redis.zcard("zset_key");

      expect(result).toBe(0);
      expect(mockLogRedisError).toHaveBeenCalledWith("ZCARD", "zset_key", testError);
    });

    it("returns 0 when redis.zcard fails", async () => {
      mockRedisZcard.mockRejectedValueOnce(new Error("Error"));

      const result = await redis.zcard("key");

      expect(result).toBe(0);
    });
  });

  describe("HGETALL operations", () => {
    it("logs error when redis.hgetall fails", async () => {
      const testError = new Error("Hash get all failed");
      mockRedisHgetall.mockRejectedValueOnce(testError);

      const result = await redis.hgetall("hash_key");

      expect(result).toBeNull();
      expect(mockLogRedisError).toHaveBeenCalledWith("HGETALL", "hash_key", testError);
    });

    it("returns null when redis.hgetall fails", async () => {
      mockRedisHgetall.mockRejectedValueOnce(new Error("Error"));

      const result = await redis.hgetall("key");

      expect(result).toBeNull();
    });
  });

  describe("HSET operations", () => {
    it("logs error when redis.hset fails", async () => {
      const testError = new Error("Hash set failed");
      mockRedisHset.mockRejectedValueOnce(testError);

      const result = await (redis.hset as any)("hash_key", "field", "value");

      expect(result).toBe(0);
      expect(mockLogRedisError).toHaveBeenCalledWith("HSET", "hash_key", testError);
    });

    it("returns 0 when redis.hset fails", async () => {
      mockRedisHset.mockRejectedValueOnce(new Error("Error"));

      const result = await (redis.hset as any)("key", "field", "value");

      expect(result).toBe(0);
    });
  });

  describe("EXISTS operations", () => {
    it("logs error when redis.exists fails", async () => {
      const testError = new Error("Exists check failed");
      mockRedisExists.mockRejectedValueOnce(testError);

      const result = await redis.exists("key1", "key2");

      expect(result).toBe(0);
      expect(mockLogRedisError).toHaveBeenCalledWith("EXISTS", "key1,key2", testError);
    });

    it("returns 0 when redis.exists fails", async () => {
      mockRedisExists.mockRejectedValueOnce(new Error("Error"));

      const result = await redis.exists("key");

      expect(result).toBe(0);
    });
  });

  describe("MGET operations", () => {
    it("logs error when redis.mget fails", async () => {
      const testError = new Error("Multi get failed");
      mockRedisMget.mockRejectedValueOnce(testError);

      const result = await redis.mget("key1", "key2", "key3");

      expect(result).toEqual([null, null, null]);
      expect(mockLogRedisError).toHaveBeenCalledWith("MGET", "key1,key2,key3", testError);
    });

    it("returns array of nulls matching key count when redis.mget fails", async () => {
      mockRedisMget.mockRejectedValueOnce(new Error("Error"));

      const result = await redis.mget("key1", "key2");

      expect(result).toEqual([null, null]);
    });
  });

  describe("TTL operations", () => {
    it("logs error when redis.ttl fails", async () => {
      const testError = new Error("TTL check failed");
      mockRedisTtl.mockRejectedValueOnce(testError);

      const result = await redis.ttl("key");

      expect(result).toBe(-1);
      expect(mockLogRedisError).toHaveBeenCalledWith("TTL", "key", testError);
    });

    it("returns -1 when redis.ttl fails", async () => {
      mockRedisTtl.mockRejectedValueOnce(new Error("Error"));

      const result = await redis.ttl("key");

      expect(result).toBe(-1);
    });
  });

  describe("error logging with logRedisError integration", () => {
    it("logs operation type in error context", async () => {
      const testError = new Error("Connection error");
      mockRedisGet.mockRejectedValueOnce(testError);

      await redis.get("my_key");

      expect(mockLogRedisError).toHaveBeenCalledWith(
        expect.stringMatching(/GET/),
        expect.any(String),
        expect.any(Error)
      );
    });

    it("logs key in error context", async () => {
      const testError = new Error("Key not found");
      mockRedisSet.mockRejectedValueOnce(testError);

      await redis.set("specific_key", "value");

      expect(mockLogRedisError).toHaveBeenCalledWith(
        expect.any(String),
        "specific_key",
        expect.any(Error)
      );
    });

    it("logs error object in error context", async () => {
      const testError = new Error("Redis error message");
      mockRedisGet.mockRejectedValueOnce(testError);

      await redis.get("key");

      expect(mockLogRedisError).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        testError
      );
    });

    it("logs string errors as well", async () => {
      mockRedisGet.mockRejectedValueOnce("String error");

      await redis.get("key");

      expect(mockLogRedisError).toHaveBeenCalledWith(
        "GET",
        "key",
        "String error"
      );
    });
  });

  describe("success path - no logging on success", () => {
    it("does not call logRedisError on successful GET", async () => {
      mockRedisGet.mockResolvedValueOnce("value");

      await redis.get("key");

      expect(mockLogRedisError).not.toHaveBeenCalled();
    });

    it("does not call logRedisError on successful SET", async () => {
      mockRedisSet.mockResolvedValueOnce("OK");

      await redis.set("key", "value");

      expect(mockLogRedisError).not.toHaveBeenCalled();
    });

    it("does not call logRedisError on successful DEL", async () => {
      mockRedisDel.mockResolvedValueOnce(1);

      await redis.del("key");

      expect(mockLogRedisError).not.toHaveBeenCalled();
    });

    it("does not call logRedisError on successful SADD", async () => {
      mockRedisSadd.mockResolvedValueOnce(1);

      await redis.sadd("key", "member");

      expect(mockLogRedisError).not.toHaveBeenCalled();
    });
  });
});
