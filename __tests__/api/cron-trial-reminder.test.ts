const mockRedisSmembers = jest.fn();
const mockRedisSrem = jest.fn();
const mockRateLimitResponse = jest.fn();
const mockHasCronSecret = jest.fn();
const mockNeedsTrialReminder = jest.fn();
const mockSendTrialReminderEmail = jest.fn();

jest.mock("@/lib/redis", () => ({
  redis: {
    smembers: (...args: unknown[]) => mockRedisSmembers(...args),
    srem: (...args: unknown[]) => mockRedisSrem(...args),
  },
}));

jest.mock("@/lib/ratelimit", () => ({
  rateLimitResponse: (...args: unknown[]) => mockRateLimitResponse(...args),
}));

jest.mock("@/lib/auth", () => ({
  hasCronSecret: (...args: unknown[]) => mockHasCronSecret(...args),
}));

jest.mock("@/lib/lemonsqueezy", () => ({
  needsTrialReminder: (...args: unknown[]) => mockNeedsTrialReminder(...args),
}));

jest.mock("@/lib/resend", () => ({
  sendTrialReminderEmail: (...args: unknown[]) => mockSendTrialReminderEmail(...args),
}));

jest.mock("@/lib/logger", () => ({
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

import { GET, POST } from "@/app/api/cron/trial-reminder/route";

describe("/api/cron/trial-reminder", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRateLimitResponse.mockResolvedValue(null);
    mockHasCronSecret.mockReturnValue(true);
    mockRedisSmembers.mockResolvedValue(["user@example.com", "fresh@example.com"]);
    mockRedisSrem.mockResolvedValue(1);
    mockNeedsTrialReminder.mockImplementation(async (email: string) => email === "user@example.com");
    mockSendTrialReminderEmail.mockResolvedValue(undefined);
  });

  it("rejects GET requests without the centralized cron secret check", async () => {
    mockHasCronSecret.mockReturnValue(false);

    const res = await GET(new Request("http://localhost/api/cron/trial-reminder"));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
    expect(mockRedisSmembers).not.toHaveBeenCalled();
  });

  it("sends reminders for eligible users on GET", async () => {
    const res = await GET(new Request("http://localhost/api/cron/trial-reminder"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ reminded: 1, success: true });
    expect(mockSendTrialReminderEmail).toHaveBeenCalledWith("user@example.com");
    expect(mockSendTrialReminderEmail).not.toHaveBeenCalledWith("fresh@example.com");
    expect(mockRedisSrem).toHaveBeenCalledWith("keza:trial:pending_reminders", "user@example.com");
  });

  it("uses the same centralized cron secret check on POST", async () => {
    mockHasCronSecret.mockReturnValue(false);

    const res = await POST(new Request("http://localhost/api/cron/trial-reminder", { method: "POST" }));

    expect(res.status).toBe(401);
    expect(mockRedisSmembers).not.toHaveBeenCalled();
  });
});
