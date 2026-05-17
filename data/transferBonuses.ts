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
  { from: "Amex MR", to: "Flying Blue",              baseRatio: 1.0, transferTime: "instant" },
  { from: "Amex MR", to: "Emirates Skywards",        baseRatio: 1.0, transferTime: "instant" },
  { from: "Amex MR", to: "Air Canada Aeroplan",      baseRatio: 1.0, transferTime: "instant" },
  { from: "Amex MR", to: "British Airways Avios",    baseRatio: 1.0, transferTime: "instant" },
  { from: "Amex MR", to: "Ethiopian ShebaMiles",     baseRatio: 1.0, transferTime: "1-3 days" },
  { from: "Amex MR", to: "Aeromexico Club Premier",  baseRatio: 1.0, transferTime: "instant"  },

  // Chase Ultimate Rewards
  { from: "Chase UR", to: "United MileagePlus",      baseRatio: 1.0, transferTime: "instant" },
  { from: "Chase UR", to: "Flying Blue",             baseRatio: 1.0, transferTime: "instant" },
  { from: "Chase UR", to: "British Airways Avios",   baseRatio: 1.0, transferTime: "instant" },
  { from: "Chase UR", to: "Emirates Skywards",       baseRatio: 1.0, transferTime: "instant" },
  { from: "Chase UR", to: "JetBlue TrueBlue",        baseRatio: 1.0, transferTime: "instant" },
  { from: "Chase UR", to: "Southwest Rapid Rewards", baseRatio: 1.0, transferTime: "instant" },

  // Citi ThankYou
  { from: "Citi ThankYou", to: "Turkish Miles&Smiles", baseRatio: 1.0, transferTime: "1-3 days" },
  { from: "Citi ThankYou", to: "Flying Blue",           baseRatio: 1.0, transferTime: "instant" },
  { from: "Citi ThankYou", to: "Qatar Privilege Club",   baseRatio: 1.0, transferTime: "1-3 days" },
  { from: "Citi ThankYou", to: "Emirates Skywards",     baseRatio: 1.0, transferTime: "1-3 days" },

  // Capital One
  { from: "Capital One Miles", to: "Flying Blue",          baseRatio: 1.0, transferTime: "instant" },
  { from: "Capital One Miles", to: "Turkish Miles&Smiles", baseRatio: 1.0, transferTime: "instant" },
  { from: "Capital One Miles", to: "Air Canada Aeroplan",  baseRatio: 1.0, transferTime: "instant" },
  { from: "Capital One Miles", to: "Emirates Skywards",    baseRatio: 1.0, transferTime: "instant" },
  { from: "Capital One Miles", to: "British Airways Avios",baseRatio: 1.0, transferTime: "instant" },
  { from: "Capital One Miles", to: "Singapore KrisFlyer",  baseRatio: 1.0, transferTime: "instant" },
  { from: "Capital One Miles", to: "LifeMiles",            baseRatio: 1.0, transferTime: "instant" },
  { from: "Capital One Miles", to: "Iberia Avios Plus",    baseRatio: 1.0, transferTime: "instant" },
  { from: "Capital One Miles", to: "Virgin Atlantic Flying Club", baseRatio: 1.0, transferTime: "instant" },

  // Singapore KrisFlyer (Amex, Chase, Citi, Capital One already added)
  { from: "Amex MR",          to: "Singapore KrisFlyer",  baseRatio: 1.0, transferTime: "instant" },
  { from: "Chase UR",         to: "Singapore KrisFlyer",  baseRatio: 1.0, transferTime: "instant" },
  { from: "Citi ThankYou",    to: "Singapore KrisFlyer",  baseRatio: 1.0, transferTime: "1-3 days" },

  // ANA Mileage Club
  { from: "Amex MR",          to: "ANA Mileage Club",     baseRatio: 1.0, transferTime: "instant" },

  // LifeMiles (Avianca)
  { from: "Amex MR",          to: "LifeMiles",            baseRatio: 1.0, transferTime: "instant" },
  { from: "Citi ThankYou",    to: "LifeMiles",            baseRatio: 1.0, transferTime: "1-3 days" },
  { from: "Brex Rewards",     to: "LifeMiles",            baseRatio: 1.0, transferTime: "instant" },

  // Iberia Avios Plus
  { from: "Amex MR",          to: "Iberia Avios Plus",    baseRatio: 1.0, transferTime: "instant" },
  { from: "Chase UR",         to: "Iberia Avios Plus",    baseRatio: 1.0, transferTime: "instant" },

  // Virgin Atlantic Flying Club
  { from: "Amex MR",          to: "Virgin Atlantic Flying Club", baseRatio: 1.0, transferTime: "instant" },
  { from: "Chase UR",         to: "Virgin Atlantic Flying Club", baseRatio: 1.0, transferTime: "instant" },
  { from: "Citi ThankYou",    to: "Virgin Atlantic Flying Club", baseRatio: 1.0, transferTime: "1-3 days" },

  // Air Canada Aeroplan (Chase UR — one of Chase's most valuable partners)
  { from: "Chase UR",         to: "Air Canada Aeroplan",  baseRatio: 1.0, transferTime: "instant" },

  // Korean Air SKYPASS
  { from: "Chase UR",         to: "Korean Air SKYPASS",   baseRatio: 1.0, transferTime: "instant" },

  // Delta SkyMiles
  { from: "Amex MR",          to: "Delta SkyMiles",       baseRatio: 1.0, transferTime: "instant" },

  // Cathay Pacific Asia Miles
  { from: "Amex MR",          to: "Cathay Pacific Asia Miles", baseRatio: 1.0, transferTime: "instant" },
  { from: "Citi ThankYou",    to: "Cathay Pacific Asia Miles", baseRatio: 1.0, transferTime: "1-3 days" },
  { from: "Capital One Miles",to: "Cathay Pacific Asia Miles", baseRatio: 1.0, transferTime: "instant" },

  // Marriott Bonvoy transfers (3 points → 1 mile, ratio = 0.333)
  { from: "Marriott Bonvoy",  to: "Delta SkyMiles",             baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "Lufthansa Miles & More",     baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "Japan Airlines Mileage Bank",baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "Alaska Mileage Plan",        baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "Korean Air SKYPASS",         baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "ANA Mileage Club",           baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "Flying Blue",                baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "British Airways Avios",      baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "Emirates Skywards",              baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "Air Canada Aeroplan",           baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "Singapore KrisFlyer",           baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "United MileagePlus",            baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "Turkish Miles&Smiles",          baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "Qatar Privilege Club",          baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "LifeMiles",                     baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "Iberia Avios Plus",             baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "Etihad Guest",                  baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "Virgin Atlantic Flying Club",   baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "Cathay Pacific Asia Miles",     baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "AAdvantage",                    baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "Ethiopian ShebaMiles",          baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "Qantas Frequent Flyer",         baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "Aeromexico Club Premier",       baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "Thai Royal Orchid Plus",        baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "COPA ConnectMiles",             baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "Asiana Club",                   baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "EVA Infinity MileageLands",     baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "Malaysia Airlines Enrich",      baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "Finnair Plus",                  baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "Southwest Rapid Rewards",       baseRatio: 0.333, transferTime: "3-5 days" },
  { from: "Marriott Bonvoy",  to: "Hawaiian Airlines HawaiianMiles", baseRatio: 0.333, transferTime: "3-5 days" },

  // Bilt Rewards — full partner list (confirmed 2025-2026, all 1:1 instant)
  { from: "Bilt Rewards",     to: "Flying Blue",                   baseRatio: 1.0, transferTime: "instant" },
  { from: "Bilt Rewards",     to: "Turkish Miles&Smiles",          baseRatio: 1.0, transferTime: "instant" },
  { from: "Bilt Rewards",     to: "Air Canada Aeroplan",           baseRatio: 1.0, transferTime: "instant" },
  { from: "Bilt Rewards",     to: "United MileagePlus",            baseRatio: 1.0, transferTime: "instant" },
  { from: "Bilt Rewards",     to: "Singapore KrisFlyer",           baseRatio: 1.0, transferTime: "instant" },
  { from: "Bilt Rewards",     to: "British Airways Avios",         baseRatio: 1.0, transferTime: "instant" },
  { from: "Bilt Rewards",     to: "AAdvantage",                    baseRatio: 1.0, transferTime: "instant" },
  { from: "Bilt Rewards",     to: "Alaska Mileage Plan",           baseRatio: 1.0, transferTime: "instant" },
  { from: "Bilt Rewards",     to: "Emirates Skywards",             baseRatio: 1.0, transferTime: "instant" },
  { from: "Bilt Rewards",     to: "Qatar Privilege Club",          baseRatio: 1.0, transferTime: "instant" },
  { from: "Bilt Rewards",     to: "Virgin Atlantic Flying Club",   baseRatio: 1.0, transferTime: "instant" },
  { from: "Bilt Rewards",     to: "Korean Air SKYPASS",            baseRatio: 1.0, transferTime: "instant" },
  { from: "Bilt Rewards",     to: "Cathay Pacific Asia Miles",     baseRatio: 1.0, transferTime: "instant" },
];

// Returns effective ratio (promo if set and not expired, else base).
// A promoRatio WITHOUT a promoValidUntil date is treated as indefinitely valid —
// the caller must set promoValidUntil explicitly to enforce an expiry.
export function getEffectiveRatio(record: TransferBonusRecord): number {
  if (record.promoRatio) {
    // If an expiry is set, check it; if absent, treat the promo as active
    if (!record.promoValidUntil || new Date(record.promoValidUntil) >= new Date()) {
      return record.promoRatio;
    }
  }
  return record.baseRatio;
}
