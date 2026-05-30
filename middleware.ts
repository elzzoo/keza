import { NextRequest, NextResponse } from "next/server";

// Regex: /flights/word-word or /en/flights/word-word
const CITY_SLUG_RE = /^\/(en\/)?flights\/([a-z][a-z0-9\-]+)-([a-z][a-z0-9\-]+)$/i;
// IATA route pattern (already resolved) — skip
const IATA_RE = /^\/(en\/)?flights\/[A-Z]{3}-[A-Z]{3}$/;

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

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://plausible.io`,
    "style-src 'self' 'unsafe-inline'", // Tailwind CSS requires unsafe-inline for styles
    "img-src 'self' data: blob: https:",
    // Restrict to known domains — prevents XSS data exfiltration to arbitrary HTTPS hosts.
    "connect-src 'self' https://plausible.io https://*.sentry.io https://o*.ingest.sentry.io https://*.upstash.io",
    "font-src 'self' data:",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // ── City-slug → IATA redirect ─────────────────────────────────────────────
  if (!IATA_RE.test(path)) {
    const match = path.match(CITY_SLUG_RE);
    if (match) {
      const [, enPrefix, rawFrom, rawTo] = match;
      const norm = (s: string) => s.toLowerCase().trim();
      const fromIata = TOP_CITIES[norm(rawFrom)];
      const toIata = TOP_CITIES[norm(rawTo)];

      if (fromIata && toIata && fromIata !== toIata) {
        const prefix = enPrefix ? "/en" : "";
        const redirectUrl = new URL(`${prefix}/flights/${fromIata}-${toIata}`, req.url);
        return NextResponse.redirect(redirectUrl, { status: 301 });
      }
    }
  }

  // ── Nonce-based CSP ───────────────────────────────────────────────────────
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  // Locale detection for root layout lang attribute
  const isEn = path === "/en" || path.startsWith("/en/");
  requestHeaders.set("x-locale", isEn ? "en" : "fr");

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)).*)",
  ],
};
