const mockSend = jest.fn();

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

import { sendTrialReminderEmail } from "@/lib/resend";

describe("sendTrialReminderEmail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses the configured site URL for the Pro CTA", async () => {
    await sendTrialReminderEmail("user@example.com");

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0].html).toContain("https://keza-taupe.vercel.app/pro");
    expect(mockSend.mock.calls[0][0].html).not.toContain("https://keza.app");
  });
});
