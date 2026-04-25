import type { MetadataRoute } from "next";
import { DESTINATIONS } from "@/data/destinations";
import { SITE_URL as BASE_URL } from "@/lib/siteConfig";

// Popular routes that get static pages
const ROUTES = [
  // Africa ↔ Europe
  "DSS-CDG", "ABJ-CDG", "LOS-LHR", "CMN-CDG", "NBO-CDG", "ACC-LHR",
  "JNB-LHR", "CAI-CDG", "ADD-DXB", "DSS-IST", "ABJ-IST", "CMN-JFK",
  "LOS-ATL", "NBO-DXB",
  // North America ↔ Europe
  "JFK-LHR", "CDG-JFK", "LAX-CDG", "JFK-AMS", "ORD-LHR", "BOS-LHR",
  "MIA-MAD",
  // North America ↔ Asia
  "JFK-NRT", "LAX-NRT", "SFO-NRT", "LAX-BKK", "LAX-SIN", "YYZ-LHR",
  // Europe ↔ Asia
  "LHR-SIN", "CDG-NRT", "LHR-DXB", "LHR-BKK", "CDG-BKK", "FRA-SIN",
  "LHR-HKG",
  // Middle East hub routes
  "DXB-LHR", "DXB-JFK", "DOH-LHR", "DOH-JFK", "IST-JFK",
  // Asia-Pacific
  "SIN-SYD", "SIN-NRT", "HKG-LHR", "SYD-LHR",
  // Latin America
  "MIA-BOG", "GRU-LHR", "GRU-CDG", "EZE-MAD", "SCL-MIA", "BOG-MAD",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const pages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/calculateur`,
      lastModified: now,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/programmes`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/carte`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/prix`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/entreprises`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/alertes`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/deals`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/comparer`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/pro`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
  ];

  // Route pages
  for (const route of ROUTES) {
    pages.push({
      url: `${BASE_URL}/flights/${route}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  // EN route pages
  for (const route of ROUTES) {
    pages.push({
      url: `${BASE_URL}/en/flights/${route}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.75,
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
