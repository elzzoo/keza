export type RegionCode = "AF" | "EU" | "US" | "ME" | "AS";

export const REGION_LABELS: Record<RegionCode, string> = {
  AF: "Africa",
  EU: "Europe",
  US: "Americas",
  ME: "Middle East",
  AS: "Asia",
};

const AFRICA_HUB_CODES = [
  "DKR","ABJ","LOS","ACC","CMN","TUN","CAI","NBO","JNB","CPT","DAR","ADD",
  "OUA","BKO","COO","SAL","RAK","HRE","LUN","EBB","KGL","MRU","SEZ",
] as const;

export type AfricaHub = typeof AFRICA_HUB_CODES[number];
export const AFRICA_HUBS = new Set<string>(AFRICA_HUB_CODES);

type RouteLabel = "Intra-Africa" | "Africa ↔ International" | "International";

export function getRouteLabel(from: string, to: string): RouteLabel {
  const fromAfrica = AFRICA_HUBS.has(from.toUpperCase());
  const toAfrica = AFRICA_HUBS.has(to.toUpperCase());
  if (fromAfrica && toAfrica) return "Intra-Africa";
  if (fromAfrica || toAfrica) return "Africa ↔ International";
  return "International";
}

export function formatRoute(from: string, to: string): string {
  return `${from.toUpperCase()} → ${to.toUpperCase()}`;
}
