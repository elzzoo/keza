import type { MetadataRoute } from "next";
import { DESTINATIONS } from "@/data/destinations";
import { SITE_URL as BASE_URL } from "@/lib/siteConfig";

// Popular routes that get static pages — keep in sync with app/flights/[route]/page.tsx
const ROUTES = [
  // Africa ↔ Europe (original)
  "DSS-CDG", "ABJ-CDG", "LOS-LHR", "CMN-CDG", "NBO-CDG", "ACC-LHR",
  "JNB-LHR", "CAI-CDG", "ADD-DXB", "DSS-IST", "ABJ-IST", "CMN-JFK",
  "LOS-ATL", "NBO-DXB",
  // North America ↔ Europe (original)
  "JFK-LHR", "CDG-JFK", "LAX-CDG", "JFK-AMS", "ORD-LHR", "BOS-LHR",
  "MIA-MAD",
  // North America ↔ Asia (original)
  "JFK-NRT", "LAX-NRT", "SFO-NRT", "LAX-BKK", "LAX-SIN", "YYZ-LHR",
  // Europe ↔ Asia (original)
  "LHR-SIN", "CDG-NRT", "LHR-DXB", "LHR-BKK", "CDG-BKK", "FRA-SIN",
  "LHR-HKG",
  // Middle East hub routes (original)
  "DXB-LHR", "DXB-JFK", "DOH-LHR", "DOH-JFK", "IST-JFK",
  // Asia-Pacific (original)
  "SIN-SYD", "SIN-NRT", "HKG-LHR", "SYD-LHR",
  // Latin America (original)
  "MIA-BOG", "GRU-LHR", "GRU-CDG", "EZE-MAD", "SCL-MIA", "BOG-MAD",

  // Africa ↔ Europe (expanded)
  "DSS-LHR", "DSS-MAD", "DSS-AMS", "DSS-BRU", "DSS-FCO", "DSS-LIS",
  "ABJ-LHR", "ABJ-MAD", "ABJ-AMS", "ABJ-BRU",
  "LOS-CDG", "LOS-MAD", "LOS-AMS", "LOS-IST", "LOS-DXB",
  "CMN-LHR", "CMN-MAD", "CMN-IST", "CMN-AMS",
  "NBO-LHR", "NBO-IST",
  "ACC-CDG", "ACC-MAD", "ACC-IST",
  "JNB-CDG", "JNB-IST", "JNB-DXB",
  "CAI-LHR", "CAI-IST", "CAI-DXB",
  "TUN-CDG", "TUN-LHR", "TUN-MAD",
  "ALG-CDG", "ALG-LHR", "ALG-MAD",

  // Africa ↔ Americas
  "LOS-JFK", "LOS-IAD",
  "ACC-JFK", "ACC-IAD",
  "JNB-JFK", "JNB-MIA",
  "NBO-JFK",

  // Africa ↔ Middle East
  "LOS-DOH", "ACC-DXB", "JNB-DOH",

  // Africa intra
  "DSS-ABJ", "DSS-LOS", "DSS-CMN",

  // Europe ↔ Americas (high volume)
  "LHR-JFK", "LHR-LAX", "LHR-MIA", "LHR-YYZ", "LHR-YUL",
  "CDG-LAX", "CDG-MIA", "CDG-YUL", "CDG-YYZ", "CDG-ORD",
  "MAD-JFK", "MAD-MIA", "MAD-BOG",
  "AMS-JFK", "AMS-LAX",
  "FRA-JFK", "FRA-LAX", "FRA-YYZ",

  // Asia ↔ Americas
  "NRT-LAX", "NRT-JFK", "NRT-SFO",
  "SIN-LAX", "SIN-JFK",

  // More Middle East hubs
  "DXB-CDG", "DXB-SIN", "DXB-BKK", "DXB-SYD",
  "DOH-CDG", "DOH-SIN", "DOH-BKK",
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
