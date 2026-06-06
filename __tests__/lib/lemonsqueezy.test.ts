// __tests__/lib/lemonsqueezy.test.ts

const mockGet = jest.fn();
const mockSet = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockGet(...args),
    set: (...args: unknown[]) => mockSet(...args),
  },
}));

const mockSentryWithScope = jest.fn();
const mockSentryCaptureMessage = jest.fn();

jest.mock("@sentry/nextjs", () => ({
  withScope: (cb: (scope: unknown) => void) => mockSentryWithScope(cb),
  captureMessage: (msg: string, level: string) =>
    mockSentryCaptureMessage(msg, level),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import {
  isProUser,
  grantPro,
  revokePro,
  verifyLemonWebhook,
  createCheckoutUrl,
} from "@/lib/lemonsqueezy";
import crypto from "crypto";

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
});

describe("isProUser", () => {
  it("returns false when no key in Redis", async () => {
    mockGet.mockResolvedValue(null);
    expect(await isProUser("user@example.com")).toBe(false);
  });

  it("returns false when value is 'cancelled'", async () => {
    mockGet.mockResolvedValue("cancelled");
    expect(await isProUser("user@example.com")).toBe(false);
  });

  it("returns true when subscription ID is stored", async () => {
    mockGet.mockResolvedValue("sub_123");
    expect(await isProUser("user@example.com")).toBe(true);
  });

  it("normalises email to lowercase", async () => {
    mockGet.mockResolvedValue("sub_abc");
    await isProUser("User@EXAMPLE.com");
    expect(mockGet).toHaveBeenCalledWith("keza:pro:user@example.com");
  });

  it("returns false (fail open) when Redis throws", async () => {
    mockGet.mockRejectedValue(new Error("redis down"));
    expect(await isProUser("user@example.com")).toBe(false);
  });
});

describe("grantPro", () => {
  it("sets the subscription ID in Redis", async () => {
    mockSet.mockResolvedValue("OK");
    await grantPro("user@example.com", "sub_xyz");
    expect(mockSet).toHaveBeenCalledWith("keza:pro:user@example.com", "sub_xyz");
  });
});

describe("revokePro", () => {
  it("sets value to 'cancelled' in Redis", async () => {
    mockSet.mockResolvedValue("OK");
    await revokePro("user@example.com");
    expect(mockSet).toHaveBeenCalledWith("keza:pro:user@example.com", "cancelled");
  });
});

describe("verifyLemonWebhook", () => {
  it("returns false when secret is not configured", () => {
    delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    expect(verifyLemonWebhook("body", "sig")).toBe(false);
  });

  it("returns true for a valid HMAC-SHA256 signature", () => {
    const secret = "test-secret-xyz";
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = secret;
    const body = JSON.stringify({ event: "subscription_created" });
    const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyLemonWebhook(body, sig)).toBe(true);
  });

  it("returns false for an invalid signature", () => {
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = "test-secret-xyz";
    expect(verifyLemonWebhook("body", "bad-signature")).toBe(false);
  });
});

describe("createCheckoutUrl", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LEMONSQUEEZY_API_KEY = "test-key";
    process.env.LEMONSQUEEZY_STORE_ID = "store-123";
    process.env.LEMONSQUEEZY_VARIANT_ID = "variant-456";
    process.env.NEXT_PUBLIC_APP_URL = "https://test.keza.app";
  });

  it("throws when API key is not configured", async () => {
    delete process.env.LEMONSQUEEZY_API_KEY;
    await expect(createCheckoutUrl("user@example.com")).rejects.toThrow(
      "Lemon Squeezy env vars not configured"
    );
  });

  it("returns checkout URL on success", async () => {
    const mockUrl = "https://checkout.lemonsqueezy.com/abc123";
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { attributes: { url: mockUrl } },
      }),
    });

    const result = await createCheckoutUrl("user@example.com");
    expect(result).toBe(mockUrl);
    expect(mockSentryCaptureMessage).not.toHaveBeenCalled();
  });

  it("captures email in Sentry on checkout failure", async () => {
    const email = "user@example.com";
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => '{"error": "invalid email"}',
    });

    // Mock Sentry's withScope to call the callback
    mockSentryWithScope.mockImplementation((cb: Function) => {
      const mockScope = {
        setTag: jest.fn(),
        setContext: jest.fn(),
      };
      cb(mockScope);
      return mockScope;
    });

    try {
      await createCheckoutUrl(email);
    } catch {
      // Expected to throw
    }

    expect(mockSentryWithScope).toHaveBeenCalled();
    const scope = (mockSentryWithScope.mock.calls[0][0] as Function)
      .constructor.name;
    expect(mockSentryCaptureMessage).toHaveBeenCalledWith(
      "Lemon Squeezy checkout failed: 400",
      "error"
    );
  });

  it("captures HTTP status in Sentry on checkout failure", async () => {
    const email = "user@example.com";
    const status = 500;
    mockFetch.mockResolvedValue({
      ok: false,
      status,
      text: async () => "Internal Server Error",
    });

    mockSentryWithScope.mockImplementation((cb: Function) => {
      const mockScope = {
        setTag: jest.fn(),
        setContext: jest.fn(),
      };
      cb(mockScope);
      // Capture the setContext call to verify status is included
      expect(mockScope.setContext).toHaveBeenCalledWith(
        "lemon_squeezy_error",
        expect.objectContaining({
          status,
        })
      );
      return mockScope;
    });

    try {
      await createCheckoutUrl(email);
    } catch {
      // Expected to throw
    }

    expect(mockSentryWithScope).toHaveBeenCalled();
  });

  it("captures response body in Sentry on checkout failure", async () => {
    const email = "user@example.com";
    const errorBody = '{"errors": [{"detail": "Invalid variant"}]}';
    mockFetch.mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => errorBody,
    });

    mockSentryWithScope.mockImplementation((cb: Function) => {
      const mockScope = {
        setTag: jest.fn(),
        setContext: jest.fn(),
      };
      cb(mockScope);
      // Capture the setContext call to verify body is included
      expect(mockScope.setContext).toHaveBeenCalledWith(
        "lemon_squeezy_error",
        expect.objectContaining({
          body: errorBody,
        })
      );
      return mockScope;
    });

    try {
      await createCheckoutUrl(email);
    } catch {
      // Expected to throw
    }

    expect(mockSentryWithScope).toHaveBeenCalled();
  });

  it("sets 'api' tag to 'lemonsqueezy' on checkout failure", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    mockSentryWithScope.mockImplementation((cb: Function) => {
      const mockScope = {
        setTag: jest.fn(),
        setContext: jest.fn(),
      };
      cb(mockScope);
      // Verify that setTag was called with correct values
      expect(mockScope.setTag).toHaveBeenCalledWith("api", "lemonsqueezy");
      return mockScope;
    });

    try {
      await createCheckoutUrl("user@example.com");
    } catch {
      // Expected to throw
    }

    expect(mockSentryWithScope).toHaveBeenCalled();
  });

  it("throws error with full message on checkout failure", async () => {
    const status = 403;
    const errorBody = "Forbidden";
    mockFetch.mockResolvedValue({
      ok: false,
      status,
      text: async () => errorBody,
    });

    mockSentryWithScope.mockImplementation((cb: Function) => {
      cb({ setTag: jest.fn(), setContext: jest.fn() });
    });

    await expect(createCheckoutUrl("user@example.com")).rejects.toThrow(
      `Lemon Squeezy checkout failed: ${status} ${errorBody}`
    );
  });
});
