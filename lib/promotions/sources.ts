export interface PromoSource {
  id: string;
  name: string;
  url: string;
  type: "json" | "html";
}

// Static sources — extend list as new airline promo feeds are found
export const PROMO_SOURCES: PromoSource[] = [
  {
    id: "local",
    name: "Local JSON",
    url: "data/promotions.json",
    type: "json",
  },
];
