import "server-only";
import { Redis } from "@upstash/redis";
import { logRedisError } from "./logger";

// Lazily create the Redis client so the module can be imported at build time
// without crashing when env vars are placeholders. The error surfaces at
// request time (inside searchEngine) rather than during `next build`.
let _redis: Redis | null = null;

function getRedis(): Redis {
  if (_redis) return _redis;

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !url.startsWith("https://") || !token || token === "xxx") {
    throw new Error(
      "Upstash Redis is not configured. " +
      "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your environment."
    );
  }

  _redis = new Redis({ url, token });
  return _redis;
}

// Wrapper functions that log errors
export async function safeGet<T = unknown>(key: string): Promise<T | null> {
  try {
    const client = getRedis();
    return await client.get<T>(key);
  } catch (err) {
    logRedisError("GET", key, err);
    return null;
  }
}

export async function safeSet(key: string, value: unknown, options?: { ex?: number }): Promise<string> {
  try {
    const client = getRedis();
    const result = await client.set(key, value, options as Parameters<typeof client.set>[2]);
    return result === "OK" ? "OK" : "ERROR";
  } catch (err) {
    logRedisError("SET", key, err);
    return "ERROR";
  }
}

async function safeDel(...keys: string[]): Promise<number> {
  try {
    const client = getRedis();
    return await client.del(...keys);
  } catch (err) {
    logRedisError("DEL", keys.join(","), err);
    return 0;
  }
}

async function safeSadd(key: string, ...members: unknown[]): Promise<number> {
  try {
    const client = getRedis();
    return await (client.sadd as (key: string, ...members: unknown[]) => Promise<number>)(key, ...members);
  } catch (err) {
    logRedisError("SADD", key, err);
    return 0;
  }
}

async function safeSmembers<T = unknown>(key: string): Promise<T[]> {
  try {
    const client = getRedis();
    const result = await client.smembers(key);
    return (result ?? []) as T[];
  } catch (err) {
    logRedisError("SMEMBERS", key, err);
    return [];
  }
}

async function safeSrem(key: string, ...members: unknown[]): Promise<number> {
  try {
    const client = getRedis();
    return await (client.srem as (key: string, ...members: unknown[]) => Promise<number>)(key, ...members);
  } catch (err) {
    logRedisError("SREM", key, err);
    return 0;
  }
}

async function safeIncr(key: string): Promise<number> {
  try {
    const client = getRedis();
    return await client.incr(key);
  } catch (err) {
    logRedisError("INCR", key, err);
    return 0;
  }
}

async function safeIncrby(key: string, increment: number): Promise<number> {
  try {
    const client = getRedis();
    return await client.incrby(key, increment);
  } catch (err) {
    logRedisError("INCRBY", key, err);
    return 0;
  }
}

async function safeExpire(key: string, seconds: number): Promise<number> {
  try {
    const client = getRedis();
    return await client.expire(key, seconds);
  } catch (err) {
    logRedisError("EXPIRE", key, err);
    return 0;
  }
}

async function safeLrange<T = unknown>(key: string, start: number, stop: number): Promise<T[]> {
  try {
    const client = getRedis();
    const result = await client.lrange(key, start, stop);
    return (result ?? []) as T[];
  } catch (err) {
    logRedisError("LRANGE", key, err);
    return [];
  }
}

async function safeLpush(key: string, ...values: unknown[]): Promise<number> {
  try {
    const client = getRedis();
    return await (client.lpush as (key: string, ...values: unknown[]) => Promise<number>)(key, ...values);
  } catch (err) {
    logRedisError("LPUSH", key, err);
    return 0;
  }
}

async function safeLtrim(key: string, start: number, stop: number): Promise<string> {
  try {
    const client = getRedis();
    return await client.ltrim(key, start, stop);
  } catch (err) {
    logRedisError("LTRIM", key, err);
    return "ERROR";
  }
}

async function safeZadd(key: string, ...options: unknown[]): Promise<number> {
  try {
    const client = getRedis();
    return await (client.zadd as (key: string, ...options: unknown[]) => Promise<number>)(key, ...options);
  } catch (err) {
    logRedisError("ZADD", key, err);
    return 0;
  }
}

