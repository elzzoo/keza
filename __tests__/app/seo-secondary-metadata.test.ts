import { metadata as frDeals } from "@/app/deals/page";
import { metadata as enDeals } from "@/app/en/deals/page";
import { metadata as frPrix } from "@/app/prix/page";
import { metadata as enPrix } from "@/app/en/prix/page";
import { metadata as frAlertes } from "@/app/alertes/page";
import { metadata as enAlertes } from "@/app/en/alertes/page";
import { metadata as frProgrammes } from "@/app/programmes/page";
import { metadata as enProgrammes } from "@/app/en/programmes/page";
import { metadata as frCalculateur } from "@/app/calculateur/page";
import { metadata as enCalculateur } from "@/app/en/calculateur/page";
import { metadata as frComparer } from "@/app/comparer/page";
import { metadata as enComparer } from "@/app/en/comparer/page";
import sitemap from "@/app/sitemap";
import { SITE_URL } from "@/lib/siteConfig";

const pairs = [
  ["deals", frDeals, enDeals],
  ["prix", frPrix, enPrix],
  ["alertes", frAlertes, enAlertes],
  ["programmes", frProgrammes, enProgrammes],
  ["calculateur", frCalculateur, enCalculateur],
  ["comparer", frComparer, enComparer],
] as const;

describe.each(pairs)("%s SEO pair", (slug, frMetadata, enMetadata) => {
  const frUrl = `${SITE_URL}/${slug}`;
  const enUrl = `${SITE_URL}/en/${slug}`;
  const languages = { fr: frUrl, en: enUrl, "x-default": frUrl };

  it("uses self-canonicals and reciprocal alternates", () => {
    expect(frMetadata.alternates).toMatchObject({ canonical: frUrl, languages });
    expect(enMetadata.alternates).toMatchObject({ canonical: enUrl, languages });
  });

  it("submits both canonical URLs with reciprocal alternates", () => {
    const pages = new Map(sitemap().map((page) => [page.url, page]));
    expect(pages.get(frUrl)?.alternates?.languages).toMatchObject({ fr: frUrl, en: enUrl });
    expect(pages.get(enUrl)?.alternates?.languages).toMatchObject({ fr: frUrl, en: enUrl });
  });
});
