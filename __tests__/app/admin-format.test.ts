import {
  cronHealthColor,
  cronHealthLabel,
  formatDate,
  formatMismatchIds,
  formatTtl,
} from "@/app/admin/format";

describe("admin format helpers", () => {
  it("formats cron health labels and colors", () => {
    expect(cronHealthLabel("ok")).toBe("OK");
    expect(cronHealthLabel("running")).toBe("En cours");
    expect(cronHealthColor("ok")).toBe("green");
    expect(cronHealthColor("running")).toBe("blue");
    expect(cronHealthColor("unknown")).toBe("purple");
    expect(cronHealthColor("degraded")).toBe("amber");
  });

  it("formats mismatch ids compactly", () => {
    expect(formatMismatchIds([])).toBe("aucun");
    expect(formatMismatchIds(["a", "b"])).toBe("a, b");
    expect(formatMismatchIds(["a", "b", "c", "d", "e", "f"])).toBe("a, b, c, d, e +1");
  });

  it("formats TTL and nullable dates", () => {
    expect(formatTtl(0)).toBe("expiré");
    expect(formatTtl(65)).toBe("expire dans 1m");
    expect(formatTtl(3660)).toBe("expire dans 1h 1m");
    expect(formatDate(null)).toBe("jamais");
    expect(formatDate("2026-09-25T08:00:00.000Z")).toContain("25/09/2026");
  });
});
