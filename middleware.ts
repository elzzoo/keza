import { NextRequest, NextResponse } from "next/server";

// Regex: /flights/word-word or /en/flights/word-word
const CITY_SLUG_RE = /^\/(en\/)?flights\/([a-z][a-z0-9\-]+)-([a-z][a-z0-9\-]+)$/i;
// IATA route pattern (already resolved) — skip
const IATA_RE = /^\/(en\/)?flights\/[A-Z]{3}-[A-Z]{3}$/;

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Already an IATA route — skip
  if (IATA_RE.test(path)) return NextResponse.next();

  const match = path.match(CITY_SLUG_RE);
  if (!match) return NextResponse.next();

  const [, enPrefix, rawFrom, rawTo] = match;

  // Resolve city slugs to IATA — we do this server-side via a lookup
  // The full lookup lives in lib/cityToIata.ts but middleware can't import
  // heavy data files. Use a lightweight inline lookup for the top 60 cities.
  const TOP_CITIES: Record<string, string> = {
    "paris": "CDG", "london": "LHR", "new-york": "JFK", "nyc": "JFK",
    "los-angeles": "LAX", "chicago": "ORD", "miami": "MIA",
    "san-francisco": "SFO", "toronto": "YYZ", "montreal": "YUL",
    "tokyo": "NRT", "dubai": "DXB", "istanbul": "IST",
    "singapore": "SIN", "bangkok": "BKK", "sydney": "SYD",
    "johannesburg": "JNB", "nairobi": "NBO", "addis-ababa": "ADD",
    "cairo": "CAI", "casablanca": "CMN", "lagos": "LOS", "accra": "ACC",
    "dakar": "DSS", "abidjan": "ABJ", "amsterdam": "AMS", "madrid": "MAD",
    "barcelona": "BCN", "rome": "FCO", "milan": "MXP", "frankfurt": "FRA",
    "munich": "MUC", "zurich": "ZRH", "brussels": "BRU", "lisbon": "LIS",
    "doha": "DOH", "hong-kong": "HKG", "kuala-lumpur": "KUL",
    "seoul": "ICN", "mumbai": "BOM", "delhi": "DEL",
    "sao-paulo": "GRU", "buenos-aires": "EZE", "bogota": "BOG",
    "lima": "LIM", "santiago": "SCL", "mexico-city": "MEX",
    "new-delhi": "DEL", "beijing": "PEK", "shanghai": "PVG",
    "abu-dhabi": "AUH", "riyadh": "RUH", "jakarta": "CGK",
    "oslo": "OSL", "stockholm": "ARN", "copenhagen": "CPH",
    "helsinki": "HEL", "vienna": "VIE", "warsaw": "WAW",
    "prague": "PRG", "budapest": "BUD", "athens": "ATH",
  };

  const norm = (s: string) => s.toLowerCase().trim();
  const fromIata = TOP_CITIES[norm(rawFrom)];
  const toIata = TOP_CITIES[norm(rawTo)];

  if (!fromIata || !toIata || fromIata === toIata) return NextResponse.next();

  const prefix = enPrefix ? "/en" : "";
  const redirectUrl = new URL(`${prefix}/flights/${fromIata}-${toIata}`, req.url);
  return NextResponse.redirect(redirectUrl, { status: 301 });
}

export const config = {
  matcher: ["/flights/:path*", "/en/flights/:path*"],
};
