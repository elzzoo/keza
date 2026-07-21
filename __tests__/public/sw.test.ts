// __tests__/public/sw.test.ts
// Regression guard for the "stale forever" service worker bug found during
// production audit: navigation (HTML) requests were served
// stale-while-revalidate, so every deploy was invisible to returning users
// until they manually cleared site data. See public/sw.js for the fix.

import fs from "fs";
import path from "path";

const SW_SOURCE = fs.readFileSync(
  path.join(__dirname, "../../public/sw.js"),
  "utf-8"
);

describe("public/sw.js — caching strategy", () => {
  it("does not serve navigation requests from a stale-while-revalidate cache", () => {
    // The bug: a single `caches.match(request).then(cached => cached || fetchPromise)`
    // branch handling BOTH pages and static assets means HTML navigations return
    // the cached (stale) response first. Guard: the navigation branch must exist
    // and must call fetch() as the primary response, not caches.match() first.
    const navigateStart = SW_SOURCE.indexOf('request.mode === "navigate"');
    expect(navigateStart).toBeGreaterThan(-1);
    // Slice from the navigate check to the next top-level `return;` that closes the branch
    const nextReturn = SW_SOURCE.indexOf("return;", navigateStart);
    expect(nextReturn).toBeGreaterThan(-1);
    const branchSource = SW_SOURCE.slice(navigateStart, nextReturn + "return;".length);

    // Must attempt the network first for navigations …
    const fetchIndex = branchSource.indexOf("fetch(request)");
    // … and only fall back to caches.match on failure (offline).
    const cacheFallbackIndex = branchSource.indexOf("caches.match(request)");

    expect(fetchIndex).toBeGreaterThan(-1);
    expect(cacheFallbackIndex).toBeGreaterThan(-1);
    expect(fetchIndex).toBeLessThan(cacheFallbackIndex);
  });

  it("bumps CACHE_NAME so stale clients purge their old cache on activate", () => {
    // Must not regress to the version that shipped the stale-forever bug.
    expect(SW_SOURCE).not.toMatch(/CACHE_NAME\s*=\s*["']keza-v3["']/);
  });

  it("still serves the network-first strategy for /api/ requests", () => {
    const apiBranch = SW_SOURCE.match(
      /pathname\.startsWith\(["']\/api\/["']\)[\s\S]*?return;/
    );
    expect(apiBranch).not.toBeNull();
    expect(apiBranch![0]).toMatch(/fetch\(request\)\.catch/);
  });
});
