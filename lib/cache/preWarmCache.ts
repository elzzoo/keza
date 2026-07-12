/**
 * Pre-warm Redis cache for hot routes
 * Runs periodically to ensure popular searches are cached and fast
 */

import { searchEngine } from "@/lib/engine";
import { logError } from "@/lib/logger";

const HOT_ROUTES = [
  { from: "SIN", to: "LAX", description: "Singapore ↔ Los Angeles" },
  { from: "NRT", to: "LAX", description: "Tokyo ↔ Los Angeles" },
  { from: "DXB", to: "LHR", description: "Dubai ↔ London" },
];

export async function preWarmCache() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);

  console.log(`[preWarm] Starting cache pre-warm for hot routes (${dateStr})`);

  for (const route of HOT_ROUTES) {
    try {
      await searchEngine({
        from: route.from,
        to: route.to,
        date: dateStr,
        cabin: "economy",
        passengers: 1,
      });
      console.log(`[preWarm] ✓ ${route.description}`);
    } catch (err) {
      logError(`[preWarm] ✗ Failed to warm ${route.description}`, err instanceof Error ? err : new Error(String(err)), {
        route: `${route.from}-${route.to}`,
      });
    }
  }

  console.log(`[preWarm] Cache pre-warm complete (${HOT_ROUTES.length} routes)`);
}

export const preWarmCacheEvent = {
  name: "cache/preWarm",
  handler: preWarmCache,
};
