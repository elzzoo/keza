import "server-only";
import { Redis } from "@upstash/redis";
import { logRedisError, logWarn } from "./logger";
import * as Sentry from "@sentry/nextjs";

// Lazily create the Redis client so the module can be imported at build time
// without crashing when env vars are placeholders. The error surfaces at
// request time (inside searchEngine) rather than during `next build`.
let _redis: Redis | null = null;

export function redisKeyPrefix(): string {
  const raw = process.env.NEXT_REDIS_PREFIX ?? process.env.REDIS_KEY_PREFIX ?? "";
  return raw.trim().replace(/:+$/, "");
}

export function prefixRedisKey(key: string): string {
  const prefix = redisKeyPrefix();
  if (!prefix || key.startsWith(`${prefix}:`)) return key;
  return `${prefix}:${key}`;
}

function prefixRedisKeys(keys: string[]): string[] {
  return keys.map(prefixRedisKey);
}

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
  const redisKey = prefixRedisKey(key);
  try {
    const client = getRedis();
    return await client.get<T>(redisKey);
  } catch (err) {
    logRedisError("GET", redisKey, err);
    return null;
  }
}

export async function safeSet(key: string, value: unknown, options?: { ex?: number; nx?: boolean; xx?: boolean }): Promise<string | null> {
  const redisKey = prefixRedisKey(key);
  try {
    const client = getRedis();
    const result = await client.set(redisKey, value, options as Parameters<typeof client.set>[2]);
    // Returns "OK" on success, null when nx/xx condition not met
    return result === "OK" ? "OK" : null;
  } catch (err) {
    logRedisError("SET", redisKey, err);
    return "ERROR";
  }
}

async function safeDel(...keys: string[]): Promise<number> {
  const redisKeys = prefixRedisKeys(keys);
  try {
    const client = getRedis();
    return await client.del(...redisKeys);
  } catch (err) {
    logRedisError("DEL", redisKeys.join(","), err);
    return 0;
  }
}

async function safeSadd(key: string, ...members: unknown[]): Promise<number> {
  const redisKey = prefixRedisKey(key);
  try {
    const client = getRedis();
    return await (client.sadd as (key: string, ...members: unknown[]) => Promise<number>)(redisKey, ...members);
  } catch (err) {
    logRedisError("SADD", redisKey, err);
    return 0;
  }
}

async function safeSmembers<T = unknown>(key: string): Promise<T[]> {
  const redisKey = prefixRedisKey(key);
  try {
    const client = getRedis();
    const result = await client.smembers(redisKey);
    return (result ?? []) as T[];
  } catch (err) {
    logRedisError("SMEMBERS", redisKey, err);
    return [];
  }
}

async function safeSrem(key: string, ...members: unknown[]): Promise<number> {
  const redisKey = prefixRedisKey(key);
  try {
    const client = getRedis();
    return await (client.srem as (key: string, ...members: unknown[]) => Promise<number>)(redisKey, ...members);
  } catch (err) {
    logRedisError("SREM", redisKey, err);
    return 0;
  }
}

async function safeIncr(key: string): Promise<number> {
  const redisKey = prefixRedisKey(key);
  try {
    const client = getRedis();
    return await client.incr(redisKey);
  } catch (err) {
    logRedisError("INCR", redisKey, err);
    return 0;
  }
}

async function safeIncrby(key: string, increment: number): Promise<number> {
  const redisKey = prefixRedisKey(key);
  try {
    const client = getRedis();
    return await client.incrby(redisKey, increment);
  } catch (err) {
    logRedisError("INCRBY", redisKey, err);
    return 0;
  }
}

async function safeExpire(key: string, seconds: number): Promise<number> {
  const redisKey = prefixRedisKey(key);
  try {
    const client = getRedis();
    return await client.expire(redisKey, seconds);
  } catch (err) {
    logRedisError("EXPIRE", redisKey, err);
    return 0;
  }
}

async function safeLrange<T = unknown>(key: string, start: number, stop: number): Promise<T[]> {
  const redisKey = prefixRedisKey(key);
  try {
    const client = getRedis();
    const result = await client.lrange(redisKey, start, stop);
    return (result ?? []) as T[];
  } catch (err) {
    logRedisError("LRANGE", redisKey, err);
    return [];
  }
}

async function safeLpush(key: string, ...values: unknown[]): Promise<number> {
  const redisKey = prefixRedisKey(key);
  try {
    const client = getRedis();
    return await (client.lpush as (key: string, ...values: unknown[]) => Promise<number>)(redisKey, ...values);
  } catch (err) {
    logRedisError("LPUSH", redisKey, err);
    return 0;
  }
}

async function safeLtrim(key: string, start: number, stop: number): Promise<string> {
  const redisKey = prefixRedisKey(key);
  try {
    const client = getRedis();
    return await client.ltrim(redisKey, start, stop);
  } catch (err) {
    logRedisError("LTRIM", redisKey, err);
    return "ERROR";
  }
}

