export type Alliance = "Star Alliance" | "Oneworld" | "SkyTeam" | "Independent";
export type TaxProfile = "low" | "medium" | "high";

export interface LoyaltyProgram {
  /** Canonical display name */
  name: string;
  /** IATA code of the operating airline */
  airlineCode: string;
  /** Operating airline full name */
  airline: string;
  alliance: Alliance;
  /**
   * Cost to purchase 1 000 miles directly from the airline, in USD.
   * Reflects typical sale pricing (not rack rate). null = not purchasable.
   */
  purchaseMileCostPer1000: number | null;
  /**
   * Market value of 1 mile/point in US cents.
   * Used for "what are my existing miles worth?" calculations.
   */
  marketValueCents: number;
  /**
   * Simplified tax profile for award redemptions.
   * - "low"    -> minimal carrier surcharges (<$50 one-way economy)
   * - "medium" -> moderate surcharges ($50-$200)
   * - "high"   -> heavy fuel surcharges ($200+, e.g. BA long-haul)
   */
  taxProfile: TaxProfile;
  /**
   * Bank/credit-card currencies that can transfer INTO this program.
   * Uses canonical currency names.
   */
  transferPartnersFrom: string[];
  /**
   * false = program is sanctioned, defunct, or irrelevant for international
   * award redemptions. Filtered out by the cost engine.
   * Defaults to true when omitted.
   */
  isBookable?: boolean;
  /**
   * How easily a typical user can access this program.
   * 1 = widely accessible (major transfer partners, universally known)
   * 2 = moderately accessible (limited transfer partners or regional)
   * 3 = hard to access (no transfer partners, not purchasable, niche airline)
   * Defaults to 2 when omitted.
   */
  accessibilityScore?: 1 | 2 | 3;
}
