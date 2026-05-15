import type { MilesOption } from "@/lib/costEngine";

/** Taxes threshold (USD) above which a chip shows a high-taxes warning (`*`). */
export const HIGH_TAXES_THRESHOLD_USD = 300;

/**
 * Returns true when the cabin warrants Business/First mode UI enrichment.
 * First-class uses Business award rates in the engine, so both are treated identically.
 */
export function isBusinessMode(cabin: string): boolean {
  return cabin === "business" || cabin === "first";
}

export interface BusinessChip {
  /** Display label: "{Program} {roundedK}K" e.g. "Flying Blue 72K" */
  label: string;
  /** True when taxes > HIGH_TAXES_THRESHOLD_USD — triggers `*` footnote */
  highTaxes: boolean;
}

/**
 * Converts a list of alternative MilesOptions into chip display data.
 * Caller is responsible for filtering out the bestOption before passing.
 */
export function buildBusinessChips(alternatives: MilesOption[]): BusinessChip[] {
  return alternatives.map((opt) => ({
    label: `${opt.program} ${Math.round(opt.milesRequired / 1_000)}K`,
    highTaxes: opt.taxes > HIGH_TAXES_THRESHOLD_USD,
  }));
}
