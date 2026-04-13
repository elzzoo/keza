import "server-only";
import { Redis } from "@upstash/redis";

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

// Proxy object — behaves like a Redis instance, but initializes lazily
export const redis: Redis = new Proxy({} as Redis, {
  get(_target, prop) {
    const client = getRedis();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
