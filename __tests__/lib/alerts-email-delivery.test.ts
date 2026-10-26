import { logError } from "@/lib/logger";
import {
  sendAlertConfirmationEmail,
  sendDigestEmail,
  type PriceAlert,
} from "@/lib/alerts";

const mockSend = jest.fn();
const originalAlertTokenSecret = process.env.ALERT_TOKEN_SECRET;

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockSend } })),
}));
jest.mock("@/lib/logger", () => ({ logError: jest.fn() }));

const alert: PriceAlert = {
  id: "alt_test",
  email: "user@example.com",
  from: "DSS",
  to: "CDG",
  cabin: "economy",
  basePrice: 800,
  targetPrice: 720,
  createdAt: "2026-10-26T00:00:00.000Z",
  notifCount: 0,
  active: true,
  notifFrequency: "instant",
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.ALERT_TOKEN_SECRET = "test-alert-token-secret";
});

afterAll(() => {
  if (originalAlertTokenSecret === undefined) delete process.env.ALERT_TOKEN_SECRET;
  else process.env.ALERT_TOKEN_SECRET = originalAlertTokenSecret;
});

it("reports a successful confirmation send", async () => {
  mockSend.mockResolvedValue({ data: { id: "email_123" }, error: null, headers: null });

  expect(await sendAlertConfirmationEmail(alert)).toBe(true);
  expect(mockSend).toHaveBeenCalledTimes(1);
  expect(logError).not.toHaveBeenCalled();
});

it("does not report Resend API rejections as delivered or log their raw message", async () => {
  mockSend.mockResolvedValue({
    data: null,
    error: { name: "rate_limit_exceeded", statusCode: 429, message: "private provider detail" },
    headers: null,
  });

  expect(await sendAlertConfirmationEmail(alert)).toBe(false);
  expect(logError).toHaveBeenCalledWith(
    "[alerts] confirmation email failed:",
    expect.objectContaining({ message: "Resend rejected alert email: rate_limit_exceeded (429)" })
  );
  expect(JSON.stringify((logError as jest.Mock).mock.calls)).not.toContain("private provider detail");
});

it("handles a thrown transport error", async () => {
  mockSend.mockRejectedValue(new Error("transport unavailable"));

  expect(await sendAlertConfirmationEmail(alert)).toBe(false);
  expect(logError).toHaveBeenCalledTimes(1);
});

it("applies the same provider-result check to digest emails", async () => {
  mockSend.mockResolvedValue({
    data: null,
    error: { name: "validation_error", statusCode: 422, message: "rejected" },
    headers: null,
  });

  expect(await sendDigestEmail(alert.email, [{ alert, currentPrice: 700 }])).toBe(false);
  expect(logError).toHaveBeenCalledTimes(1);
});
