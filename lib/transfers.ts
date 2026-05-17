export interface TransferPartner {
  from: string;   // Points currency (e.g. "Amex MR")
  to: string;     // Airline program (e.g. "Flying Blue")
  ratio: number;  // Transfer ratio (e.g. 1.0 = 1:1)
}

export const TRANSFERS: TransferPartner[] = [
  // Amex MR
  { from: "Amex MR", to: "Flying Blue",                 ratio: 1.0 },
  { from: "Amex MR", to: "Emirates Skywards",           ratio: 1.0 },
  { from: "Amex MR", to: "British Airways Avios",       ratio: 1.0 },
  { from: "Amex MR", to: "Air Canada Aeroplan",         ratio: 1.0 },
  { from: "Amex MR", to: "Singapore KrisFlyer",         ratio: 1.0 },
  { from: "Amex MR", to: "ANA Mileage Club",            ratio: 1.0 },
  { from: "Amex MR", to: "LifeMiles",                   ratio: 1.0 },
  { from: "Amex MR", to: "Delta SkyMiles",              ratio: 1.0 },
  { from: "Amex MR", to: "Cathay Pacific Asia Miles",   ratio: 1.0 },
  { from: "Amex MR", to: "Iberia Avios Plus",           ratio: 1.0 },
  { from: "Amex MR", to: "Virgin Atlantic Flying Club", ratio: 1.0 },
  { from: "Amex MR", to: "Ethiopian ShebaMiles",        ratio: 1.0 },
  // Chase UR
  { from: "Chase UR", to: "United MileagePlus",          ratio: 1.0 },
  { from: "Chase UR", to: "British Airways Avios",       ratio: 1.0 },
  { from: "Chase UR", to: "Flying Blue",                 ratio: 1.0 },
  { from: "Chase UR", to: "Emirates Skywards",           ratio: 1.0 },
  { from: "Chase UR", to: "Air Canada Aeroplan",         ratio: 1.0 },
  { from: "Chase UR", to: "Singapore KrisFlyer",         ratio: 1.0 },
  { from: "Chase UR", to: "Iberia Avios Plus",           ratio: 1.0 },
  { from: "Chase UR", to: "Virgin Atlantic Flying Club", ratio: 1.0 },
  { from: "Chase UR", to: "Korean Air SKYPASS",          ratio: 1.0 },
  // Citi ThankYou
  { from: "Citi ThankYou", to: "Turkish Miles&Smiles",          ratio: 1.0 },
  { from: "Citi ThankYou", to: "Qatar Privilege Club",          ratio: 1.0 },
  { from: "Citi ThankYou", to: "Flying Blue",                   ratio: 1.0 },
  { from: "Citi ThankYou", to: "Emirates Skywards",             ratio: 1.0 },
  { from: "Citi ThankYou", to: "Singapore KrisFlyer",           ratio: 1.0 },
  { from: "Citi ThankYou", to: "Cathay Pacific Asia Miles",     ratio: 1.0 },
  { from: "Citi ThankYou", to: "Virgin Atlantic Flying Club",   ratio: 1.0 },
  // Capital One Miles
  { from: "Capital One Miles", to: "Flying Blue",                 ratio: 1.0 },
  { from: "Capital One Miles", to: "Turkish Miles&Smiles",        ratio: 1.0 },
  { from: "Capital One Miles", to: "Air Canada Aeroplan",         ratio: 1.0 },
  { from: "Capital One Miles", to: "Emirates Skywards",           ratio: 1.0 },
  { from: "Capital One Miles", to: "British Airways Avios",       ratio: 1.0 },
  { from: "Capital One Miles", to: "Singapore KrisFlyer",         ratio: 1.0 },
  { from: "Capital One Miles", to: "LifeMiles",                   ratio: 1.0 },
  { from: "Capital One Miles", to: "Iberia Avios Plus",           ratio: 1.0 },
  { from: "Capital One Miles", to: "Virgin Atlantic Flying Club", ratio: 1.0 },
  { from: "Capital One Miles", to: "Cathay Pacific Asia Miles",   ratio: 1.0 },
  // Bilt Rewards
  { from: "Bilt Rewards", to: "Flying Blue",                  ratio: 1.0 },
  { from: "Bilt Rewards", to: "Turkish Miles&Smiles",         ratio: 1.0 },
  { from: "Bilt Rewards", to: "Air Canada Aeroplan",          ratio: 1.0 },
  { from: "Bilt Rewards", to: "United MileagePlus",           ratio: 1.0 },
  { from: "Bilt Rewards", to: "Singapore KrisFlyer",          ratio: 1.0 },
  { from: "Bilt Rewards", to: "British Airways Avios",        ratio: 1.0 },
  { from: "Bilt Rewards", to: "AAdvantage",                   ratio: 1.0 },
  { from: "Bilt Rewards", to: "Alaska Mileage Plan",          ratio: 1.0 },
  { from: "Bilt Rewards", to: "Emirates Skywards",            ratio: 1.0 },
  { from: "Bilt Rewards", to: "Qatar Privilege Club",         ratio: 1.0 },
];
