/**
 * scripts/check-bundle-size.mjs
 *
 * Checks .next/static/chunks/ for JS files exceeding the size threshold.
 * Run after `next build` to detect bundle regressions.
 *
 * Usage: node scripts/check-bundle-size.mjs [--max-kb=500] [--warn-kb=300]
 * Exit code 1 if any chunk exceeds --max-kb (default: 500 KB).
 */

import { readdirSync, statSync } from "fs";
import { join, relative } from "path";

// ── Config (override via CLI args) ────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);

const MAX_KB = parseInt(String(args["max-kb"] ?? "500"), 10);
const WARN_KB = parseInt(String(args["warn-kb"] ?? "250"), 10);
const CHUNKS_DIR = join(process.cwd(), ".next", "static", "chunks");

// ── Scan ──────────────────────────────────────────────────────────────────────
function scanDir(dir) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    console.error(`❌  .next/static/chunks/ not found — run 'next build' first`);
    process.exit(1);
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanDir(full));
    } else if (entry.name.endsWith(".js")) {
      const bytes = statSync(full).size;
      results.push({ path: relative(process.cwd(), full), bytes, kb: bytes / 1024 });
    }
  }
  return results;
}

const chunks = scanDir(CHUNKS_DIR);

// Sort by size descending
chunks.sort((a, b) => b.bytes - a.bytes);

// ── Report ────────────────────────────────────────────────────────────────────
const errors = chunks.filter((c) => c.kb > MAX_KB);
const warnings = chunks.filter((c) => c.kb > WARN_KB && c.kb <= MAX_KB);

console.log("\n📦  Bundle Size Report — Top 10 largest JS chunks\n");
console.log(
  ["Rank", "Size (KB)", "File"]
    .map((h, i) => h.padEnd(i === 2 ? 0 : 12))
    .join("")
);
console.log("─".repeat(80));

chunks.slice(0, 10).forEach((c, i) => {
  const kb = c.kb.toFixed(1).padEnd(12);
  const flag = c.kb > MAX_KB ? " ❌ EXCEEDS LIMIT" : c.kb > WARN_KB ? " ⚠️  large" : "";
  console.log(`${String(i + 1).padEnd(12)}${kb}${c.path}${flag}`);
});

console.log();

if (warnings.length > 0) {
  console.log(`⚠️   ${warnings.length} chunk(s) between ${WARN_KB} KB and ${MAX_KB} KB (consider lazy-loading)`);
}

if (errors.length > 0) {
  console.error(`\n❌  ${errors.length} chunk(s) exceed the ${MAX_KB} KB limit:`);
  errors.forEach((c) => {
    console.error(`   ${c.kb.toFixed(1)} KB  ${c.path}`);
  });
  console.error("\nHint: use dynamic import() or code-split the offending module.\n");
  process.exit(1);
}

console.log(`✅  All chunks within ${MAX_KB} KB limit (${chunks.length} JS files checked)\n`);
