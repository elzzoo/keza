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

  it("declares FR and EN alternates on FR corridor pages", async () => {
    const metadata = await generateVolRouteMetadata({
      params: Promise.resolve({ route: "dss-cdg" }),
    });

    expect(metadata.alternates).toMatchObject({
      canonical: `${SITE_URL}/vol/dss-cdg`,
      languages: {
        fr: `${SITE_URL}/vol/dss-cdg`,
        en: `${SITE_URL}/en/vol/dss-cdg`,
      },
    });
  });
});
