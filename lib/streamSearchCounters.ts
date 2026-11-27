import "server-only";

import { redis } from "@/lib/redis";
import { logWarn } from "@/lib/logger";

// The counters behind /api/stats, the admin table and trending routes.
// /api/search increments them inline; the search form uses the stream route.
export async function countStreamSearch(from: string, to: string): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  const searchesKey = `keza:stats:searches:${day}`;
  const routesKey = `keza:stats:routes:${day}`;
  try {
    await Promise.all([
      redis.incr(searchesKey).then(() => redis.expire(searchesKey, 30 * 24 * 60 * 60)),
      redis.zincrby(routesKey, 1, `${from}-${to}`).then(() => redis.expire(routesKey, 7 * 24 * 60 * 60)),
    ]);
  } catch (err) {
    logWarn("[search/stream] stats tracking failed", String(err), { route: `${from}-${to}` });
  }
}