async function safeZrange<T = unknown>(
  key: string,
  start: number,
  stop: number,
  options?: { withScores?: boolean; rev?: boolean }
): Promise<T[]> {
  try {
    const client = getRedis();
    // Upstash Redis zrange with standard numeric indices
    // Cast to the basic overload signature that accepts key, start, stop, options
    type ZrangeFn = (key: string, start: number, stop: number, opts?: Record<string, unknown>) => Promise<unknown>;
    const result = await (client.zrange as unknown as ZrangeFn)(key, start, stop, options);
    return (result ?? []) as T[];
  } catch (err) {
    logRedisError("ZRANGE", key, err);
    return [];
  }
}

async function safeZrank(key: string, member: unknown): Promise<number | null> {
  try {
    const client = getRedis();
    const result = await client.zrank(key, member);
    return (result ?? null) as number | null;
  } catch (err) {
    logRedisError("ZRANK", key, err);
    return null;
  }
}

async function safeZscore(key: string, member: unknown): Promise<number | null> {
  try {
    const client = getRedis();
    return await client.zscore(key, member);
  } catch (err) {
    logRedisError("ZSCORE", key, err);
    return null;
  }
}

async function safeZcard(key: string): Promise<number> {
  try {
    const client = getRedis();
    return await client.zcard(key);
  } catch (err) {
    logRedisError("ZCARD", key, err);
    return 0;
  }
}

async function safeHgetall<T extends Record<string, unknown> = Record<string, unknown>>(key: string): Promise<T | null> {
  try {
    const client = getRedis();
    return await client.hgetall<T>(key);
  } catch (err) {
    logRedisError("HGETALL", key, err);
    return null;
  }
}

async function safeHset(key: string, ...options: unknown[]): Promise<number> {
  try {
    const client = getRedis();
    return await (client.hset as (key: string, ...options: unknown[]) => Promise<number>)(key, ...options);
  } catch (err) {
    logRedisError("HSET", key, err);
    return 0;
  }
}

async function safeExists(...keys: string[]): Promise<number> {
  try {
    const client = getRedis();
    return await client.exists(...keys);
  } catch (err) {
    logRedisError("EXISTS", keys.join(","), err);
    return 0;
  }
}

async function safeMget<T = unknown>(...keys: string[]): Promise<(T | null)[]> {
  try {
    const client = getRedis();
    const result = await client.mget(...keys);
    return (result ?? keys.map(() => null)) as (T | null)[];
  } catch (err) {
    logRedisError("MGET", keys.join(","), err);
    return keys.map(() => null);
  }
}

async function safeTtl(key: string): Promise<number> {
  try {
    const client = getRedis();
    return await client.ttl(key);
  } catch (err) {
    logRedisError("TTL", key, err);
    return -1;
  }
}

// Create a wrapper object that mimics Redis interface with error-safe methods
export const redis: Redis = new Proxy({} as Redis, {
  get(_target, prop) {
    // Return error-safe wrappers for known methods
    switch (prop) {
      case "get":
        return safeGet;
      case "set":
        return safeSet;
      case "del":
        return safeDel;
      case "sadd":
        return safeSadd;
      case "smembers":
        return safeSmembers;
      case "srem":
        return safeSrem;
      case "incr":
        return safeIncr;
      case "incrby":
        return safeIncrby;
      case "expire":
        return safeExpire;
      case "lrange":
        return safeLrange;
      case "lpush":
        return safeLpush;
      case "ltrim":
        return safeLtrim;
      case "zadd":
        return safeZadd;
      case "zrange":
        return safeZrange;
      case "zrank":
        return safeZrank;
      case "zscore":
        return safeZscore;
      case "zcard":
        return safeZcard;
      case "hgetall":
        return safeHgetall;
      case "hset":
        return safeHset;
      case "exists":
        return safeExists;
      case "mget":
        return safeMget;
      case "ttl":
        return safeTtl;
      default:
        // For any other methods not wrapped, use the original client
        const client = getRedis();
        const value = (client as unknown as Record<string | symbol, unknown>)[prop];
        return typeof value === "function" ? value.bind(client) : value;
    }
  },
});
