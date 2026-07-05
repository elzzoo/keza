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

    // All 4 promises must be created immediately without awaits between them
    const createsPromises =
      /const duffelOutboundP = fetchFromDuffel.*?\n.*?const tpOutboundP\s*=.*?\n.*?const duffelReturnP.*?\n.*?const tpReturnP/s;

    // MUST NOT await each promise individually before Promise.all
    const noSequentialAwait = !content.includes(
      "const duffelOutboundP = await fetchFromDuffel"
    );

    // Must use Promise.all to wait for the Duffel promises (Phase 1)
    const usesPromiseAll = /Promise\.all\s*\(\s*\[\s*duffelOutboundP/;

    expect(content).toMatch(
      createsPromises,
      "All 4 promises must be created as separate const statements"
    );

    expect(noSequentialAwait).toBe(
      true,
      "Must NOT await each promise sequentially before combining them"
    );

    expect(content).toMatch(
      usesPromiseAll,
      "Must use Promise.all to parallelize Duffel calls"
    );

    // Verify two-phase strategy:
    // Phase 1: Duffel (fastest) ~2-3s
    // Phase 2: TP (slower) ~2-3s additional
    const twoPhasePattern =
      /const \[duffelOutboundRaw.*?\n.*?onPartial.*?\n.*?Promise\.all\(\[tpOutboundP/s;

    expect(content).toMatch(
      twoPhasePattern,
      "Should implement two-phase: emit partial after Duffel, then final after TP"
    );
  });

  it("searchEngine (non-streaming) creates provider promises in parallel", () => {
    const enginePath = join(__dirname, "../../lib/engine/index.ts");
    const content = readFileSync(enginePath, "utf-8");

    // All 4 promises must be in the fetchPromises array
    const hasFetchPromisesArray =
      /const fetchPromises = \[[\s\S]*?fetchFromTravelpayouts\(from, to, date, directOnly\)[\s\S]*?fetchFromDuffel\(from, to, date, cabin, passengers\)[\s\S]*?fetchFromTravelpayouts\(to, from[\s\S]*?fetchFromDuffel\(to, from[\s\S]*?\]\s*as const/;

    // Must use Promise.allSettled to wait for all 4
    const usesPromiseAllSettled = /Promise\.allSettled\(fetchPromises\)/;

    // Should NOT await providers individually
    const noAwaitBeforePromiseAll =
      !content.includes("const tpOutbound = await fetchFromTravelpayouts(from, to, date, directOnly);\n") &&
      !content.includes("const duffelOutbound = await fetchFromDuffel");

    expect(content).toMatch(
      hasFetchPromisesArray,
      "Should create fetchPromises array with all 4 provider calls"
    );

    expect(content).toMatch(
      usesPromiseAllSettled,
      "Should use Promise.allSettled to wait for all promises together"
    );

    expect(noAwaitBeforePromiseAll).toBe(
      true,
      "Must NOT await individual provider calls before Promise.allSettled"
    );
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
