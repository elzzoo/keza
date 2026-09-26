import { metadata as volMetadata } from "@/app/vol/page";
import { generateMetadata as generateVolRouteMetadata } from "@/app/vol/[route]/page";
import { SITE_URL } from "@/lib/siteConfig";

describe("/vol SEO metadata", () => {
  it("declares FR and EN alternates on the FR route index", () => {
    expect(volMetadata.alternates).toMatchObject({
      canonical: `${SITE_URL}/vol`,
      languages: {
        fr: `${SITE_URL}/vol`,
        en: `${SITE_URL}/en/vol`,
      },
    });
    expect(volMetadata.openGraph).toMatchObject({
      locale: "fr_FR",
      url: `${SITE_URL}/vol`,
    });
  });

  it("canonicalizes FR corridor pages to the equivalent /flights route", async () => {
    // /vol/[route] and /flights/[route] render overlapping corridor content
    // (same ROUTE_META-derived FAQ/stats) for any pair also reachable at
    // /flights, which additionally has live pricing and covers every IATA
    // pair. To avoid duplicate-content splitting, /vol/[route] declares
    // /flights/{ROUTE} as canonical instead of itself — see app/vol/[route]/page.tsx.
    const metadata = await generateVolRouteMetadata({
      params: Promise.resolve({ route: "dss-cdg" }),
    });

    expect(metadata.alternates).toMatchObject({
      canonical: `${SITE_URL}/flights/DSS-CDG`,
      languages: {
        fr: `${SITE_URL}/flights/DSS-CDG`,
        en: `${SITE_URL}/en/flights/DSS-CDG`,
      },
    });
  });
});

describe("/en/vol SEO metadata", () => {
  it("canonicalizes EN corridor pages to the equivalent /en/flights route", async () => {
    const { generateMetadata: generateEnVolRouteMetadata } = await import("@/app/en/vol/[route]/page");
    const metadata = await generateEnVolRouteMetadata({
      params: Promise.resolve({ route: "dss-cdg" }),
    });

    expect(metadata.alternates).toMatchObject({
      canonical: `${SITE_URL}/en/flights/DSS-CDG`,
      languages: {
        fr: `${SITE_URL}/flights/DSS-CDG`,
        en: `${SITE_URL}/en/flights/DSS-CDG`,
      },
    });
  });
});
