export const REGION_LABELS: Record<string, string> = {
  AF: "Africa",
  EU: "Europe",
  US: "Americas",
  ME: "Middle East",
  AS: "Asia",
};

export const AFRICA_HUBS = new Set([
  "DKR","ABJ","LOS","ACC","CMN","TUN","CAI","NBO","JNB","CPT","DAR","ADD",
  "OUA","BKO","COO","SAL","RAK","HRE","LUN","EBB","KGL","MRU","SEZ",
]);

export function getRouteLabel(from: string, to: string): string {
  const fromAfrica = AFRICA_HUBS.has(from.toUpperCase());
  const toAfrica = AFRICA_HUBS.has(to.toUpperCase());
  if (fromAfrica && toAfrica) return "Intra-Africa";
  if (fromAfrica || toAfrica) return "Africa ↔ International";
  return "International";
}

export function formatRoute(from: string, to: string): string {
  return `${from.toUpperCase()} → ${to.toUpperCase()}`;
}