async function safeZadd(key: string, ...options: unknown[]): Promise<number> {
  const redisKey = prefixRedisKey(key);
  try {
    const client = getRedis();
    return await (client.zadd as (key: string, ...options: unknown[]) => Promise<number>)(redisKey, ...options);
  } catch (err) {
    logRedisError("ZADD", redisKey, err);
    return 0;
  }
}

async function safeZrange<T = unknown>(
  key: string,
  start: number,
  stop: number,
  options?: { withScores?: boolean; rev?: boolean }
): Promise<T[]> {
  const redisKey = prefixRedisKey(key);
  try {
    const client = getRedis();
    // Upstash Redis zrange with standard numeric indices
    // Cast to the basic overload signature that accepts key, start, stop, options
    type ZrangeFn = (key: string, start: number, stop: number, opts?: Record<string, unknown>) => Promise<unknown>;
    const result = await (client.zrange as unknown as ZrangeFn)(redisKey, start, stop, options);
    return (result ?? []) as T[];
  } catch (err) {
    logRedisError("ZRANGE", redisKey, err);
    return [];
  }
}

async function safeZrank(key: string, member: unknown): Promise<number | null> {
  const redisKey = prefixRedisKey(key);
  try {
    const client = getRedis();
    const result = await client.zrank(redisKey, member);
    return (result ?? null) as number | null;
  } catch (err) {
    logRedisError("ZRANK", redisKey, err);
    return null;
  }
}

async function safeZscore(key: string, member: unknown): Promise<number | null> {
  const redisKey = prefixRedisKey(key);
  try {
    const client = getRedis();
    return await client.zscore(redisKey, member);
  } catch (err) {
    logRedisError("ZSCORE", redisKey, err);
    return null;
  }
}

async function safeZcard(key: string): Promise<number> {
  const redisKey = prefixRedisKey(key);
  try {
    const client = getRedis();
    return await client.zcard(redisKey);
  } catch (err) {
    logRedisError("ZCARD", redisKey, err);
    return 0;
  }
}

async function safeHgetall<T extends Record<string, unknown> = Record<string, unknown>>(key: string): Promise<T | null> {
  const redisKey = prefixRedisKey(key);
  try {
    const client = getRedis();
    return await client.hgetall<T>(redisKey);
  } catch (err) {
    logRedisError("HGETALL", redisKey, err);
    return null;
  }
}

async function safeHset(key: string, ...options: unknown[]): Promise<number> {
  const redisKey = prefixRedisKey(key);
  try {
    const client = getRedis();
    return await (client.hset as (key: string, ...options: unknown[]) => Promise<number>)(redisKey, ...options);
  } catch (err) {
    logRedisError("HSET", redisKey, err);
    return 0;
  }
}

async function safeExists(...keys: string[]): Promise<number> {
  const redisKeys = prefixRedisKeys(keys);
  try {
    const client = getRedis();
    return await client.exists(...redisKeys);
  } catch (err) {
    logRedisError("EXISTS", redisKeys.join(","), err);
    return 0;
  }
}

async function safeMget<T = unknown>(...keys: string[]): Promise<(T | null)[]> {
  const redisKeys = prefixRedisKeys(keys);
  try {
    const client = getRedis();
    const result = await client.mget(...redisKeys);
    return (result ?? keys.map(() => null)) as (T | null)[];
  } catch (err) {
    logRedisError("MGET", redisKeys.join(","), err);
    return keys.map(() => null);
  }
}

async function safeTtl(key: string): Promise<number> {
  const redisKey = prefixRedisKey(key);
  try {
    const client = getRedis();
    return await client.ttl(redisKey);
  } catch (err) {
    logRedisError("TTL", redisKey, err);
    return -1;
  }
}

/**
 * Get a value from Redis with exponential backoff retry logic.
 * Retries up to 2x with 100ms backoff on failure before returning null.
 * Logs retry attempts to Sentry to track Redis resilience issues.
 *
 * @template T The expected type of the cached value
 * @param key The Redis key to retrieve
 * @returns The cached value, or null if not found or after all retries fail
 */
async function getWithRetry<T = unknown>(key: string, retries: number = 2): Promise<T | null> {
  const redisKey = prefixRedisKey(key);
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const client = getRedis();
      return await client.get<T>(redisKey);
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        const backoffMs = Math.pow(2, attempt) * 100; // 100ms, 200ms
        logWarn(`[Redis GET retry ${attempt + 1}/${retries}]`, redisKey, { backoffMs });
        Sentry.captureMessage(`Redis GET retry attempt ${attempt + 1}`, "warning");
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }
  // All retries exhausted
  logRedisError("GET_EXHAUSTED", redisKey, lastErr);
  return null;
}

// Create a wrapper object that mimics Redis interface with error-safe methods
export const redis: Redis = new Proxy({} as Redis, {
  get(_target, prop) {
    // Return error-safe wrappers for known methods
    switch (prop) {
      case "get":
        return safeGet;
      case "getWithRetry":
        return getWithRetry;
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
