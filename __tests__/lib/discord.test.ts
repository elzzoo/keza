// __tests__/lib/discord.test.ts

const mockFetch = jest.fn();
global.fetch = mockFetch;

import {
  sendDiscordAlert,
  notifyAlertTriggered,
  notifyCronSummary,
} from "@/lib/discord";

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockResolvedValue({ ok: true });
});

afterEach(() => {
  delete process.env.DISCORD_WEBHOOK_URL;
});

describe("sendDiscordAlert", () => {
  it("does nothing when DISCORD_WEBHOOK_URL is not set", async () => {
    delete process.env.DISCORD_WEBHOOK_URL;
    await sendDiscordAlert("test");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("POSTs to the webhook URL when set", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test";
    await sendDiscordAlert("hello", [{ title: "Test embed", color: 0x3b82f6 }]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://discord.com/api/webhooks/test");
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body as string);
    expect(body.content).toBe("hello");
    expect(body.embeds).toHaveLength(1);
    expect(body.embeds[0].title).toBe("Test embed");
  });

  it("silently swallows fetch errors", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test";
    mockFetch.mockRejectedValue(new Error("network error"));
    await expect(sendDiscordAlert("boom")).resolves.toBeUndefined();
  });
});

describe("notifyAlertTriggered", () => {
  it("sends an embed with alert details", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test";
    await notifyAlertTriggered({
      from: "DSS",
      to: "CDG",
      cabin: "economy",
      adjustedPrice: 420,
      targetPrice: 500,
      email: "user@example.com",
    });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.embeds[0].title).toContain("DSS");
    expect(body.embeds[0].title).toContain("CDG");
    const fields: { name: string; value: string }[] = body.embeds[0].fields;
    const priceField = fields.find((f) => f.name === "Prix actuel");
    expect(priceField?.value).toBe("$420");
    const savingsField = fields.find((f) => f.name === "Économie");
    expect(savingsField?.value).toBe("$80");
  });
});

describe("notifyCronSummary", () => {
  it("sends a green embed when alerts were notified", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test";
    await notifyCronSummary({ routes: 10, checked: 25, notified: 3, errors: [] });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.embeds[0].color).toBe(0x22c55e);
    expect(body.embeds[0].title).toContain("3");
  });

  it("sends a grey embed when no alerts triggered", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test";
    await notifyCronSummary({ routes: 10, checked: 25, notified: 0, errors: [] });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.embeds[0].color).toBe(0x6b7280);
  });

  it("sends an amber embed with error details when errors present", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test";
    await notifyCronSummary({
      routes: 10,
      checked: 25,
      notified: 0,
      errors: ["DSS:CDG: timeout"],
    });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.embeds[0].color).toBe(0xf59e0b);
    const fields: { name: string; value: string }[] = body.embeds[0].fields;
    const errField = fields.find((f) => f.name === "Erreurs");
    expect(errField?.value).toContain("timeout");
  });
});
