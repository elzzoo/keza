#!/usr/bin/env node

/**
 * KEZA Search Latency Benchmark
 *
 * Usage:
 *   node scripts/benchmark-search.mjs [baseUrl] [route] [count]
 *
 * Examples:
 *   node scripts/benchmark-search.mjs http://localhost:3000 SIN-LAX 10
 *   node scripts/benchmark-search.mjs https://keza-taupe.vercel.app CDG-JFK 20
 *
 * Records p50, p95, p99 latencies for the search endpoint.
 * Also measures provider source (Duffel vs Travelpayouts).
 */

import fetch from "node-fetch";

const baseUrl = process.argv[2] || "http://localhost:3000";
const routeArg = process.argv[3] || "SIN-LAX";
const count = parseInt(process.argv[4] || "10", 10);

// Parse route
const [from, to] = routeArg.split("-");
if (!from || !to) {
  console.error("Invalid route format. Use FROM-TO (e.g., SIN-LAX)");
  process.exit(1);
}

// Future date (30 days out to avoid past dates)
const departDate = new Date();
departDate.setDate(departDate.getDate() + 30);
const date = departDate.toISOString().split("T")[0];

console.log(`\n🧭 KEZA Search Latency Benchmark`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`Route: ${from} → ${to}`);
console.log(`Date: ${date}`);
console.log(`Iterations: ${count}`);
console.log(`Base URL: ${baseUrl}`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

const timings = [];
const providers = {};
let cacheHits = 0;

async function runSearch() {
  const payload = {
    from,
    to,
    date,
    tripType: "oneway",
    stops: "any",
    cabin: "economy",
    passengers: 1,
  };

  const t0 = Date.now();
  try {
    const response = await fetch(`${baseUrl}/api/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const elapsed = Date.now() - t0;
    const data = await response.json();
    const provider = response.headers.get("x-provider-source") || "unknown";
    const fromCache = response.headers.get("x-from-cache") === "true";
    const resultCount = data.count || 0;

    timings.push(elapsed);
    providers[provider] = (providers[provider] || 0) + 1;
    if (fromCache) cacheHits++;

    // Green/yellow/red based on latency
    let indicator = elapsed < 3000 ? "✅" : elapsed < 5000 ? "⚠️" : "❌";
    const cacheLabel = fromCache ? " (cache)" : "";
    console.log(`  ${indicator} ${elapsed}ms ${provider} (${resultCount} results)${cacheLabel}`);

    return elapsed;
  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);
    return null;
  }
}

// Run benchmark
async function benchmark() {
  for (let i = 0; i < count; i++) {
    await runSearch();
    // Avoid hammering the server; add a small delay between requests
    await new Promise((r) => setTimeout(r, 500));
  }

  // Calculate percentiles
  const validTimings = timings.filter((t) => t !== null);
  if (validTimings.length === 0) {
    console.error("No successful requests completed.");
    process.exit(1);
  }

  const sorted = validTimings.slice().sort((a, b) => a - b);
  const percentile = (p) => {
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  };

  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = Math.round(sum / sorted.length);

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Results (${validTimings.length} successful requests)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Min:  ${sorted[0]}ms`);
  console.log(`  P50:  ${percentile(50)}ms`);
  console.log(`  P95:  ${percentile(95)}ms ← Target: <5000ms`);
  console.log(`  P99:  ${percentile(99)}ms`);
  console.log(`  Mean: ${mean}ms`);
  console.log(`  Max:  ${sorted[sorted.length - 1]}ms`);

  console.log(`\n📦 Provider Breakdown`);
  for (const [provider, count] of Object.entries(providers)) {
    console.log(`  ${provider}: ${count} (${Math.round((count / validTimings.length) * 100)}%)`);
  }

  console.log(`\n💾 Cache Performance`);
  console.log(`  Cache hits: ${cacheHits}/${validTimings.length} (${Math.round((cacheHits / validTimings.length) * 100)}%)`);

  // Performance assessment
  const p95 = percentile(95);
  console.log(`\n✅ Assessment`);
  if (p95 < 3000) {
    console.log(`  ✅ Excellent! P95 is ${p95}ms (target <5000ms)`);
  } else if (p95 < 5000) {
    console.log(`  ✅ Good! P95 is ${p95}ms (target <5000ms)`);
  } else {
    console.log(`  ⚠️  P95 is ${p95}ms — exceeds target of <5000ms`);
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

benchmark().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
