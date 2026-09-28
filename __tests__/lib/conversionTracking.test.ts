const mockCaptureMessage = jest.fn();
const mockLogError = jest.fn();

jest.mock("@sentry/nextjs", () => ({
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
}));

jest.mock("@/lib/logger", () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
}));

import { trackTrialConversion } from "@/lib/conversionTracking";

describe("trackTrialConversion", () => {
  const originalPlausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const originalBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true });
    global.fetch = mockFetch;
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "xalifly.com";
    delete process.env.NEXT_PUBLIC_BASE_URL;
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = originalPlausibleDomain;
    process.env.NEXT_PUBLIC_BASE_URL = originalBaseUrl;
  });

  it("uses SITE_URL, not keza.app, when sending Plausible events", async () => {
    await trackTrialConversion("user@example.com", "PRO", "landing");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as { url: string };
    expect(body.url).toBe("https://keza-taupe.vercel.app/checkout");
    expect(body.url).not.toContain("keza.app");
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      "Trial user converted to paying",
      expect.objectContaining({
        tags: expect.objectContaining({ event_type: "trial_conversion" }),
      })
    );
  });
});
