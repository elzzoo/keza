import { AIRPORTS } from "@/data/airports";

// Manual overrides for ambiguous cities (biggest international airport wins)
const CITY_OVERRIDES: Record<string, string> = {
  "paris": "CDG",
  "london": "LHR",
  "new york": "JFK",
  "newyork": "JFK",
  "new-york": "JFK",
  "nyc": "JFK",
  "los angeles": "LAX",
  "losangeles": "LAX",
  "chicago": "ORD",
  "miami": "MIA",
  "washington": "IAD",
  "san francisco": "SFO",
  "sanfrancisco": "SFO",
  "toronto": "YYZ",
  "montreal": "YUL",
  "montréal": "YUL",
  "tokyo": "NRT",
  "osaka": "KIX",
  "beijing": "PEK",
  "pekin": "PEK",
  "shanghai": "PVG",
  "dubai": "DXB",
  "dubaï": "DXB",
  "istanbul": "IST",
  "singapore": "SIN",
  "singapour": "SIN",
  "bangkok": "BKK",
  "sydney": "SYD",
  "melbourne": "MEL",
  "johannesburg": "JNB",
  "nairobi": "NBO",
  "addis ababa": "ADD",
  "addis-ababa": "ADD",
  "addisababa": "ADD",
  "cairo": "CAI",
  "le caire": "CAI",
  "lecaire": "CAI",
  "casablanca": "CMN",
  "lagos": "LOS",
  "accra": "ACC",
  "dakar": "DSS",
  "abidjan": "ABJ",
  "amsterdam": "AMS",
  "madrid": "MAD",
  "barcelona": "BCN",
  "rome": "FCO",
  "milan": "MXP",
  "frankfurt": "FRA",
  "munich": "MUC",
  "zurich": "ZRH",
  "brussels": "BRU",
  "bruxelles": "BRU",
  "lisbon": "LIS",
  "lisbonne": "LIS",
  "doha": "DOH",
  "abu dhabi": "AUH",
  "abudhabi": "AUH",
  "riyadh": "RUH",
  "hong kong": "HKG",
  "hongkong": "HKG",
  "kuala lumpur": "KUL",
  "kualalumpur": "KUL",
  "seoul": "ICN",
  "jakarta": "CGK",
  "manila": "MNL",
  "mumbai": "BOM",
  "delhi": "DEL",
  "new delhi": "DEL",
  "bangalore": "BLR",
  "sao paulo": "GRU",
  "saopaulo": "GRU",
  "rio de janeiro": "GIG",
  "rio": "GIG",
  "buenos aires": "EZE",
  "buenosaires": "EZE",
  "bogota": "BOG",
  "bogotá": "BOG",
  "lima": "LIM",
  "santiago": "SCL",
  "mexico city": "MEX",
  "mexicocity": "MEX",
  "mexico": "MEX",
};

// Normalize: lowercase, remove accents, trim
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// Build lookup from airports data (normalized city/cityEn → IATA)
const CITY_LOOKUP = new Map<string, string>();

for (const airport of AIRPORTS) {
  const normCity = normalize(airport.city);
  const normCityEn = normalize(airport.cityEn);
  if (!CITY_LOOKUP.has(normCity)) CITY_LOOKUP.set(normCity, airport.code);
  if (!CITY_LOOKUP.has(normCityEn)) CITY_LOOKUP.set(normCityEn, airport.code);
}

// Apply overrides (most important cities map to their primary hub)
for (const [city, iata] of Object.entries(CITY_OVERRIDES)) {
  CITY_LOOKUP.set(normalize(city), iata);
}

/** Resolve a city name or IATA to an IATA code. Returns null if not found. */
export function cityToIata(input: string): string | null {
  const trimmed = input.trim();
  // Direct IATA match (3 uppercase letters)
  if (/^[A-Z]{3}$/.test(trimmed)) return trimmed;
  // Try normalized lookup
  const norm = normalize(trimmed);
  return CITY_LOOKUP.get(norm) ?? null;
}
