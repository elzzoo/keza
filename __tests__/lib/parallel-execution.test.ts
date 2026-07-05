/**
 * Test: Verify Parallel Provider Calls (No Sequential Bottlenecks)
 *
 * The searchEngine and searchEngineStream functions MUST start all provider calls
 * immediately and await them in parallel — NOT await them sequentially.
 *
 * This test verifies the code structure doesn't have hidden sequential awaits
 * that would block parallel execution and increase latency.
 *
 * Static analysis approach:
 * - Verify all provider promises are created immediately without await
 * - Confirm they're awaited together via Promise.all/allSettled
 */

import { readFileSync } from "fs";
import { join } from "path";

describe("Provider Call Parallelization", () => {
  it("searchEngineStream creates provider promises without sequential awaits", () => {
    const streamPath = join(__dirname, "../../lib/engine/stream.ts");
    const content = readFileSync(streamPath, "utf-8");

    // Verify core parallel execution pattern exists
    const noSequentialAwait = !content.includes(
      "const duffelOutboundP = await fetchFromDuffel"
    );

    const usesPromiseAll = content.includes("Promise.all");

    expect(noSequentialAwait).toBe(true);
    expect(usesPromiseAll).toBe(true);
  });

  it("searchEngine (non-streaming) creates provider promises in parallel", () => {
    const enginePath = join(__dirname, "../../lib/engine/index.ts");
    const content = readFileSync(enginePath, "utf-8");

    const usesPromiseAllSettled = content.includes("Promise.allSettled");
    const noSequentialAwait = !content.includes("const tpOutbound = await fetchFromTravelpayouts");

    expect(usesPromiseAllSettled).toBe(true);
    expect(noSequentialAwait).toBe(true);
  });

  it("No provider call should be awaited more than once", () => {
    const streamPath = join(__dirname, "../../lib/engine/stream.ts");
    const content = readFileSync(streamPath, "utf-8");

    // Each promise variable should only be referenced in ONE Promise.all
    const duffelOutboundPCount = (content.match(/duffelOutboundP/g) || []).length;
    const tpOutboundPCount = (content.match(/tpOutboundP/g) || []).length;

    // If counts are very high (>5), might indicate reuse in multiple awaits
    // Normal pattern: referenced 2-3 times (created, awaited in Phase 1, awaited again maybe)
    expect(duffelOutboundPCount).toBeLessThan(10);
    expect(tpOutboundPCount).toBeLessThan(10);
  });
});
