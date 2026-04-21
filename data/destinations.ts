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
}

export const DESTINATIONS: Destination[] = [
  // ── Europe ──
  { iata: "CDG", city: "Paris",       country: "France",      flag: "🇫🇷", region: "europe",       unsplashQuery: "paris eiffel tower",          cashEstimateUsd: 680,  milesEstimate: 35000 },
  { iata: "LHR", city: "Londres",     country: "UK",          flag: "🇬🇧", region: "europe",       unsplashQuery: "london tower bridge",          cashEstimateUsd: 580,  milesEstimate: 30000 },
  { iata: "MAD", city: "Madrid",      country: "Espagne",     flag: "🇪🇸", region: "europe",       unsplashQuery: "madrid spain city",            cashEstimateUsd: 520,  milesEstimate: 28000 },
  { iata: "FCO", city: "Rome",        country: "Italie",      flag: "🇮🇹", region: "europe",       unsplashQuery: "rome colosseum italy",         cashEstimateUsd: 550,  milesEstimate: 30000 },
  { iata: "IST", city: "Istanbul",    country: "Turquie",     flag: "🇹🇷", region: "europe",       unsplashQuery: "istanbul turkey bosphorus",    cashEstimateUsd: 420,  milesEstimate: 22000 },
  // ── Amériques ──
  { iata: "JFK", city: "New York",    country: "USA",         flag: "🇺🇸", region: "americas",     unsplashQuery: "new york city skyline",        cashEstimateUsd: 820,  milesEstimate: 55000 },
  { iata: "MIA", city: "Miami",       country: "USA",         flag: "🇺🇸", region: "americas",     unsplashQuery: "miami beach sunset",           cashEstimateUsd: 780,  milesEstimate: 50000 },
  { iata: "YUL", city: "Montréal",    country: "Canada",      flag: "🇨🇦", region: "americas",     unsplashQuery: "montreal canada old city",     cashEstimateUsd: 760,  milesEstimate: 48000 },
  { iata: "GRU", city: "São Paulo",   country: "Brésil",      flag: "🇧🇷", region: "americas",     unsplashQuery: "sao paulo brazil aerial",      cashEstimateUsd: 950,  milesEstimate: 60000 },
  // ── Asie ──
  { iata: "NRT", city: "Tokyo",       country: "Japon",       flag: "🇯🇵", region: "asia",         unsplashQuery: "tokyo japan shibuya",          cashEstimateUsd: 1100, milesEstimate: 65000 },
  { iata: "BKK", city: "Bangkok",     country: "Thaïlande",   flag: "🇹🇭", region: "asia",         unsplashQuery: "bangkok thailand temple",      cashEstimateUsd: 850,  milesEstimate: 50000 },
  { iata: "SIN", city: "Singapour",   country: "Singapour",   flag: "🇸🇬", region: "asia",         unsplashQuery: "singapore marina bay sands",  cashEstimateUsd: 900,  milesEstimate: 55000 },
  // ── Moyen-Orient ──
  { iata: "DXB", city: "Dubaï",       country: "EAU",         flag: "🇦🇪", region: "middle-east",  unsplashQuery: "dubai burj khalifa skyline",   cashEstimateUsd: 490,  milesEstimate: 28000 },
  { iata: "DOH", city: "Doha",        country: "Qatar",       flag: "🇶🇦", region: "middle-east",  unsplashQuery: "doha qatar cityscape",         cashEstimateUsd: 460,  milesEstimate: 26000 },
  // ── Afrique ──
  { iata: "CMN", city: "Casablanca",  country: "Maroc",       flag: "🇲🇦", region: "africa",       unsplashQuery: "casablanca morocco architecture", cashEstimateUsd: 320, milesEstimate: 18000 },
  { iata: "CAI", city: "Le Caire",    country: "Égypte",      flag: "🇪🇬", region: "africa",       unsplashQuery: "cairo egypt pyramids",         cashEstimateUsd: 380,  milesEstimate: 20000 },
  { iata: "LOS", city: "Lagos",       country: "Nigeria",     flag: "🇳🇬", region: "africa",       unsplashQuery: "lagos nigeria city",           cashEstimateUsd: 450,  milesEstimate: 25000 },
  { iata: "NBO", city: "Nairobi",     country: "Kenya",       flag: "🇰🇪", region: "africa",       unsplashQuery: "nairobi kenya savanna",        cashEstimateUsd: 520,  milesEstimate: 28000 },
  { iata: "ABJ", city: "Abidjan",     country: "Côte d'Ivoire", flag: "🇨🇮", region: "africa",    unsplashQuery: "abidjan ivory coast city",     cashEstimateUsd: 480,  milesEstimate: 26000 },
  // ── Océanie ──
  { iata: "SYD", city: "Sydney",      country: "Australie",   flag: "🇦🇺", region: "oceania",      unsplashQuery: "sydney opera house harbour",   cashEstimateUsd: 1400, milesEstimate: 85000 },
];
