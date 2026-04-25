import {
  createManageAlertsToken,
  createUnsubscribeAlertToken,
  verifyManageAlertsToken,
  verifyUnsubscribeAlertToken,
} from "@/lib/alertTokens";

const OLD_ENV = process.env;

beforeEach(() => {
  process.env = { ...OLD_ENV, ALERT_TOKEN_SECRET: "test-alert-secret" };
});

afterAll(() => {
  process.env = OLD_ENV;
});

describe("alert tokens", () => {
  it("creates and verifies a manage token for the matching email", () => {
    const token = createManageAlertsToken("User@Example.com");
    expect(token).toBeTruthy();
    expect(verifyManageAlertsToken("user@example.com", token)).toBe(true);
    expect(verifyManageAlertsToken("other@example.com", token)).toBe(false);
  });

  it("creates and verifies an unsubscribe token for the matching alert", () => {
    const token = createUnsubscribeAlertToken("alt_123");
    expect(token).toBeTruthy();
    expect(verifyUnsubscribeAlertToken("alt_123", token)).toBe(true);
    expect(verifyUnsubscribeAlertToken("alt_456", token)).toBe(false);
  });

  it("rejects tampered tokens", () => {
    const token = createManageAlertsToken("user@example.com");
    expect(token).toBeTruthy();
    expect(verifyManageAlertsToken("user@example.com", `${token}x`)).toBe(false);
  });
});
