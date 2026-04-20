/**
 * Geo-personalized routes — show relevant popular routes based on user's country.
 * Each region gets a curated mix of:
 *   - Local departures (from their country/region)
 *   - Global popular routes (aspirational destinations)
 */

export interface GeoRoute {
  from: string;
  to: string;
  fromFlag: string;
  toFlag: string;
  label: string;
  labelEn: string;
  /** Optional tag for display */
  tag?: { fr: string; en: string };
}

// ─── Flag helper ───────────────────────────────────────────────────────────

function flag(iso2: string): string {
  return String.fromCodePoint(
    ...iso2.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

// ─── Route definitions by region ───────────────────────────────────────────

const WEST_AFRICA: GeoRoute[] = [
  { from: "DSS", to: "CDG", fromFlag: flag("SN"), toFlag: flag("FR"), label: "Dakar ��� Paris", labelEn: "Dakar → Paris", tag: { fr: "Populaire", en: "Popular" } },
  { from: "DSS", to: "JFK", fromFlag: flag("SN"), toFlag: flag("US"), label: "Dakar → New York", labelEn: "Dakar → New York" },
  { from: "ABJ", to: "CDG", fromFlag: flag("CI"), toFlag: flag("FR"), label: "Abidjan → Paris", labelEn: "Abidjan �� Paris" },
  { from: "LOS", to: "LHR", fromFlag: flag("NG"), toFlag: flag("GB"), label: "Lagos → Londres", labelEn: "Lagos → London" },
  { from: "ACC", to: "JFK", fromFlag: flag("GH"), toFlag: flag("US"), label: "Accra → New York", labelEn: "Accra → New York" },
  { from: "DSS", to: "IST", fromFlag: flag("SN"), toFlag: flag("TR"), label: "Dakar → Istanbul", labelEn: "Dakar → Istanbul" },
  { from: "ABJ", to: "DXB", fromFlag: flag("CI"), toFlag: flag("AE"), label: "Abidjan → Dubaï", labelEn: "Abidjan → Dubai" },
  { from: "DSS", to: "CMN", fromFlag: flag("SN"), toFlag: flag("MA"), label: "Dakar → Casablanca", labelEn: "Dakar → Casablanca" },
];

const NORTH_AFRICA: GeoRoute[] = [
  { from: "CMN", to: "CDG", fromFlag: flag("MA"), toFlag: flag("FR"), label: "Casablanca → Paris", labelEn: "Casablanca → Paris", tag: { fr: "Populaire", en: "Popular" } },
  { from: "CMN", to: "JFK", fromFlag: flag("MA"), toFlag: flag("US"), label: "Casablanca → New York", labelEn: "Casablanca → New York" },
  { from: "ALG", to: "CDG", fromFlag: flag("DZ"), toFlag: flag("FR"), label: "Alger → Paris", labelEn: "Algiers → Paris" },
  { from: "TUN", to: "CDG", fromFlag: flag("TN"), toFlag: flag("FR"), label: "Tunis → Paris", labelEn: "Tunis → Paris" },
  { from: "CMN", to: "IST", fromFlag: flag("MA"), toFlag: flag("TR"), label: "Casablanca → Istanbul", labelEn: "Casablanca → Istanbul" },
  { from: "CMN", to: "LHR", fromFlag: flag("MA"), toFlag: flag("GB"), label: "Casablanca → Londres", labelEn: "Casablanca → London" },
  { from: "CAI", to: "DXB", fromFlag: flag("EG"), toFlag: flag("AE"), label: "Le Caire → Dubaï", labelEn: "Cairo → Dubai" },
  { from: "CMN", to: "DXB", fromFlag: flag("MA"), toFlag: flag("AE"), label: "Casablanca → Dubaï", labelEn: "Casablanca → Dubai" },
];

const EAST_AFRICA: GeoRoute[] = [
  { from: "NBO", to: "LHR", fromFlag: flag("KE"), toFlag: flag("GB"), label: "Nairobi → Londres", labelEn: "Nairobi → London", tag: { fr: "Populaire", en: "Popular" } },
  { from: "NBO", to: "DXB", fromFlag: flag("KE"), toFlag: flag("AE"), label: "Nairobi → Dubaï", labelEn: "Nairobi → Dubai" },
  { from: "ADD", to: "CDG", fromFlag: flag("ET"), toFlag: flag("FR"), label: "Addis-Abeba → Paris", labelEn: "Addis Ababa → Paris" },
  { from: "NBO", to: "JFK", fromFlag: flag("KE"), toFlag: flag("US"), label: "Nairobi → New York", labelEn: "Nairobi → New York" },
  { from: "DAR", to: "IST", fromFlag: flag("TZ"), toFlag: flag("TR"), label: "Dar es Salaam → Istanbul", labelEn: "Dar es Salaam → Istanbul" },
  { from: "NBO", to: "BKK", fromFlag: flag("KE"), toFlag: flag("TH"), label: "Nairobi → Bangkok", labelEn: "Nairobi → Bangkok" },
  { from: "ADD", to: "DXB", fromFlag: flag("ET"), toFlag: flag("AE"), label: "Addis-Abeba → Dubaï", labelEn: "Addis Ababa → Dubai" },
  { from: "NBO", to: "CDG", fromFlag: flag("KE"), toFlag: flag("FR"), label: "Nairobi → Paris", labelEn: "Nairobi → Paris" },
];

const FRANCE: GeoRoute[] = [
  { from: "CDG", to: "NRT", fromFlag: flag("FR"), toFlag: flag("JP"), label: "Paris → Tokyo", labelEn: "Paris → Tokyo", tag: { fr: "Populaire", en: "Popular" } },
  { from: "CDG", to: "JFK", fromFlag: flag("FR"), toFlag: flag("US"), label: "Paris → New York", labelEn: "Paris → New York" },
  { from: "CDG", to: "BKK", fromFlag: flag("FR"), toFlag: flag("TH"), label: "Paris → Bangkok", labelEn: "Paris → Bangkok" },
  { from: "CDG", to: "DSS", fromFlag: flag("FR"), toFlag: flag("SN"), label: "Paris → Dakar", labelEn: "Paris → Dakar" },
  { from: "CDG", to: "DXB", fromFlag: flag("FR"), toFlag: flag("AE"), label: "Paris → Dubaï", labelEn: "Paris → Dubai" },
  { from: "CDG", to: "MLE", fromFlag: flag("FR"), toFlag: flag("MV"), label: "Paris → Maldives", labelEn: "Paris → Maldives" },
  { from: "CDG", to: "LAX", fromFlag: flag("FR"), toFlag: flag("US"), label: "Paris → Los Angeles", labelEn: "Paris → Los Angeles" },
  { from: "CDG", to: "ABJ", fromFlag: flag("FR"), toFlag: flag("CI"), label: "Paris → Abidjan", labelEn: "Paris → Abidjan" },
];

const EUROPE: GeoRoute[] = [
  { from: "LHR", to: "JFK", fromFlag: flag("GB"), toFlag: flag("US"), label: "Londres → New York", labelEn: "London ��� New York", tag: { fr: "Populaire", en: "Popular" } },
  { from: "LHR", to: "NRT", fromFlag: flag("GB"), toFlag: flag("JP"), label: "Londres → Tokyo", labelEn: "London → Tokyo" },
  { from: "LHR", to: "SIN", fromFlag: flag("GB"), toFlag: flag("SG"), label: "Londres → Singapour", labelEn: "London → Singapore" },
  { from: "LHR", to: "DXB", fromFlag: flag("GB"), toFlag: flag("AE"), label: "Londres → Dubaï", labelEn: "London → Dubai" },
  { from: "CDG", to: "NRT", fromFlag: flag("FR"), toFlag: flag("JP"), label: "Paris → Tokyo", labelEn: "Paris → Tokyo" },
  { from: "FRA", to: "BKK", fromFlag: flag("DE"), toFlag: flag("TH"), label: "Francfort → Bangkok", labelEn: "Frankfurt → Bangkok" },
  { from: "AMS", to: "JFK", fromFlag: flag("NL"), toFlag: flag("US"), label: "Amsterdam → New York", labelEn: "Amsterdam → New York" },
  { from: "IST", to: "JFK", fromFlag: flag("TR"), toFlag: flag("US"), label: "Istanbul → New York", labelEn: "Istanbul → New York" },
];

const USA: GeoRoute[] = [
  { from: "JFK", to: "LHR", fromFlag: flag("US"), toFlag: flag("GB"), label: "New York → Londres", labelEn: "New York ��� London", tag: { fr: "Populaire", en: "Popular" } },
  { from: "JFK", to: "CDG", fromFlag: flag("US"), toFlag: flag("FR"), label: "New York → Paris", labelEn: "New York → Paris" },
  { from: "LAX", to: "NRT", fromFlag: flag("US"), toFlag: flag("JP"), label: "Los Angeles → Tokyo", labelEn: "Los Angeles → Tokyo" },
  { from: "JFK", to: "DXB", fromFlag: flag("US"), toFlag: flag("AE"), label: "New York → Dubaï", labelEn: "New York → Dubai" },
  { from: "LAX", to: "BKK", fromFlag: flag("US"), toFlag: flag("TH"), label: "Los Angeles → Bangkok", labelEn: "Los Angeles → Bangkok" },
  { from: "SFO", to: "SIN", fromFlag: flag("US"), toFlag: flag("SG"), label: "San Francisco → Singapour", labelEn: "San Francisco → Singapore" },
  { from: "MIA", to: "GRU", fromFlag: flag("US"), toFlag: flag("BR"), label: "Miami → São Paulo", labelEn: "Miami → São Paulo" },
  { from: "JFK", to: "DSS", fromFlag: flag("US"), toFlag: flag("SN"), label: "New York → Dakar", labelEn: "New York → Dakar" },
];

const CANADA: GeoRoute[] = [
  { from: "YUL", to: "CDG", fromFlag: flag("CA"), toFlag: flag("FR"), label: "Montréal → Paris", labelEn: "Montreal → Paris", tag: { fr: "Populaire", en: "Popular" } },
  { from: "YYZ", to: "LHR", fromFlag: flag("CA"), toFlag: flag("GB"), label: "Toronto → Londres", labelEn: "Toronto → London" },
  { from: "YUL", to: "DSS", fromFlag: flag("CA"), toFlag: flag("SN"), label: "Montréal → Dakar", labelEn: "Montreal → Dakar" },
  { from: "YYZ", to: "NRT", fromFlag: flag("CA"), toFlag: flag("JP"), label: "Toronto → Tokyo", labelEn: "Toronto → Tokyo" },
  { from: "YVR", to: "SYD", fromFlag: flag("CA"), toFlag: flag("AU"), label: "Vancouver → Sydney", labelEn: "Vancouver → Sydney" },
  { from: "YUL", to: "ABJ", fromFlag: flag("CA"), toFlag: flag("CI"), label: "Montréal → Abidjan", labelEn: "Montreal → Abidjan" },
  { from: "YYZ", to: "DXB", fromFlag: flag("CA"), toFlag: flag("AE"), label: "Toronto → Dubaï", labelEn: "Toronto → Dubai" },
  { from: "YUL", to: "CMN", fromFlag: flag("CA"), toFlag: flag("MA"), label: "Montréal �� Casablanca", labelEn: "Montreal → Casablanca" },
];

const MIDDLE_EAST: GeoRoute[] = [
  { from: "DXB", to: "LHR", fromFlag: flag("AE"), toFlag: flag("GB"), label: "Dubaï → Londres", labelEn: "Dubai → London", tag: { fr: "Populaire", en: "Popular" } },
  { from: "DXB", to: "BKK", fromFlag: flag("AE"), toFlag: flag("TH"), label: "Dubaï → Bangkok", labelEn: "Dubai → Bangkok" },
  { from: "DXB", to: "NRT", fromFlag: flag("AE"), toFlag: flag("JP"), label: "Dubaï → Tokyo", labelEn: "Dubai → Tokyo" },
  { from: "DXB", to: "MLE", fromFlag: flag("AE"), toFlag: flag("MV"), label: "Dubaï → Maldives", labelEn: "Dubai → Maldives" },
  { from: "DXB", to: "JFK", fromFlag: flag("AE"), toFlag: flag("US"), label: "Dubaï → New York", labelEn: "Dubai → New York" },
  { from: "JED", to: "CDG", fromFlag: flag("SA"), toFlag: flag("FR"), label: "Jeddah → Paris", labelEn: "Jeddah → Paris" },
  { from: "DXB", to: "SIN", fromFlag: flag("AE"), toFlag: flag("SG"), label: "Dubaï → Singapour", labelEn: "Dubai → Singapore" },
  { from: "DXB", to: "NBO", fromFlag: flag("AE"), toFlag: flag("KE"), label: "Dubaï → Nairobi", labelEn: "Dubai → Nairobi" },
];

const ASIA_PACIFIC: GeoRoute[] = [
  { from: "SIN", to: "NRT", fromFlag: flag("SG"), toFlag: flag("JP"), label: "Singapour → Tokyo", labelEn: "Singapore → Tokyo", tag: { fr: "Populaire", en: "Popular" } },
  { from: "SIN", to: "SYD", fromFlag: flag("SG"), toFlag: flag("AU"), label: "Singapour → Sydney", labelEn: "Singapore ��� Sydney" },
  { from: "BKK", to: "NRT", fromFlag: flag("TH"), toFlag: flag("JP"), label: "Bangkok → Tokyo", labelEn: "Bangkok → Tokyo" },
  { from: "SYD", to: "LAX", fromFlag: flag("AU"), toFlag: flag("US"), label: "Sydney → Los Angeles", labelEn: "Sydney → Los Angeles" },
  { from: "NRT", to: "JFK", fromFlag: flag("JP"), toFlag: flag("US"), label: "Tokyo → New York", labelEn: "Tokyo → New York" },
  { from: "DEL", to: "LHR", fromFlag: flag("IN"), toFlag: flag("GB"), label: "Delhi → Londres", labelEn: "Delhi → London" },
  { from: "BOM", to: "DXB", fromFlag: flag("IN"), toFlag: flag("AE"), label: "Mumbai → Dubaï", labelEn: "Mumbai → Dubai" },
  { from: "SIN", to: "LHR", fromFlag: flag("SG"), toFlag: flag("GB"), label: "Singapour → Londres", labelEn: "Singapore → London" },
];

const SOUTH_AMERICA: GeoRoute[] = [
  { from: "GRU", to: "CDG", fromFlag: flag("BR"), toFlag: flag("FR"), label: "São Paulo → Paris", labelEn: "São Paulo → Paris", tag: { fr: "Populaire", en: "Popular" } },
  { from: "GRU", to: "JFK", fromFlag: flag("BR"), toFlag: flag("US"), label: "São Paulo → New York", labelEn: "São Paulo → New York" },
  { from: "BOG", to: "MIA", fromFlag: flag("CO"), toFlag: flag("US"), label: "Bogotá → Miami", labelEn: "Bogotá → Miami" },
  { from: "EZE", to: "CDG", fromFlag: flag("AR"), toFlag: flag("FR"), label: "Buenos Aires → Paris", labelEn: "Buenos Aires → Paris" },
  { from: "GRU", to: "LIS", fromFlag: flag("BR"), toFlag: flag("PT"), label: "São Paulo → Lisbonne", labelEn: "São Paulo → Lisbon" },
  { from: "SCL", to: "JFK", fromFlag: flag("CL"), toFlag: flag("US"), label: "Santiago → New York", labelEn: "Santiago → New York" },
  { from: "LIM", to: "MIA", fromFlag: flag("PE"), toFlag: flag("US"), label: "Lima → Miami", labelEn: "Lima → Miami" },
  { from: "GRU", to: "DXB", fromFlag: flag("BR"), toFlag: flag("AE"), label: "São Paulo → Dubaï", labelEn: "São Paulo → Dubai" },
];

// Global fallback (the current default)
const GLOBAL: GeoRoute[] = [
  { from: "DSS", to: "CDG", fromFlag: flag("SN"), toFlag: flag("FR"), label: "Dakar → Paris", labelEn: "Dakar → Paris" },
  { from: "JFK", to: "LHR", fromFlag: flag("US"), toFlag: flag("GB"), label: "New York → Londres", labelEn: "New York → London" },
  { from: "CDG", to: "NRT", fromFlag: flag("FR"), toFlag: flag("JP"), label: "Paris → Tokyo", labelEn: "Paris → Tokyo" },
  { from: "LOS", to: "LHR", fromFlag: flag("NG"), toFlag: flag("GB"), label: "Lagos → Londres", labelEn: "Lagos → London" },
  { from: "SIN", to: "SYD", fromFlag: flag("SG"), toFlag: flag("AU"), label: "Singapour → Sydney", labelEn: "Singapore → Sydney" },
  { from: "CMN", to: "JFK", fromFlag: flag("MA"), toFlag: flag("US"), label: "Casablanca → New York", labelEn: "Casablanca → New York" },
  { from: "NBO", to: "DXB", fromFlag: flag("KE"), toFlag: flag("AE"), label: "Nairobi → Dubaï", labelEn: "Nairobi → Dubai" },
  { from: "LAX", to: "BKK", fromFlag: flag("US"), toFlag: flag("TH"), label: "Los Angeles → Bangkok", labelEn: "Los Angeles → Bangkok" },
];

// ─── Country → Region mapping ──────────��───────────────────────────────────

const COUNTRY_TO_REGION: Record<string, GeoRoute[]> = {};

// West Africa (CFA zone + neighbors)
for (const c of ["SN", "CI", "ML", "BF", "NE", "TG", "BJ", "GW", "GN", "GH", "GM", "LR", "SL", "NG"]) {
  COUNTRY_TO_REGION[c] = c === "NG" ? [
    // Nigeria-specific: Lagos as main hub
    { from: "LOS", to: "LHR", fromFlag: flag("NG"), toFlag: flag("GB"), label: "Lagos → Londres", labelEn: "Lagos → London", tag: { fr: "Populaire", en: "Popular" } },
    { from: "LOS", to: "JFK", fromFlag: flag("NG"), toFlag: flag("US"), label: "Lagos → New York", labelEn: "Lagos → New York" },
    { from: "ABV", to: "DXB", fromFlag: flag("NG"), toFlag: flag("AE"), label: "Abuja → Dubaï", labelEn: "Abuja → Dubai" },
    { from: "LOS", to: "CDG", fromFlag: flag("NG"), toFlag: flag("FR"), label: "Lagos → Paris", labelEn: "Lagos → Paris" },
    { from: "LOS", to: "ACC", fromFlag: flag("NG"), toFlag: flag("GH"), label: "Lagos → Accra", labelEn: "Lagos → Accra" },
    { from: "LOS", to: "IST", fromFlag: flag("NG"), toFlag: flag("TR"), label: "Lagos → Istanbul", labelEn: "Lagos → Istanbul" },
    { from: "LOS", to: "NBO", fromFlag: flag("NG"), toFlag: flag("KE"), label: "Lagos → Nairobi", labelEn: "Lagos ��� Nairobi" },
    { from: "LOS", to: "JNB", fromFlag: flag("NG"), toFlag: flag("ZA"), label: "Lagos → Johannesburg", labelEn: "Lagos → Johannesburg" },
  ] : WEST_AFRICA;
}

// North Africa
for (const c of ["MA", "DZ", "TN", "LY", "EG"]) {
  COUNTRY_TO_REGION[c] = c === "EG" ? [
    { from: "CAI", to: "DXB", fromFlag: flag("EG"), toFlag: flag("AE"), label: "Le Caire → Dubaï", labelEn: "Cairo → Dubai", tag: { fr: "Populaire", en: "Popular" } },
    { from: "CAI", to: "LHR", fromFlag: flag("EG"), toFlag: flag("GB"), label: "Le Caire → Londres", labelEn: "Cairo → London" },
    { from: "CAI", to: "CDG", fromFlag: flag("EG"), toFlag: flag("FR"), label: "Le Caire → Paris", labelEn: "Cairo → Paris" },
    { from: "CAI", to: "IST", fromFlag: flag("EG"), toFlag: flag("TR"), label: "Le Caire → Istanbul", labelEn: "Cairo → Istanbul" },
    { from: "CAI", to: "JFK", fromFlag: flag("EG"), toFlag: flag("US"), label: "Le Caire → New York", labelEn: "Cairo → New York" },
    ...NORTH_AFRICA.slice(0, 3),
  ] : NORTH_AFRICA;
}

// East Africa
for (const c of ["KE", "TZ", "UG", "RW", "ET", "DJ", "SO"]) {
  COUNTRY_TO_REGION[c] = EAST_AFRICA;
}

// Southern Africa
for (const c of ["ZA", "BW", "MZ", "ZW", "NA", "ZM", "MW"]) {
  COUNTRY_TO_REGION[c] = [
    { from: "JNB", to: "LHR", fromFlag: flag("ZA"), toFlag: flag("GB"), label: "Johannesburg → Londres", labelEn: "Johannesburg → London", tag: { fr: "Populaire", en: "Popular" } },
    { from: "JNB", to: "DXB", fromFlag: flag("ZA"), toFlag: flag("AE"), label: "Johannesburg → Dubaï", labelEn: "Johannesburg → Dubai" },
    { from: "CPT", to: "CDG", fromFlag: flag("ZA"), toFlag: flag("FR"), label: "Le Cap → Paris", labelEn: "Cape Town → Paris" },
    { from: "JNB", to: "SIN", fromFlag: flag("ZA"), toFlag: flag("SG"), label: "Johannesburg → Singapour", labelEn: "Johannesburg → Singapore" },
    { from: "JNB", to: "NRT", fromFlag: flag("ZA"), toFlag: flag("JP"), label: "Johannesburg → Tokyo", labelEn: "Johannesburg → Tokyo" },
    { from: "JNB", to: "JFK", fromFlag: flag("ZA"), toFlag: flag("US"), label: "Johannesburg → New York", labelEn: "Johannesburg → New York" },
    { from: "JNB", to: "NBO", fromFlag: flag("ZA"), toFlag: flag("KE"), label: "Johannesburg → Nairobi", labelEn: "Johannesburg → Nairobi" },
    { from: "CPT", to: "LHR", fromFlag: flag("ZA"), toFlag: flag("GB"), label: "Le Cap → Londres", labelEn: "Cape Town → London" },
  ];
}

// France
COUNTRY_TO_REGION["FR"] = FRANCE;

// Europe (non-France)
for (const c of ["DE", "IT", "ES", "PT", "NL", "BE", "AT", "IE", "FI", "GR", "LU", "SK", "SI", "EE", "LV", "LT", "CY", "MT", "HR", "PL", "CZ", "HU", "RO", "BG", "GB"]) {
  COUNTRY_TO_REGION[c] = EUROPE;
}

// Turkey
COUNTRY_TO_REGION["TR"] = [
  { from: "IST", to: "JFK", fromFlag: flag("TR"), toFlag: flag("US"), label: "Istanbul → New York", labelEn: "Istanbul → New York", tag: { fr: "Populaire", en: "Popular" } },
  { from: "IST", to: "NRT", fromFlag: flag("TR"), toFlag: flag("JP"), label: "Istanbul → Tokyo", labelEn: "Istanbul → Tokyo" },
  { from: "IST", to: "BKK", fromFlag: flag("TR"), toFlag: flag("TH"), label: "Istanbul → Bangkok", labelEn: "Istanbul → Bangkok" },
  { from: "IST", to: "DXB", fromFlag: flag("TR"), toFlag: flag("AE"), label: "Istanbul → Dubaï", labelEn: "Istanbul → Dubai" },
  { from: "IST", to: "CDG", fromFlag: flag("TR"), toFlag: flag("FR"), label: "Istanbul → Paris", labelEn: "Istanbul → Paris" },
  { from: "IST", to: "LHR", fromFlag: flag("TR"), toFlag: flag("GB"), label: "Istanbul → Londres", labelEn: "Istanbul → London" },
  { from: "IST", to: "SIN", fromFlag: flag("TR"), toFlag: flag("SG"), label: "Istanbul → Singapour", labelEn: "Istanbul → Singapore" },
  { from: "IST", to: "MLE", fromFlag: flag("TR"), toFlag: flag("MV"), label: "Istanbul → Maldives", labelEn: "Istanbul → Maldives" },
];

// USA
COUNTRY_TO_REGION["US"] = USA;
COUNTRY_TO_REGION["PR"] = USA;

// Canada
COUNTRY_TO_REGION["CA"] = CANADA;

// Middle East
for (const c of ["AE", "SA", "QA", "BH", "KW", "OM"]) {
  COUNTRY_TO_REGION[c] = MIDDLE_EAST;
}

// Asia-Pacific
for (const c of ["JP", "SG", "TH", "MY", "ID", "VN", "PH", "KR", "AU", "NZ", "IN", "LK", "BD", "PK", "CN", "HK", "TW"]) {
  COUNTRY_TO_REGION[c] = ASIA_PACIFIC;
}

// South America
for (const c of ["BR", "AR", "CL", "CO", "PE", "EC", "VE", "UY", "PY", "BO"]) {
  COUNTRY_TO_REGION[c] = SOUTH_AMERICA;
}

// ─── Public API ──────���─────────────────────────────────────────────────────

/** Get personalized routes for a country code (ISO2) */
export function getRoutesForCountry(countryCode: string | null | undefined): GeoRoute[] {
  if (!countryCode) return GLOBAL;
  const routes = COUNTRY_TO_REGION[countryCode.toUpperCase()];
  return routes ?? GLOBAL;
}

/** Get region label for display */
export function getRegionLabel(countryCode: string | null | undefined): { fr: string; en: string } {
  if (!countryCode) return { fr: "Routes populaires", en: "Popular routes" };

  const c = countryCode.toUpperCase();
  // Personalized labels
  const labels: Record<string, { fr: string; en: string }> = {
    SN: { fr: "Vols depuis le Sénégal", en: "Flights from Senegal" },
    CI: { fr: "Vols depuis la Côte d'Ivoire", en: "Flights from Ivory Coast" },
    NG: { fr: "Vols depuis le Nigeria", en: "Flights from Nigeria" },
    MA: { fr: "Vols depuis le Maroc", en: "Flights from Morocco" },
    KE: { fr: "Vols depuis le Kenya", en: "Flights from Kenya" },
    ZA: { fr: "Vols depuis l'Afrique du Sud", en: "Flights from South Africa" },
    EG: { fr: "Vols depuis l'Égypte", en: "Flights from Egypt" },
    FR: { fr: "Vols depuis la France", en: "Flights from France" },
    GB: { fr: "Vols depuis le Royaume-Uni", en: "Flights from the UK" },
    DE: { fr: "Vols depuis l'Allemagne", en: "Flights from Germany" },
    US: { fr: "Vols depuis les USA", en: "Flights from the US" },
    CA: { fr: "Vols depuis le Canada", en: "Flights from Canada" },
    TR: { fr: "Vols depuis la Turquie", en: "Flights from Turkey" },
    AE: { fr: "Vols depuis les Émirats", en: "Flights from the UAE" },
    SA: { fr: "Vols depuis l'Arabie Saoudite", en: "Flights from Saudi Arabia" },
    JP: { fr: "Vols depuis le Japon", en: "Flights from Japan" },
    AU: { fr: "Vols depuis l'Australie", en: "Flights from Australia" },
    BR: { fr: "Vols depuis le Brésil", en: "Flights from Brazil" },
    IN: { fr: "Vols depuis l'Inde", en: "Flights from India" },
    SG: { fr: "Vols depuis Singapour", en: "Flights from Singapore" },
  };

  return labels[c] ?? { fr: "Routes populaires pour vous", en: "Popular routes for you" };
}
