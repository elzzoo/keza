const mockGet = jest.fn();
const mockSet = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: { get: mockGet, set: mockSet },
}));

jest.mock("@/lib/logger");

import {
  loadBonusTransfers,
  syncBonusTransfersToRedis,
  getEffectiveTransferRatio,
  getActiveBonusTransfers,
  BONUS_TRANSFERS_KEY,
} from "@/lib/bonusTransfersRedis";
import { TRANSFER_BONUSES } from "@/data/transferBonuses";

describe("bonusTransfersRedis", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("loadBonusTransfers", () => {
    it("loads from Redis when available", async () => {
      const mockTransfers = [
        { from: "Amex MR", to: "Flying Blue", baseRatio: 1.0, transferTime: "instant" },
      ];
      mockGet.mockResolvedValue(mockTransfers);

      const result = await loadBonusTransfers();
      expect(result).toEqual(mockTransfers);
      expect(mockGet).toHaveBeenCalledWith(BONUS_TRANSFERS_KEY);
    });

    it("falls back to static data when Redis is empty", async () => {
      mockGet.mockResolvedValue(null);

      const result = await loadBonusTransfers();
      expect(result).toEqual(TRANSFER_BONUSES);
    });

    it("falls back to static data on Redis error", async () => {
      mockGet.mockRejectedValue(new Error("Redis error"));

      const result = await loadBonusTransfers();
      expect(result).toEqual(TRANSFER_BONUSES);
    });
  });

  describe("getEffectiveTransferRatio", () => {
    it("returns promoRatio when promo is active", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const record = {
        from: "Amex MR",
        to: "Flying Blue",
        baseRatio: 1.0,
        promoRatio: 1.25,
        promoValidUntil: tomorrow.toISOString().split("T")[0],
        transferTime: "instant" as const,
      };

      const ratio = getEffectiveTransferRatio(record);
      expect(ratio).toBe(1.25);
    });

    it("returns baseRatio when promo is expired", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const record = {
        from: "Amex MR",
        to: "Flying Blue",
        baseRatio: 1.0,
        promoRatio: 1.25,
        promoValidUntil: yesterday.toISOString().split("T")[0],
        transferTime: "instant" as const,
      };

      const ratio = getEffectiveTransferRatio(record);
      expect(ratio).toBe(1.0);
    });

    it("returns baseRatio when no promo", () => {
      const record = {
        from: "Amex MR",
        to: "Flying Blue",
        baseRatio: 1.0,
        transferTime: "instant" as const,
      };

      const ratio = getEffectiveTransferRatio(record);
      expect(ratio).toBe(1.0);
    });
  });

  describe("getActiveBonusTransfers", () => {
    it("filters out expired and non-bonus transfers", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const transfers = [
        {
          from: "Amex MR",
          to: "Flying Blue",
          baseRatio: 1.0,
          promoRatio: 1.25,
          promoValidUntil: tomorrow.toISOString().split("T")[0],
          transferTime: "instant" as const,
        },
        {
          from: "Chase UR",
          to: "United MileagePlus",
          baseRatio: 1.0,
          promoRatio: 1.5,
          promoValidUntil: yesterday.toISOString().split("T")[0],
          transferTime: "instant" as const,
        },
        {
          from: "Citi ThankYou",
          to: "Emirates Skywards",
          baseRatio: 1.0,
          transferTime: "instant" as const,
        },
      ];

      const active = getActiveBonusTransfers(transfers);
      expect(active).toHaveLength(1);
      expect(active[0].from).toBe("Amex MR");
    });
  });

  describe("syncBonusTransfersToRedis", () => {
    it("syncs transfers to Redis with TTL", async () => {
      const transfers = [
        { from: "Amex MR", to: "Flying Blue", baseRatio: 1.0, transferTime: "instant" },
      ];

      await syncBonusTransfersToRedis(transfers);

      expect(mockSet).toHaveBeenCalledWith(
        BONUS_TRANSFERS_KEY,
        transfers,
        { ex: 30 * 24 * 60 * 60 }
      );
    });
  });
});
