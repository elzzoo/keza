export const ALLIANCES: Record<string, string> = {
  // SkyTeam
  "Air France": "SkyTeam",
  "KLM": "SkyTeam",
  "Delta": "SkyTeam",
  "Korean Air": "SkyTeam",
  "China Southern": "SkyTeam",
  "Aeromexico": "SkyTeam",
  "Air Europa": "SkyTeam",
  "ITA Airways": "SkyTeam",
  "Kenya Airways": "SkyTeam",
  "ASKY Airlines": "SkyTeam",
  // SkyTeam subsidiaries / affiliates — must be mapped to prevent zone-fallback
  "Transavia France": "SkyTeam",   // Air France-KLM group subsidiary (IATA: TO)
  "Transavia": "SkyTeam",          // KLM group subsidiary (IATA: HV)
  "HOP! Air France": "SkyTeam",    // Air France regional brand (IATA: A5)
  "Tarom": "SkyTeam",              // Romanian SkyTeam member
  "Vietnam Airlines": "SkyTeam",   // Full SkyTeam member
  "XiamenAir": "SkyTeam",         // China Southern affiliate
  // Star Alliance
  "Lufthansa": "Star Alliance",
  "United": "Star Alliance",
  "Air Canada": "Star Alliance",
  "Singapore Airlines": "Star Alliance",
  "Turkish Airlines": "Star Alliance",
  "Ethiopian Airlines": "Star Alliance",
  "South African Airways": "Star Alliance",
  "Swiss": "Star Alliance",
  "EgyptAir": "Star Alliance",
  "TAP Air Portugal": "Star Alliance",
  // Star Alliance affiliates / partners
  "Brussels Airlines": "Star Alliance",  // Lufthansa Group
  "Austrian Airlines": "Star Alliance",  // Lufthansa Group
  "Eurowings": "Star Alliance",          // Lufthansa Group
  "Croatia Airlines": "Star Alliance",
  "Adria Airways": "Star Alliance",
  "Aegean Airlines": "Star Alliance",
  "LOT Polish Airlines": "Star Alliance",
  "SAS": "Star Alliance",
  "All Nippon Airways": "Star Alliance", // ANA — for ANA Mileage Club matching
  "Avianca": "Star Alliance",            // for LifeMiles matching
  "TAM Airlines": "Star Alliance",       // LATAM affiliate
  // Oneworld
  "British Airways": "Oneworld",
  "American Airlines": "Oneworld",
  "Qatar Airways": "Oneworld",
  "Finnair": "Oneworld",
  "Iberia": "Oneworld",
  "Royal Air Maroc": "Oneworld",
  "Malaysia Airlines": "Oneworld",
  // Oneworld affiliates
  "Iberia Express": "Oneworld",          // Iberia subsidiary
  "Vueling": "Oneworld",                 // IAG group (BA/Iberia)
  "Level": "Oneworld",                   // IAG group low-cost
  "Japan Airlines": "Oneworld",
  "Cathay Pacific": "Oneworld",
  "SriLankan Airlines": "Oneworld",      // Associate member
  "Alaska Airlines": "Oneworld",         // Joined 2021
  // Independent
  "Emirates": "Independent",
  "Etihad": "Independent",
  "Etihad Airways": "Independent",       // globalPrograms uses this full name
  "RwandAir": "Independent",
  "Air Senegal": "Independent",
  "Air Algérie": "Independent",
  "Tunisair": "Independent",
  "flydubai": "Independent",             // Emirates group
  "Air Arabia": "Independent",
};
