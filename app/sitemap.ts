import type { MetadataRoute } from "next";

const BASE_URL = "https://keza-taupe.vercel.app";

// Popular routes that get static pages
const ROUTES = [
  "DSS-CDG", "ABJ-CDG", "LOS-LHR", "CMN-JFK", "NBO-CDG", "ACC-LHR",
  "JFK-LHR", "CDG-NRT", "LAX-BKK", "SIN-SYD", "NBO-DXB", "DSS-IST",
  "JNB-LHR", "CAI-CDG", "ADD-DXB", "LOS-ATL", "CMN-CDG", "ABJ-IST",
  "DXB-LHR", "CDG-JFK", "LHR-NRT", "SFO-NRT", "LAX-CDG", "MIA-BOG",
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

  return pages;
}
