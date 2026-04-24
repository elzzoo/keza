import { test, expect } from "@playwright/test";

test.describe("SEO — robots.txt and sitemap", () => {
  test("robots.txt disallows /api/ and /admin", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain("Disallow: /api/");
    expect(text).toContain("Disallow: /admin");
  });

  test("robots.txt allows all other paths", async ({ request }) => {
    const res = await request.get("/robots.txt");
    const text = await res.text();
    expect(text).toContain("Allow: /");
  });

  test("robots.txt points to sitemap", async ({ request }) => {
    const res = await request.get("/robots.txt");
    const text = await res.text();
    expect(text).toMatch(/Sitemap:\s*https?:\/\/.+\/sitemap\.xml/i);
  });

  test("sitemap.xml is valid XML with at least 10 URLs", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain("<urlset");
    // Count <loc> entries
    const matches = text.match(/<loc>/g);
    expect(matches).not.toBeNull();
    expect((matches ?? []).length).toBeGreaterThan(10);
  });

  test("sitemap.xml includes /deals and /programmes", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    const text = await res.text();
    expect(text).toContain("/deals");
    expect(text).toContain("/programmes");
  });
});
