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
  // ── Amériques ──
  { iata: "JFK", city: "New York",    country: "USA",            flag: "🇺🇸", region: "americas",    unsplashQuery: "new york city skyline",           cashEstimateUsd: 820,  milesEstimate: 55000, lat: 40.6413,  lon: -73.7781 },
  { iata: "MIA", city: "Miami",       country: "USA",            flag: "🇺🇸", region: "americas",    unsplashQuery: "miami beach sunset",              cashEstimateUsd: 780,  milesEstimate: 50000, lat: 25.7959,  lon: -80.2870 },
  { iata: "YUL", city: "Montréal",    country: "Canada",         flag: "🇨🇦", region: "americas",    unsplashQuery: "montreal canada old city",        cashEstimateUsd: 760,  milesEstimate: 48000, lat: 45.4706,  lon: -73.7408 },
  { iata: "GRU", city: "São Paulo",   country: "Brésil",         flag: "🇧🇷", region: "americas",    unsplashQuery: "sao paulo brazil aerial",         cashEstimateUsd: 950,  milesEstimate: 60000, lat: -23.4356, lon: -46.4731 },
  // ── Asie ──
  { iata: "NRT", city: "Tokyo",       country: "Japon",          flag: "🇯🇵", region: "asia",        unsplashQuery: "tokyo japan shibuya",             cashEstimateUsd: 1100, milesEstimate: 65000, lat: 35.7720,  lon: 140.3929 },
  { iata: "BKK", city: "Bangkok",     country: "Thaïlande",      flag: "🇹🇭", region: "asia",        unsplashQuery: "bangkok thailand temple",         cashEstimateUsd: 850,  milesEstimate: 50000, lat: 13.6900,  lon: 100.7501 },
  { iata: "SIN", city: "Singapour",   country: "Singapour",      flag: "🇸🇬", region: "asia",        unsplashQuery: "singapore marina bay sands",      cashEstimateUsd: 900,  milesEstimate: 55000, lat: 1.3644,   lon: 103.9915 },
  // ── Moyen-Orient ──
  { iata: "DXB", city: "Dubaï",       country: "EAU",            flag: "🇦🇪", region: "middle-east", unsplashQuery: "dubai burj khalifa skyline",      cashEstimateUsd: 490,  milesEstimate: 28000, lat: 25.2532,  lon: 55.3657  },
  { iata: "DOH", city: "Doha",        country: "Qatar",          flag: "🇶🇦", region: "middle-east", unsplashQuery: "doha qatar cityscape",            cashEstimateUsd: 460,  milesEstimate: 26000, lat: 25.2731,  lon: 51.6081  },
  // ── Afrique ──
  { iata: "CMN", city: "Casablanca",  country: "Maroc",          flag: "🇲🇦", region: "africa",      unsplashQuery: "casablanca morocco architecture", cashEstimateUsd: 320,  milesEstimate: 18000, lat: 33.3675,  lon: -7.5898  },
  { iata: "CAI", city: "Le Caire",    country: "Égypte",         flag: "🇪🇬", region: "africa",      unsplashQuery: "cairo egypt pyramids",            cashEstimateUsd: 380,  milesEstimate: 20000, lat: 30.1219,  lon: 31.4056  },
  { iata: "LOS", city: "Lagos",       country: "Nigeria",        flag: "🇳🇬", region: "africa",      unsplashQuery: "lagos nigeria city",              cashEstimateUsd: 450,  milesEstimate: 25000, lat: 6.5774,   lon: 3.3212   },
  { iata: "NBO", city: "Nairobi",     country: "Kenya",          flag: "🇰🇪", region: "africa",      unsplashQuery: "nairobi kenya savanna",           cashEstimateUsd: 520,  milesEstimate: 28000, lat: -1.3192,  lon: 36.9275  },
  { iata: "ABJ", city: "Abidjan",     country: "Côte d'Ivoire",  flag: "🇨🇮", region: "africa",      unsplashQuery: "abidjan ivory coast city",        cashEstimateUsd: 480,  milesEstimate: 26000, lat: 5.2613,   lon: -3.9267  },
  // ── Océanie ──
  { iata: "SYD", city: "Sydney",      country: "Australie",      flag: "🇦🇺", region: "oceania",     unsplashQuery: "sydney opera house harbour",      cashEstimateUsd: 1400, milesEstimate: 85000, lat: -33.9461, lon: 151.1772 },
];
