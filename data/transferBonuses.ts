// data/transferBonuses.ts
// Transfer partner relationships with current effective ratios.
// promoRatio overrides baseRatio when an active bonus is running.
// Update promoRatio + promoValidUntil when a bonus is announced.

export interface TransferBonusRecord {
  from: string;               // source currency  e.g. "Amex MR"
  to: string;                 // destination program  e.g. "Flying Blue"
  baseRatio: number;          // 1.0 = 1:1,  1.25 = 25% bonus (1000 pts → 1250 miles)
  promoRatio?: number;        // active bonus ratio (overrides baseRatio)
  promoValidUntil?: string;   // ISO date
  transferTime: string;       // "instant" | "1-3 days"
}

export const TRANSFER_BONUSES: TransferBonusRecord[] = [
  // Amex Membership Rewards
  { from: "Amex MR", to: "Flying Blue",          baseRatio: 1.0, transferTime: "instant" },
  { from: "Amex MR", to: "Emirates Skywards",    baseRatio: 1.0, transferTime: "instant" },
  { from: "Amex MR", to: "Air Canada Aeroplan",  baseRatio: 1.0, transferTime: "instant" },
  { from: "Amex MR", to: "British Airways Avios",baseRatio: 1.0, transferTime: "instant" },
  { from: "Amex MR", to: "Qatar Privilege Club", baseRatio: 1.0, transferTime: "instant" },

  // Chase Ultimate Rewards
  { from: "Chase UR", to: "United MileagePlus",  baseRatio: 1.0, transferTime: "instant" },
  { from: "Chase UR", to: "Air Canada Aeroplan", baseRatio: 1.0, transferTime: "instant" },
  { from: "Chase UR", to: "British Airways Avios",baseRatio: 1.0, transferTime: "instant" },

  // Citi ThankYou
  { from: "Citi ThankYou", to: "Turkish Miles&Smiles", baseRatio: 1.0, transferTime: "1-3 days" },
  { from: "Citi ThankYou", to: "Flying Blue",           baseRatio: 1.0, transferTime: "instant" },
  { from: "Citi ThankYou", to: "Emirates Skywards",     baseRatio: 1.0, transferTime: "1-3 days" },

  // Capital One
  { from: "Capital One Miles", to: "Flying Blue",           baseRatio: 1.0, transferTime: "instant" },
  { from: "Capital One Miles", to: "Turkish Miles&Smiles",   baseRatio: 1.0, transferTime: "instant" },
  { from: "Capital One Miles", to: "Air Canada Aeroplan",    baseRatio: 1.0, transferTime: "instant" },
  { from: "Capital One Miles", to: "Emirates Skywards",      baseRatio: 1.0, transferTime: "instant" },
];

// Returns effective ratio (promo if valid and not expired, else base)
export function getEffectiveRatio(record: TransferBonusRecord): number {
  if (record.promoRatio && record.promoValidUntil) {
    const expiry = new Date(record.promoValidUntil);
    if (expiry >= new Date()) return record.promoRatio;
  }
  return record.baseRatio;
}
