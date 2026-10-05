import {
  formatLatestMilesReview,
  formatLatestMilesReviewShort,
  getLatestMilesReviewDate,
} from "@/lib/milesReview";

describe("miles review freshness helpers", () => {
  it("uses the freshest lastUpdated date from miles price records", () => {
    expect(getLatestMilesReviewDate()).toBe("2026-05-28");
  });

  it("formats the latest review date for French and English UI", () => {
    expect(formatLatestMilesReview("fr")).toBe("mai 2026");
    expect(formatLatestMilesReview("en")).toBe("May 2026");
    expect(formatLatestMilesReviewShort("fr")).toMatch(/mai 2026/i);
    expect(formatLatestMilesReviewShort("en")).toBe("May 2026");
  });
});
