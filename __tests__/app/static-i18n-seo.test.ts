import { metadata as businessMetadata } from "@/app/entreprises/layout";
import { metadata as enBusinessMetadata } from "@/app/en/entreprises/page";
import { metadata as legalMetadata } from "@/app/mentions-legales/page";
import { metadata as enLegalMetadata } from "@/app/en/legal/page";
import { metadata as privacyMetadata } from "@/app/confidentialite/page";
import { metadata as enPrivacyMetadata } from "@/app/en/privacy/page";
import sitemap from "@/app/sitemap";
import { SITE_URL } from "@/lib/siteConfig";

describe("static i18n SEO metadata", () => {
  it("declares bilingual alternates for business pages", () => {
    const languages = { fr: `${SITE_URL}/entreprises`, en: `${SITE_URL}/en/entreprises` };

    expect(businessMetadata.alternates).toMatchObject({
      canonical: `${SITE_URL}/entreprises`,
      languages,
    });
    expect(enBusinessMetadata.alternates).toMatchObject({
      canonical: `${SITE_URL}/en/entreprises`,
      languages,
    });
  });

  it("declares bilingual alternates for legal and privacy pages", () => {
    expect(legalMetadata.alternates).toMatchObject({
      canonical: `${SITE_URL}/mentions-legales`,
      languages: { fr: `${SITE_URL}/mentions-legales`, en: `${SITE_URL}/en/legal` },
    });
    expect(enLegalMetadata.alternates).toMatchObject({
      canonical: `${SITE_URL}/en/legal`,
      languages: { fr: `${SITE_URL}/mentions-legales`, en: `${SITE_URL}/en/legal` },
    });
    expect(privacyMetadata.alternates).toMatchObject({
      canonical: `${SITE_URL}/confidentialite`,
      languages: { fr: `${SITE_URL}/confidentialite`, en: `${SITE_URL}/en/privacy` },
    });
    expect(enPrivacyMetadata.alternates).toMatchObject({
      canonical: `${SITE_URL}/en/privacy`,
      languages: { fr: `${SITE_URL}/confidentialite`, en: `${SITE_URL}/en/privacy` },
    });
  });

  it("includes business, legal, and privacy pages in the sitemap", () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toEqual(expect.arrayContaining([
      `${SITE_URL}/entreprises`,
      `${SITE_URL}/en/entreprises`,
      `${SITE_URL}/mentions-legales`,
      `${SITE_URL}/en/legal`,
      `${SITE_URL}/confidentialite`,
      `${SITE_URL}/en/privacy`,
    ]));
  });
});
