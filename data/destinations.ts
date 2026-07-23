// data/destinations.ts

export type Region = "africa" | "europe" | "americas" | "asia" | "middle-east" | "oceania";

export interface Destination {
  iata: string;           // code aéroport destination
  city: string;
  country: string;
  flag: string;           // emoji drapeau
  region: Region;
  unsplashQuery: string;  // requête pour Unsplash API
  // prix indicatifs depuis DSS (fallback si pas de deal live)
  cashEstimateUsd: number;
  milesEstimate: number;
  lat: number;   // WGS84 latitude (airport)
  lon: number;   // WGS84 longitude (airport)
}

export const DESTINATIONS: Destination[] = [
  // ── Europe ──
  { iata: "CDG", city: "Paris",       country: "France",         flag: "🇫🇷", region: "europe",      unsplashQuery: "paris eiffel tower",             cashEstimateUsd: 680,  milesEstimate: 35000, lat: 49.0097,  lon: 2.5479   },
  { iata: "LHR", city: "Londres",     country: "UK",             flag: "🇬🇧", region: "europe",      unsplashQuery: "london tower bridge",             cashEstimateUsd: 580,  milesEstimate: 30000, lat: 51.4775,  lon: -0.4614  },
  { iata: "MAD", city: "Madrid",      country: "Espagne",        flag: "🇪🇸", region: "europe",      unsplashQuery: "madrid spain city",               cashEstimateUsd: 520,  milesEstimate: 28000, lat: 40.4983,  lon: -3.5676  },
  { iata: "FCO", city: "Rome",        country: "Italie",         flag: "🇮🇹", region: "europe",      unsplashQuery: "rome colosseum italy",             cashEstimateUsd: 550,  milesEstimate: 30000, lat: 41.8003,  lon: 12.2389  },
  { iata: "IST", city: "Istanbul",    country: "Turquie",        flag: "🇹🇷", region: "europe",      unsplashQuery: "istanbul turkey bosphorus",       cashEstimateUsd: 420,  milesEstimate: 22000, lat: 40.9769,  lon: 28.8146  },
  { iata: "AMS", city: "Amsterdam",   country: "Pays-Bas",       flag: "🇳🇱", region: "europe",      unsplashQuery: "amsterdam canals netherlands",    cashEstimateUsd: 620,  milesEstimate: 32000, lat: 52.3086,  lon: 4.7639   },
  { iata: "BRU", city: "Bruxelles",   country: "Belgique",       flag: "🇧🇪", region: "europe",      unsplashQuery: "brussels belgium grand place",    cashEstimateUsd: 640,  milesEstimate: 33000, lat: 50.9014,  lon: 4.4844   },
  { iata: "FRA", city: "Francfort",   country: "Allemagne",      flag: "🇩🇪", region: "europe",      unsplashQuery: "frankfurt germany skyline",       cashEstimateUsd: 630,  milesEstimate: 32000, lat: 50.0267,  lon: 8.5584   },
  // ── Amériques ──
  { iata: "JFK", city: "New York",    country: "USA",            flag: "🇺🇸", region: "americas",    unsplashQuery: "new york city skyline",           cashEstimateUsd: 820,  milesEstimate: 55000, lat: 40.6413,  lon: -73.7781 },
  { iata: "MIA", city: "Miami",       country: "USA",            flag: "🇺🇸", region: "americas",    unsplashQuery: "miami beach sunset",              cashEstimateUsd: 780,  milesEstimate: 50000, lat: 25.7959,  lon: -80.2870 },
  { iata: "YUL", city: "Montréal",    country: "Canada",         flag: "🇨🇦", region: "americas",    unsplashQuery: "montreal canada old city",        cashEstimateUsd: 760,  milesEstimate: 48000, lat: 45.4706,  lon: -73.7408 },
  { iata: "LAX", city: "Los Angeles", country: "USA",            flag: "🇺🇸", region: "americas",    unsplashQuery: "los angeles hollywood sign",      cashEstimateUsd: 800,  milesEstimate: 50000, lat: 33.9425,  lon: -118.4081 },
  { iata: "ORD", city: "Chicago",     country: "USA",            flag: "🇺🇸", region: "americas",    unsplashQuery: "chicago skyline illinois",        cashEstimateUsd: 750,  milesEstimate: 48000, lat: 41.9742,  lon: -87.9073 },
  { iata: "GRU", city: "São Paulo",   country: "Brésil",         flag: "🇧🇷", region: "americas",    unsplashQuery: "sao paulo brazil aerial",         cashEstimateUsd: 950,  milesEstimate: 60000, lat: -23.4356, lon: -46.4731 },
  { iata: "SFO", city: "San Francisco", country: "USA",          flag: "🇺🇸", region: "americas",    unsplashQuery: "san francisco golden gate bridge", cashEstimateUsd: 830,  milesEstimate: 52000, lat: 37.6198,  lon: -122.3748 },
  { iata: "MEX", city: "Mexico",      country: "Mexique",        flag: "🇲🇽", region: "americas",    unsplashQuery: "mexico city zocalo",              cashEstimateUsd: 850,  milesEstimate: 52000, lat: 19.4358,  lon: -99.0703 },
  { iata: "BOG", city: "Bogotá",      country: "Colombie",       flag: "🇨🇴", region: "americas",    unsplashQuery: "bogota colombia city",            cashEstimateUsd: 870,  milesEstimate: 55000, lat: 4.7016,   lon: -74.1469 },
  { iata: "EZE", city: "Buenos Aires", country: "Argentine",     flag: "🇦🇷", region: "americas",    unsplashQuery: "buenos aires argentina",          cashEstimateUsd: 1050, milesEstimate: 65000, lat: -34.8222, lon: -58.5358 },
  { iata: "SJO", city: "San José",    country: "Costa Rica",     flag: "🇨🇷", region: "americas",    unsplashQuery: "san jose costa rica",             cashEstimateUsd: 890,  milesEstimate: 55000, lat: 9.9939,   lon: -84.2088 },
  // ── Asie ──
  { iata: "NRT", city: "Tokyo",       country: "Japon",          flag: "🇯🇵", region: "asia",        unsplashQuery: "tokyo japan shibuya",             cashEstimateUsd: 1100, milesEstimate: 65000, lat: 35.7720,  lon: 140.3929 },
  { iata: "ICN", city: "Séoul",       country: "Corée du Sud",   flag: "🇰🇷", region: "asia",        unsplashQuery: "seoul south korea skyline",       cashEstimateUsd: 950,  milesEstimate: 55000, lat: 37.4602,  lon: 126.4407 },
  { iata: "BKK", city: "Bangkok",     country: "Thaïlande",      flag: "🇹🇭", region: "asia",        unsplashQuery: "bangkok thailand temple",         cashEstimateUsd: 850,  milesEstimate: 50000, lat: 13.6900,  lon: 100.7501 },
  { iata: "SIN", city: "Singapour",   country: "Singapour",      flag: "🇸🇬", region: "asia",        unsplashQuery: "singapore marina bay sands",      cashEstimateUsd: 900,  milesEstimate: 55000, lat: 1.3644,   lon: 103.9915 },
  { iata: "HKG", city: "Hong Kong",   country: "Hong Kong",      flag: "🇭🇰", region: "asia",        unsplashQuery: "hong kong skyline harbour",       cashEstimateUsd: 1050, milesEstimate: 62000, lat: 22.3118,  lon: 113.9149 },
  { iata: "HND", city: "Tokyo Haneda", country: "Japon",         flag: "🇯🇵", region: "asia",        unsplashQuery: "tokyo japan haneda",              cashEstimateUsd: 1100, milesEstimate: 65000, lat: 35.5497,  lon: 139.7870 },
  { iata: "KUL", city: "Kuala Lumpur", country: "Malaisie",      flag: "🇲🇾", region: "asia",        unsplashQuery: "kuala lumpur petronas towers",    cashEstimateUsd: 880,  milesEstimate: 52000, lat: 2.7456,   lon: 101.7100 },
  // ── Moyen-Orient ──
  { iata: "DXB", city: "Dubaï",       country: "EAU",            flag: "🇦🇪", region: "middle-east", unsplashQuery: "dubai burj khalifa skyline",      cashEstimateUsd: 490,  milesEstimate: 28000, lat: 25.2532,  lon: 55.3657  },
  { iata: "DOH", city: "Doha",        country: "Qatar",          flag: "🇶🇦", region: "middle-east", unsplashQuery: "doha qatar cityscape",            cashEstimateUsd: 460,  milesEstimate: 26000, lat: 25.2731,  lon: 51.6081  },
  { iata: "AUH", city: "Abou Dabi",   country: "EAU",            flag: "🇦🇪", region: "middle-east", unsplashQuery: "abu dhabi skyline uae",           cashEstimateUsd: 500,  milesEstimate: 28000, lat: 24.4410,  lon: 54.6492  },
  // ── Afrique ──
  { iata: "CMN", city: "Casablanca",  country: "Maroc",          flag: "🇲🇦", region: "africa",      unsplashQuery: "casablanca morocco architecture", cashEstimateUsd: 320,  milesEstimate: 18000, lat: 33.3675,  lon: -7.5898  },
  { iata: "CAI", city: "Le Caire",    country: "Égypte",         flag: "🇪🇬", region: "africa",      unsplashQuery: "cairo egypt pyramids",            cashEstimateUsd: 380,  milesEstimate: 20000, lat: 30.1219,  lon: 31.4056  },
  { iata: "LOS", city: "Lagos",       country: "Nigeria",        flag: "🇳🇬", region: "africa",      unsplashQuery: "lagos nigeria city",              cashEstimateUsd: 450,  milesEstimate: 25000, lat: 6.5774,   lon: 3.3212   },
  { iata: "NBO", city: "Nairobi",     country: "Kenya",          flag: "🇰🇪", region: "africa",      unsplashQuery: "nairobi kenya savanna",           cashEstimateUsd: 520,  milesEstimate: 28000, lat: -1.3192,  lon: 36.9275  },
  { iata: "JNB", city: "Johannesburg", country: "Afrique du Sud", flag: "🇿🇦", region: "africa",     unsplashQuery: "johannesburg south africa city",  cashEstimateUsd: 1100, milesEstimate: 65000, lat: -25.7461, lon: 28.2342  },
  { iata: "ABJ", city: "Abidjan",     country: "Côte d'Ivoire",  flag: "🇨🇮", region: "africa",      unsplashQuery: "abidjan ivory coast city",        cashEstimateUsd: 480,  milesEstimate: 26000, lat: 5.2613,   lon: -3.9267  },
  { iata: "ACC", city: "Accra",       country: "Ghana",          flag: "🇬🇭", region: "africa",      unsplashQuery: "accra ghana city",                cashEstimateUsd: 380,  milesEstimate: 20000, lat: 5.6052,   lon: -0.1668  },
  { iata: "ADD", city: "Addis-Abeba", country: "Éthiopie",       flag: "🇪🇹", region: "africa",      unsplashQuery: "addis ababa ethiopia",            cashEstimateUsd: 550,  milesEstimate: 30000, lat: 8.9779,   lon: 38.7993  },
  { iata: "CPT", city: "Le Cap",      country: "Afrique du Sud", flag: "🇿🇦", region: "africa",      unsplashQuery: "cape town table mountain",        cashEstimateUsd: 1150, milesEstimate: 68000, lat: -33.9740, lon: 18.6043  },
  { iata: "KGL", city: "Kigali",      country: "Rwanda",         flag: "🇷🇼", region: "africa",      unsplashQuery: "kigali rwanda city",              cashEstimateUsd: 560,  milesEstimate: 30000, lat: -1.9686,  lon: 30.1395  },
  { iata: "LAD", city: "Luanda",      country: "Angola",         flag: "🇦🇴", region: "africa",      unsplashQuery: "luanda angola city",              cashEstimateUsd: 420,  milesEstimate: 24000, lat: -8.8584,  lon: 13.2312  },
  // ── Océanie ──
  { iata: "SYD", city: "Sydney",      country: "Australie",      flag: "🇦🇺", region: "oceania",     unsplashQuery: "sydney opera house harbour",      cashEstimateUsd: 1400, milesEstimate: 85000, lat: -33.9461, lon: 151.1772 },
  { iata: "AKL", city: "Auckland",    country: "Nouvelle-Zélande", flag: "🇳🇿", region: "oceania",   unsplashQuery: "auckland new zealand skyline",    cashEstimateUsd: 1550, milesEstimate: 90000, lat: -37.0120, lon: 174.7863 },
];
