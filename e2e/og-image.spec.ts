import { test, expect } from "@playwright/test";

/**
 * Regression test for a real production bug (SEO-4 in the due-diligence
 * audit): /api/og returned HTTP 200 with an empty body (content-length: 0)
 * for every request, so social shares (Twitter card on the homepage) showed
 * a broken image. Root cause — Satori (the renderer behind next/og's
 * ImageResponse) throws if any <div> with more than one child node doesn't
 * explicitly set display:"flex" or display:"none"; the render failure was
 * swallowed into a 200-with-empty-body instead of a visible error.
 *
 * Runs against a real server (unlike a Jest unit test, which can't exercise
 * next/og's ImageResponse — it needs --experimental-vm-modules Jest doesn't
 * have configured) so it actually catches the Satori-throws-at-render-time
 * class of bug, not just a JSX/type-shape check.
 */
test.describe("/api/og", () => {
  test("renders a non-empty PNG for the generic/homepage OG (no params)", async ({ request }) => {
    const res = await request.get("/api/og");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
    const body = await res.body();
    expect(body.byteLength).toBeGreaterThan(1000);
  });

  test("renders a non-empty PNG for a route with no optional params", async ({ request }) => {
    const res = await request.get("/api/og?from=DSS&to=CDG");
    expect(res.status()).toBe(200);
    const body = await res.body();
    expect(body.byteLength).toBeGreaterThan(1000);
  });

  test("renders a non-empty PNG with every optional param set", async ({ request }) => {
    // This exact combination caught the second layout bug (the
    // "avec {program}" and "+{savings}" divs) during manual testing — keep
    // all params together so a future partial-props regression can't hide
    // behind a subset that happens to still render.
    const res = await request.get(
      "/api/og?from=DSS&to=CDG&savings=%24450&price=%241200&program=Flying%20Blue&cabin=business"
    );
    expect(res.status()).toBe(200);
    const body = await res.body();
    expect(body.byteLength).toBeGreaterThan(1000);
  });

  test("renders a non-empty PNG in English", async ({ request }) => {
    const res = await request.get("/api/og?from=DSS&to=CDG&lang=en&savings=%24450");
    expect(res.status()).toBe(200);
    const body = await res.body();
    expect(body.byteLength).toBeGreaterThan(1000);
  });
});
