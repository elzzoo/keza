import sitemap from "@/app/sitemap";
import { SITE_URL } from "@/lib/siteConfig";
import { ROUTE_META } from "@/data/routeMeta";
import { iataToSlug } from "@/lib/routeSlug";

// Regression guard for the /vol vs /flights duplicate-content fix:
// /vol/[route] now canonicalizes to /flights/{ROUTE} (see app/vol/[route]/page.tsx),
// so the sitemap must not submit the non-canonical per-route /vol URLs —
// only the /vol index page and the equivalent /flights URLs (already listed
// via the POPULAR_ROUTES loop) should appear.
describe("sitemap", () => {
  const pages = sitemap();
  const urls = new Set(pages.map((p) => p.url));

  it("includes the /vol and /en/vol index pages", () => {
    expect(urls.has(`${SITE_URL}/vol`)).toBe(true);
    expect(urls.has(`${SITE_URL}/en/vol`)).toBe(true);
  });

  it("does not submit per-route /vol/[route] URLs (non-canonical)", () => {
    for (const key of ROUTE_META.keys()) {
      const [from, to] = key.split("-");
      const slug = iataToSlug(from!, to!);
      expect(urls.has(`${SITE_URL}/vol/${slug}`)).toBe(false);
      expect(urls.has(`${SITE_URL}/en/vol/${slug}`)).toBe(false);
    }
  });

  it("still submits the equivalent /flights/[ROUTE] URL for every ROUTE_META entry", () => {
    // This is what /vol/[route] now canonicalizes to — must actually be present.
    for (const key of ROUTE_META.keys()) {
      expect(urls.has(`${SITE_URL}/flights/${key}`)).toBe(true);
      expect(urls.has(`${SITE_URL}/en/flights/${key}`)).toBe(true);
    }
  });

  it("has no duplicate URLs", () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const p of pages) {
      if (seen.has(p.url)) duplicates.push(p.url);
      seen.add(p.url);
    }
    expect(duplicates).toEqual([]);
  });
});
