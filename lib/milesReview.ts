import { MILES_PRICES } from "@/data/milesPrices";

export function getLatestMilesReviewDate(): string | null {
  return MILES_PRICES.reduce<string | null>((max, record) => {
    if (!record.lastUpdated) return max;
    return !max || record.lastUpdated > max ? record.lastUpdated : max;
  }, null);
}

export function formatLatestMilesReview(lang: "fr" | "en"): string {
  const latestReviewDate = getLatestMilesReviewDate();
  if (!latestReviewDate) return "2026";

  return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${latestReviewDate}T00:00:00.000Z`));
}

export function formatLatestMilesReviewShort(lang: "fr" | "en"): string {
  const latestReviewDate = getLatestMilesReviewDate();
  if (!latestReviewDate) return "2026";

  return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${latestReviewDate}T00:00:00.000Z`));
}
