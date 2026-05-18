import type { MetadataRoute } from "next";
import { DESTINATIONS } from "@/data/destinations";
import { SITE_URL as BASE_URL } from "@/lib/siteConfig";
import { POPULAR_ROUTES } from "@/data/popularRoutes";


export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const pages: MetadataRoute.Sitemap = [
    // ── FR root ──────────────────────────────────────────────────────────────
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
      alternates: { languages: { fr: BASE_URL, en: `${BASE_URL}/en` } },
    },
    // ── EN root ──────────────────────────────────────────────────────────────
    {
      url: `${BASE_URL}/en`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.95,
      alternates: { languages: { fr: BASE_URL, en: `${BASE_URL}/en` } },
    },
    // ── Static FR pages (no EN equivalent) ───────────────────────────────────
    {
      url: `${BASE_URL}/entreprises`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/pro`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    // ── Bilingual static pages ────────────────────────────────────────────────
    {
      url: `${BASE_URL}/deals`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.9,
      alternates: { languages: { fr: `${BASE_URL}/deals`, en: `${BASE_URL}/en/deals` } },
    },
    {
      url: `${BASE_URL}/en/deals`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.85,
      alternates: { languages: { fr: `${BASE_URL}/deals`, en: `${BASE_URL}/en/deals` } },
    },
    {
      url: `${BASE_URL}/programmes`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
      alternates: { languages: { fr: `${BASE_URL}/programmes`, en: `${BASE_URL}/en/programmes` } },
    },
    {
      url: `${BASE_URL}/en/programmes`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.85,
      alternates: { languages: { fr: `${BASE_URL}/programmes`, en: `${BASE_URL}/en/programmes` } },
    },
    {
      url: `${BASE_URL}/carte`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: { languages: { fr: `${BASE_URL}/carte`, en: `${BASE_URL}/en/carte` } },
    },
    {
      url: `${BASE_URL}/en/carte`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.75,
      alternates: { languages: { fr: `${BASE_URL}/carte`, en: `${BASE_URL}/en/carte` } },
    },
    {
      url: `${BASE_URL}/calculateur`,
      lastModified: now,
      priority: 0.8,
      alternates: { languages: { fr: `${BASE_URL}/calculateur`, en: `${BASE_URL}/en/calculateur` } },
    },
    {
      url: `${BASE_URL}/en/calculateur`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.75,
      alternates: { languages: { fr: `${BASE_URL}/calculateur`, en: `${BASE_URL}/en/calculateur` } },
    },
    {
      url: `${BASE_URL}/prix`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: { languages: { fr: `${BASE_URL}/prix`, en: `${BASE_URL}/en/prix` } },
    },
    {
      url: `${BASE_URL}/en/prix`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.65,
      alternates: { languages: { fr: `${BASE_URL}/prix`, en: `${BASE_URL}/en/prix` } },
    },
    {
      url: `${BASE_URL}/alertes`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
      alternates: { languages: { fr: `${BASE_URL}/alertes`, en: `${BASE_URL}/en/alertes` } },
    },
    {
      url: `${BASE_URL}/en/alertes`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.55,
      alternates: { languages: { fr: `${BASE_URL}/alertes`, en: `${BASE_URL}/en/alertes` } },
    },
    {
      url: `${BASE_URL}/comparer`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
      alternates: { languages: { fr: `${BASE_URL}/comparer`, en: `${BASE_URL}/en/comparer` } },
    },
    {
      url: `${BASE_URL}/en/comparer`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.55,
      alternates: { languages: { fr: `${BASE_URL}/comparer`, en: `${BASE_URL}/en/comparer` } },
    },
  ];

  // Route pages (FR + EN with hreflang alternates)
  for (const route of POPULAR_ROUTES) {
    const frUrl = `${BASE_URL}/flights/${route}`;
    const enUrl = `${BASE_URL}/en/flights/${route}`;
    const alts = { languages: { fr: frUrl, en: enUrl } };
    pages.push({
      url: frUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
      alternates: alts,
    });
    pages.push({
      url: enUrl,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.75,
      alternates: alts,
    });
  }

  // City-slug SEO URLs for long-tail search traffic
  const CITY_SLUG_ROUTES = [
    ["paris", "dakar"],
    ["dakar", "paris"],
    ["london", "lagos"],
    ["paris", "abidjan"],
    ["paris", "casablanca"],
    ["london", "nairobi"],
    ["london", "johannesburg"],
    ["paris", "new-york"],
    ["new-york", "london"],
    ["dubai", "london"],
    ["istanbul", "london"],
    ["paris", "tokyo"],
    ["london", "dubai"],
    ["london", "singapore"],
    ["new-york", "paris"],
  ];

  for (const [from, to] of CITY_SLUG_ROUTES) {
    pages.push({
      url: `${BASE_URL}/flights/${from}-${to}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.75,
    });
  }

  // Destination pages
  for (const dest of DESTINATIONS) {
    pages.push({
      url: `${BASE_URL}/destinations/${dest.iata.toLowerCase()}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    });
  }

  return pages;
}
