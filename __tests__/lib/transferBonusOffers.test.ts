// Running transfer bonuses must be dated, sourced, applied, then dropped.
import { TRANSFER_BONUSES, getEffectiveRatio } from "@/data/transferBonuses";
import { calculateAcquisitionCost } from "@/lib/milesAcquisition";

const chaseVirgin = TRANSFER_BONUSES.find(
  (b) => b.from === "Chase UR" && b.to === "Virgin Atlantic Flying Club",
)!;

const chasePath = () =>
  calculateAcquisitionCost("Virgin Atlantic Flying Club", 70_000).paths.find(
    (p) => p.source === "Chase Ultimate Rewards",
  )!;

describe("transfer bonus offers", () => {
  afterEach(() => jest.useRealTimers());

  it("every bonus has an end date, a source and a check date", () => {
    for (const b of TRANSFER_BONUSES.filter((r) => r.promoRatio)) {
      expect(b.promoValidUntil).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(b.promoVerifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(b.promoSourceUrl).toMatch(/^https:\/\//);
    }
  });

  it("applies on the last day, not after", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-12-30T20:00:00Z"));
    expect(getEffectiveRatio(chaseVirgin)).toBe(1.4);
    jest.setSystemTime(new Date("2026-12-31T00:00:01Z"));
    expect(getEffectiveRatio(chaseVirgin)).toBe(1.0);
  });

  it("lowers the points needed while running", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-11-27T12:00:00Z"));
    expect(chasePath().pointsNeeded).toBe(50_000);
    expect(chasePath().note).toContain("until 2026-12-30");
  });

  it("goes back to 1:1 once expired", () => {
    jest.useFakeTimers().setSystemTime(new Date("2027-01-15T12:00:00Z"));
    expect(chasePath().pointsNeeded).toBe(70_000);
    expect(chasePath().note).toBe("1:1 transfer");
  });
});
