/**
 * Canonical list of popular routes that get static pages.
 * Imported by:
 *   - app/flights/[route]/page.tsx       (generateStaticParams)
 *   - app/en/flights/[route]/page.tsx    (generateStaticParams)
 *   - app/sitemap.ts                     (sitemap entries)
 *
 * Add new routes here — all three consumers update automatically.
 */
export const POPULAR_ROUTES: string[] = [
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
