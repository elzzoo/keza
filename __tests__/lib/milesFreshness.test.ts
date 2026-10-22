import { isMilesReviewStale } from "@/lib/milesFreshness";

describe("miles valuation age", () => {
  it("flags values older than 90 days", () => {
    expect(isMilesReviewStale("2026-07-24", "2026-10-22")).toBe(false);
    expect(isMilesReviewStale("2026-07-23", "2026-10-22")).toBe(true);
  });

  it("treats invalid and future dates as untrustworthy", () => {
    expect(isMilesReviewStale("2026-10-23", "2026-10-22")).toBe(true);
    expect(isMilesReviewStale("2026-02-31", "2026-10-22")).toBe(true);
    expect(isMilesReviewStale("unknown", "2026-10-22")).toBe(true);
  });
});
