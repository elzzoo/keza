export interface TransferPartner {
  from: string;   // Points currency (e.g. "Amex MR")
  to: string;     // Airline program (e.g. "Flying Blue")
  ratio: number;  // Transfer ratio (e.g. 1.0 = 1:1)
}

export const TRANSFERS: TransferPartner[] = [
  { from: "Amex MR", to: "Flying Blue", ratio: 1.0 },
  { from: "Amex MR", to: "Emirates Skywards", ratio: 1.0 },
  { from: "Amex MR", to: "Qatar Privilege Club", ratio: 1.0 },
  { from: "Amex MR", to: "British Airways Avios", ratio: 1.0 },
  { from: "Chase UR", to: "United MileagePlus", ratio: 1.0 },
  { from: "Chase UR", to: "British Airways Avios", ratio: 1.0 },
  { from: "Chase UR", to: "Flying Blue", ratio: 1.0 },
  { from: "Citi TY", to: "Turkish Miles&Smiles", ratio: 1.0 },
  { from: "Citi TY", to: "Qatar Privilege Club", ratio: 1.0 },
  { from: "Capital One", to: "Flying Blue", ratio: 1.0 },
  { from: "Capital One", to: "Turkish Miles&Smiles", ratio: 1.0 },
];
